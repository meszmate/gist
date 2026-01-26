package api

import (
	"bufio"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/meszmate/smartnotes/internal/api/middleware"
	"github.com/meszmate/smartnotes/internal/errx"
	"github.com/meszmate/smartnotes/internal/models"
)

// GET /chat/:materialId - Get chat history
func (h *Handler) GetChatHistory(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	materialID, err := uuid.Parse(c.Param("materialId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Invalid material ID",
		})
		return
	}

	// Verify ownership
	material, err := h.MaterialRepo.GetByID(c.Request.Context(), materialID)
	if err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}
	if material == nil || material.UserID != userID {
		errx.Handle(c, errx.ErrNotFound)
		return
	}

	messages, err := h.ChatRepo.GetByMaterial(c.Request.Context(), userID, materialID, 50)
	if err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	c.JSON(http.StatusOK, models.ChatHistory{
		Messages:     messages,
		MaterialID:   &materialID,
		MaterialName: material.Title,
	})
}

// POST /chat/:materialId - Send message (SSE streaming)
func (h *Handler) SendChatMessage(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	materialID, err := uuid.Parse(c.Param("materialId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Invalid material ID",
		})
		return
	}

	// Check rate limit
	usage, err := h.UserRepo.GetOrCreateUsage(c.Request.Context(), userID, time.Now())
	if err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	if usage.ChatMessagesCount >= h.Config.MaxChatMessagesPerDay {
		c.JSON(http.StatusTooManyRequests, gin.H{
			"error":   "Rate Limit Exceeded",
			"message": "Daily chat message limit reached",
			"reset_at": time.Now().Truncate(24*time.Hour).Add(24*time.Hour).Format(time.RFC3339),
		})
		return
	}

	// Verify ownership
	material, err := h.MaterialRepo.GetByID(c.Request.Context(), materialID)
	if err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}
	if material == nil || material.UserID != userID {
		errx.Handle(c, errx.ErrNotFound)
		return
	}

	var req models.SendChatMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Invalid request body",
		})
		return
	}

	// Save user message
	userMsg := &models.ChatMessage{
		UserID:          userID,
		StudyMaterialID: &materialID,
		Role:            models.ChatRoleUser,
		Content:         req.Content,
	}
	if err := h.ChatRepo.Create(c.Request.Context(), userMsg); err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	// Increment chat messages count
	h.UserRepo.IncrementChatMessages(c.Request.Context(), userID)

	// Get chat history for context
	history, _ := h.ChatRepo.GetByMaterial(c.Request.Context(), userID, materialID, 10)

	// Build context from material
	context := fmt.Sprintf("Study Material: %s\n\nSummary:\n%s\n\nOriginal Content:\n%s",
		material.Title, material.Summary, material.OriginalContent)

	// Set up SSE
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	// Stream the response
	responseChan := make(chan string)
	errChan := make(chan error)

	go func() {
		err := h.AI.StreamTutorResponse(c.Request.Context(), context, history, req.Content, responseChan)
		if err != nil {
			errChan <- err
		}
		close(responseChan)
	}()

	var fullResponse string
	flusher, _ := c.Writer.(http.Flusher)

	for {
		select {
		case chunk, ok := <-responseChan:
			if !ok {
				// Stream finished
				// Save assistant message
				assistantMsg := &models.ChatMessage{
					UserID:          userID,
					StudyMaterialID: &materialID,
					Role:            models.ChatRoleAssistant,
					Content:         fullResponse,
				}
				h.ChatRepo.Create(c.Request.Context(), assistantMsg)

				// Send done event
				fmt.Fprintf(c.Writer, "event: done\ndata: {\"message_id\": \"%s\"}\n\n", assistantMsg.ID)
				flusher.Flush()
				return
			}
			fullResponse += chunk
			fmt.Fprintf(c.Writer, "data: %s\n\n", chunk)
			flusher.Flush()

		case err := <-errChan:
			fmt.Fprintf(c.Writer, "event: error\ndata: %s\n\n", err.Error())
			flusher.Flush()
			return

		case <-c.Request.Context().Done():
			return
		}
	}
}

// DELETE /chat/:materialId - Clear chat history
func (h *Handler) ClearChatHistory(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	materialID, err := uuid.Parse(c.Param("materialId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Invalid material ID",
		})
		return
	}

	// Verify ownership
	material, err := h.MaterialRepo.GetByID(c.Request.Context(), materialID)
	if err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}
	if material == nil || material.UserID != userID {
		errx.Handle(c, errx.ErrNotFound)
		return
	}

	if err := h.ChatRepo.DeleteByMaterial(c.Request.Context(), userID, materialID); err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Chat history cleared"})
}

// Helper to format chat history for AI context
func formatChatHistory(messages []models.ChatMessage) string {
	var result string
	for _, msg := range messages {
		role := "User"
		if msg.Role == models.ChatRoleAssistant {
			role = "Assistant"
		}
		result += fmt.Sprintf("%s: %s\n", role, msg.Content)
	}
	return result
}

// StreamWriter implements io.Writer for SSE streaming
type StreamWriter struct {
	writer  gin.ResponseWriter
	flusher http.Flusher
}

func NewStreamWriter(w gin.ResponseWriter) *StreamWriter {
	flusher, _ := w.(http.Flusher)
	return &StreamWriter{writer: w, flusher: flusher}
}

func (sw *StreamWriter) Write(p []byte) (n int, err error) {
	n, err = fmt.Fprintf(sw.writer, "data: %s\n\n", string(p))
	if sw.flusher != nil {
		sw.flusher.Flush()
	}
	return
}

// LineScanner wraps bufio.Scanner for SSE data parsing
type LineScanner struct {
	scanner *bufio.Scanner
}

func NewLineScanner(scanner *bufio.Scanner) *LineScanner {
	return &LineScanner{scanner: scanner}
}
