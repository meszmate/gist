package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/meszmate/smartnotes/internal/api/middleware"
	"github.com/meszmate/smartnotes/internal/errx"
	"github.com/meszmate/smartnotes/internal/models"
)

// POST /materials/:id/quiz - Add custom quiz question
func (h *Handler) AddQuizQuestion(c *gin.Context) {
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

	var req models.CreateQuizQuestionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Invalid request body",
		})
		return
	}

	// Validate correct answer is in options
	validCorrect := false
	for _, opt := range req.Options {
		if opt == req.Correct {
			validCorrect = true
			break
		}
	}
	if !validCorrect {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Correct answer must be one of the options",
		})
		return
	}

	question := &models.QuizQuestion{
		StudyMaterialID: materialID,
		Question:        req.Question,
		Options:         req.Options,
		Correct:         req.Correct,
	}

	if err := h.MaterialRepo.CreateQuizQuestion(c.Request.Context(), question); err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	c.JSON(http.StatusCreated, question)
}

// PATCH /materials/:id/quiz/:qId - Edit quiz question
func (h *Handler) UpdateQuizQuestion(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	materialID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Invalid material ID",
		})
		return
	}

	qID, err := uuid.Parse(c.Param("qId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Invalid question ID",
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

	// Get question
	question, err := h.MaterialRepo.GetQuizQuestionByID(c.Request.Context(), qID)
	if err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}
	if question == nil || question.StudyMaterialID != materialID {
		errx.Handle(c, errx.ErrNotFound)
		return
	}

	var req models.UpdateQuizQuestionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Invalid request body",
		})
		return
	}

	if req.Question != nil {
		question.Question = *req.Question
	}
	if req.Options != nil {
		question.Options = *req.Options
	}
	if req.Correct != nil {
		question.Correct = *req.Correct
	}

	// Validate correct answer is in options
	validCorrect := false
	for _, opt := range question.Options {
		if opt == question.Correct {
			validCorrect = true
			break
		}
	}
	if !validCorrect {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Correct answer must be one of the options",
		})
		return
	}

	if err := h.MaterialRepo.UpdateQuizQuestion(c.Request.Context(), question); err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	c.JSON(http.StatusOK, question)
}

// DELETE /materials/:id/quiz/:qId - Delete quiz question
func (h *Handler) DeleteQuizQuestion(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	materialID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Invalid material ID",
		})
		return
	}

	qID, err := uuid.Parse(c.Param("qId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Invalid question ID",
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

	// Verify question belongs to material
	question, err := h.MaterialRepo.GetQuizQuestionByID(c.Request.Context(), qID)
	if err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}
	if question == nil || question.StudyMaterialID != materialID {
		errx.Handle(c, errx.ErrNotFound)
		return
	}

	if err := h.MaterialRepo.DeleteQuizQuestion(c.Request.Context(), qID); err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Question deleted"})
}

// POST /materials/:id/quiz/submit - Submit quiz answers
func (h *Handler) SubmitQuiz(c *gin.Context) {
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

	var submission struct {
		Answers map[string]string `json:"answers"` // question_id -> selected_answer
	}
	if err := c.ShouldBindJSON(&submission); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Invalid request body",
		})
		return
	}

	// Get all questions
	questions, err := h.MaterialRepo.GetQuizQuestions(c.Request.Context(), materialID)
	if err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	// Calculate results
	var results []models.QuestionResult
	correctCount := 0

	for _, q := range questions {
		userAnswer, answered := submission.Answers[q.ID.String()]
		isCorrect := answered && userAnswer == q.Correct

		if isCorrect {
			correctCount++
		}

		results = append(results, models.QuestionResult{
			QuestionID:    q.ID,
			UserAnswer:    userAnswer,
			CorrectAnswer: q.Correct,
			IsCorrect:     isCorrect,
		})
	}

	score := 0.0
	if len(questions) > 0 {
		score = float64(correctCount) / float64(len(questions)) * 100
	}

	// Record analytics
	h.AnalyticsRepo.IncrementQuizzesCompleted(c.Request.Context(), userID)
	h.AnalyticsRepo.CreateSession(c.Request.Context(), &models.StudySession{
		UserID:      userID,
		MaterialID:  &materialID,
		SessionType: models.SessionQuiz,
		Score:       &score,
	})

	c.JSON(http.StatusOK, models.QuizResult{
		TotalQuestions: len(questions),
		CorrectAnswers: correctCount,
		Score:          score,
		Results:        results,
	})
}
