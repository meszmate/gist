package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/meszmate/smartnotes/internal/api/middleware"
	"github.com/meszmate/smartnotes/internal/errx"
)

// GET /analytics/overview - Get dashboard stats
func (h *Handler) GetAnalyticsOverview(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	overview, err := h.AnalyticsRepo.GetOverview(c.Request.Context(), userID)
	if err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	c.JSON(http.StatusOK, overview)
}

// GET /analytics/streak - Get streak data
func (h *Handler) GetStreakData(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	streakData, err := h.AnalyticsRepo.GetStreakData(c.Request.Context(), userID, 90)
	if err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	c.JSON(http.StatusOK, streakData)
}

// GET /analytics/activity - Get activity calendar data
func (h *Handler) GetActivityCalendar(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	streakData, err := h.AnalyticsRepo.GetStreakData(c.Request.Context(), userID, 365)
	if err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	c.JSON(http.StatusOK, gin.H{"calendar": streakData.Calendar})
}

// GET /analytics/progress - Get progress charts data
func (h *Handler) GetProgressData(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	progressData, err := h.AnalyticsRepo.GetProgressData(c.Request.Context(), userID)
	if err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	// Get weak topics
	weakTopics, _ := h.AnalyticsRepo.GetWeakTopics(c.Request.Context(), userID, 5)

	c.JSON(http.StatusOK, gin.H{
		"weekly_cards":  progressData.WeeklyCards,
		"weekly_scores": progressData.WeeklyScores,
		"weekly_time":   progressData.WeeklyTime,
		"weak_topics":   weakTopics,
	})
}
