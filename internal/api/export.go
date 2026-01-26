package api

import (
	"bytes"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/meszmate/smartnotes/internal/api/middleware"
	"github.com/meszmate/smartnotes/internal/errx"
	"github.com/meszmate/smartnotes/internal/pkg/export"
)

// GET /export/anki/:id - Export as Anki deck
func (h *Handler) ExportAnki(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	materialID, err := uuid.Parse(c.Param("id"))
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

	// Get flashcards
	flashcards, err := h.MaterialRepo.GetFlashcards(c.Request.Context(), materialID)
	if err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	if len(flashcards) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "No flashcards to export",
		})
		return
	}

	// Generate Anki package
	data, err := export.GenerateAnkiPackage(material.Title, flashcards)
	if err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	filename := fmt.Sprintf("%s.apkg", sanitizeFilename(material.Title))
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	c.Header("Content-Type", "application/octet-stream")
	c.Data(http.StatusOK, "application/octet-stream", data)
}

// GET /export/pdf/:id - Export as PDF
func (h *Handler) ExportPDF(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	materialID, err := uuid.Parse(c.Param("id"))
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

	// Get flashcards and quiz questions
	material.Flashcards, _ = h.MaterialRepo.GetFlashcards(c.Request.Context(), materialID)
	material.QuizQuestions, _ = h.MaterialRepo.GetQuizQuestions(c.Request.Context(), materialID)

	// Generate PDF
	var buf bytes.Buffer
	if err := export.GeneratePDF(material, &buf); err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	filename := fmt.Sprintf("%s.pdf", sanitizeFilename(material.Title))
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	c.Header("Content-Type", "application/pdf")
	c.Data(http.StatusOK, "application/pdf", buf.Bytes())
}

func sanitizeFilename(name string) string {
	// Replace problematic characters
	result := make([]rune, 0, len(name))
	for _, r := range name {
		switch r {
		case '/', '\\', ':', '*', '?', '"', '<', '>', '|':
			result = append(result, '_')
		default:
			result = append(result, r)
		}
	}
	return string(result)
}
