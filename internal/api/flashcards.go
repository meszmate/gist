package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/meszmate/smartnotes/internal/api/middleware"
	"github.com/meszmate/smartnotes/internal/errx"
	"github.com/meszmate/smartnotes/internal/models"
)

// POST /materials/:id/flashcards - Add custom flashcard
func (h *Handler) AddFlashcard(c *gin.Context) {
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

	var req models.CreateFlashcardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Invalid request body",
		})
		return
	}

	flashcard := &models.Flashcard{
		StudyMaterialID: materialID,
		Question:        req.Question,
		Answer:          req.Answer,
	}

	if err := h.MaterialRepo.CreateFlashcard(c.Request.Context(), flashcard); err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	c.JSON(http.StatusCreated, flashcard)
}

// PATCH /materials/:id/flashcards/:cardId - Edit flashcard
func (h *Handler) UpdateFlashcard(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	materialID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Invalid material ID",
		})
		return
	}

	cardID, err := uuid.Parse(c.Param("cardId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Invalid flashcard ID",
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

	// Get flashcard
	flashcard, err := h.MaterialRepo.GetFlashcardByID(c.Request.Context(), cardID)
	if err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}
	if flashcard == nil || flashcard.StudyMaterialID != materialID {
		errx.Handle(c, errx.ErrNotFound)
		return
	}

	var req models.UpdateFlashcardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Invalid request body",
		})
		return
	}

	if req.Question != nil {
		flashcard.Question = *req.Question
	}
	if req.Answer != nil {
		flashcard.Answer = *req.Answer
	}

	if err := h.MaterialRepo.UpdateFlashcard(c.Request.Context(), flashcard); err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	c.JSON(http.StatusOK, flashcard)
}

// DELETE /materials/:id/flashcards/:cardId - Delete flashcard
func (h *Handler) DeleteFlashcard(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	materialID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Invalid material ID",
		})
		return
	}

	cardID, err := uuid.Parse(c.Param("cardId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Invalid flashcard ID",
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

	// Verify flashcard belongs to material
	flashcard, err := h.MaterialRepo.GetFlashcardByID(c.Request.Context(), cardID)
	if err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}
	if flashcard == nil || flashcard.StudyMaterialID != materialID {
		errx.Handle(c, errx.ErrNotFound)
		return
	}

	if err := h.MaterialRepo.DeleteFlashcard(c.Request.Context(), cardID); err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Flashcard deleted"})
}
