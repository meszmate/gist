package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/meszmate/smartnotes/internal/api/middleware"
	"github.com/meszmate/smartnotes/internal/errx"
	"github.com/meszmate/smartnotes/internal/models"
	"github.com/meszmate/smartnotes/internal/pkg/srs"
)

// GET /srs/due - Get all due cards
func (h *Handler) GetDueCards(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	cards, err := h.SRSRepo.GetDueCards(c.Request.Context(), userID, 100)
	if err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	totalDue, _ := h.SRSRepo.CountDueCards(c.Request.Context(), userID)

	c.JSON(http.StatusOK, models.DueCardsResponse{
		Cards:    cards,
		TotalDue: totalDue,
	})
}

// GET /srs/due/:materialId - Get due cards for specific material
func (h *Handler) GetDueCardsByMaterial(c *gin.Context) {
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

	cards, err := h.SRSRepo.GetDueCardsByMaterial(c.Request.Context(), userID, materialID, 100)
	if err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	totalDue, _ := h.SRSRepo.CountDueCardsByMaterial(c.Request.Context(), materialID)

	c.JSON(http.StatusOK, models.DueCardsResponse{
		Cards:      cards,
		TotalDue:   totalDue,
		MaterialID: &materialID,
	})
}

// POST /srs/review - Submit card review
func (h *Handler) SubmitReview(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	var req models.ReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Invalid request body",
		})
		return
	}

	// Get the flashcard
	card, err := h.MaterialRepo.GetFlashcardByID(c.Request.Context(), req.CardID)
	if err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}
	if card == nil {
		errx.Handle(c, errx.ErrNotFound)
		return
	}

	// Verify ownership through material
	material, err := h.MaterialRepo.GetByID(c.Request.Context(), card.StudyMaterialID)
	if err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}
	if material == nil || material.UserID != userID {
		errx.Handle(c, errx.ErrNotFound)
		return
	}

	// Calculate new SRS values using SM-2 algorithm
	newState := srs.CalculateNextReview(srs.CardState{
		EaseFactor:  card.EaseFactor,
		Interval:    card.IntervalDays,
		Repetitions: card.Repetitions,
	}, srs.Rating(req.Rating))

	nextReview := time.Now().AddDate(0, 0, newState.Interval)

	// Update card
	if err := h.SRSRepo.UpdateCardSRS(
		c.Request.Context(),
		req.CardID,
		newState.EaseFactor,
		newState.Interval,
		newState.Repetitions,
		nextReview,
	); err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	// Update analytics
	h.AnalyticsRepo.IncrementCardsReviewed(c.Request.Context(), userID, 1)

	c.JSON(http.StatusOK, gin.H{
		"card_id":          req.CardID,
		"ease_factor":      newState.EaseFactor,
		"interval_days":    newState.Interval,
		"repetitions":      newState.Repetitions,
		"next_review_date": nextReview.Format("2006-01-02"),
	})
}

// GET /srs/stats - Get SRS statistics
func (h *Handler) GetSRSStats(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	stats, err := h.SRSRepo.GetSRSStats(c.Request.Context(), userID)
	if err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	c.JSON(http.StatusOK, stats)
}
