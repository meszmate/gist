package api

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/meszmate/smartnotes/internal/api/middleware"
	"github.com/meszmate/smartnotes/internal/errx"
	"github.com/meszmate/smartnotes/internal/models"
)

// GET /materials - List user's materials
func (h *Handler) ListMaterials(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	filter := models.MaterialsFilter{
		UserID: userID,
		Search: c.Query("search"),
		Limit:  20,
		Offset: 0,
	}

	if folderID := c.Query("folder_id"); folderID != "" {
		id, err := uuid.Parse(folderID)
		if err == nil {
			filter.FolderID = &id
		}
	}

	materials, total, err := h.MaterialRepo.List(c.Request.Context(), filter)
	if err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	// Load tags for each material
	for i := range materials {
		tags, _ := h.MaterialRepo.GetMaterialTags(c.Request.Context(), materials[i].ID)
		materials[i].Tags = tags
	}

	c.JSON(http.StatusOK, gin.H{
		"materials": materials,
		"total":     total,
	})
}

// POST /materials - Create new material
func (h *Handler) CreateMaterial(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	var req models.CreateMaterialRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Invalid request body",
		})
		return
	}

	// Check rate limit
	usage, err := h.UserRepo.GetOrCreateUsage(c.Request.Context(), userID, time.Now())
	if err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	if usage.GenerationsCount >= h.Config.MaxGenerationsPerDay {
		c.JSON(http.StatusTooManyRequests, gin.H{
			"error":   "Rate Limit Exceeded",
			"message": "Daily generation limit reached",
			"reset_at": time.Now().Truncate(24*time.Hour).Add(24*time.Hour).Format(time.RFC3339),
		})
		return
	}

	// Validate options
	if !req.Summary && !req.Flashcards && !req.Quiz {
		errx.Handle(c, errx.ErrOptions)
		return
	}

	// Set defaults for counts
	flashcardCount := req.FlashcardCount
	if flashcardCount <= 0 {
		flashcardCount = 10
	} else if flashcardCount > 30 {
		flashcardCount = 30
	}

	quizCount := req.QuizCount
	if quizCount <= 0 {
		quizCount = 5
	} else if quizCount > 15 {
		quizCount = 15
	}

	difficulty := req.Difficulty
	if difficulty == "" {
		difficulty = models.DifficultyStandard
	}

	// Generate with AI
	resp, err := h.AI.GenerateWithOptions(
		c.Request.Context(),
		req.Prompt,
		req.Summary,
		req.Flashcards,
		req.Quiz,
		string(difficulty),
		flashcardCount,
		quizCount,
	)
	if err != nil {
		errx.Handle(c, errx.ErrGeneration(err))
		return
	}

	// Create material in DB
	material := &models.StudyMaterial{
		UserID:          userID,
		FolderID:        req.FolderID,
		Title:           resp.Title,
		Summary:         resp.Summary,
		OriginalContent: req.Prompt,
		Difficulty:      difficulty,
		IsPublic:        false,
	}

	if err := h.MaterialRepo.Create(c.Request.Context(), material); err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	// Create flashcards
	if len(resp.Flashcards) > 0 {
		if err := h.MaterialRepo.CreateFlashcards(c.Request.Context(), material.ID, resp.Flashcards); err != nil {
			fmt.Printf("[ERROR] Failed to create flashcards: %v\n", err)
		}
	}

	// Create quiz questions
	if len(resp.QuizQuestions) > 0 {
		if err := h.MaterialRepo.CreateQuizQuestions(c.Request.Context(), material.ID, resp.QuizQuestions); err != nil {
			fmt.Printf("[ERROR] Failed to create quiz questions: %v\n", err)
		}
	}

	// Increment usage
	h.UserRepo.IncrementGenerations(c.Request.Context(), userID, 0) // TODO: track actual tokens

	// Load flashcards and quiz for response
	material.Flashcards, _ = h.MaterialRepo.GetFlashcards(c.Request.Context(), material.ID)
	material.QuizQuestions, _ = h.MaterialRepo.GetQuizQuestions(c.Request.Context(), material.ID)

	c.JSON(http.StatusCreated, material)
}

// GET /materials/:id - Get single material
func (h *Handler) GetMaterial(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	materialID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Invalid material ID",
		})
		return
	}

	material, err := h.MaterialRepo.GetByID(c.Request.Context(), materialID)
	if err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}
	if material == nil || material.UserID != userID {
		errx.Handle(c, errx.ErrNotFound)
		return
	}

	// Load related data
	material.Flashcards, _ = h.MaterialRepo.GetFlashcards(c.Request.Context(), material.ID)
	material.QuizQuestions, _ = h.MaterialRepo.GetQuizQuestions(c.Request.Context(), material.ID)
	material.Tags, _ = h.MaterialRepo.GetMaterialTags(c.Request.Context(), material.ID)

	c.JSON(http.StatusOK, material)
}

// PATCH /materials/:id - Update material metadata
func (h *Handler) UpdateMaterial(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	materialID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Invalid material ID",
		})
		return
	}

	material, err := h.MaterialRepo.GetByID(c.Request.Context(), materialID)
	if err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}
	if material == nil || material.UserID != userID {
		errx.Handle(c, errx.ErrNotFound)
		return
	}

	var req models.UpdateMaterialRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Invalid request body",
		})
		return
	}

	if req.Title != nil {
		material.Title = *req.Title
	}
	if req.FolderID != nil {
		material.FolderID = req.FolderID
	}
	if req.IsPublic != nil {
		material.IsPublic = *req.IsPublic
	}

	if err := h.MaterialRepo.Update(c.Request.Context(), material); err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	// Update tags if provided
	if req.TagIDs != nil {
		h.MaterialRepo.SetMaterialTags(c.Request.Context(), material.ID, req.TagIDs)
	}

	c.JSON(http.StatusOK, material)
}

// DELETE /materials/:id - Delete material
func (h *Handler) DeleteMaterial(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	materialID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Invalid material ID",
		})
		return
	}

	material, err := h.MaterialRepo.GetByID(c.Request.Context(), materialID)
	if err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}
	if material == nil || material.UserID != userID {
		errx.Handle(c, errx.ErrNotFound)
		return
	}

	if err := h.MaterialRepo.Delete(c.Request.Context(), materialID); err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Material deleted"})
}

// POST /materials/:id/share - Generate share link
func (h *Handler) ShareMaterial(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	materialID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Invalid material ID",
		})
		return
	}

	material, err := h.MaterialRepo.GetByID(c.Request.Context(), materialID)
	if err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}
	if material == nil || material.UserID != userID {
		errx.Handle(c, errx.ErrNotFound)
		return
	}

	// Generate share token
	token := make([]byte, 32)
	rand.Read(token)
	shareToken := hex.EncodeToString(token)

	if err := h.MaterialRepo.SetShareToken(c.Request.Context(), materialID, shareToken); err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"share_token": shareToken,
		"share_url":   fmt.Sprintf("%s/shared/%s", h.FrontendURL, shareToken),
	})
}

// GET /shared/:token - Get shared material (public)
func (h *Handler) GetSharedMaterial(c *gin.Context) {
	token := c.Param("token")

	material, err := h.MaterialRepo.GetByShareToken(c.Request.Context(), token)
	if err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}
	if material == nil {
		errx.Handle(c, errx.ErrNotFound)
		return
	}

	// Load related data
	material.Flashcards, _ = h.MaterialRepo.GetFlashcards(c.Request.Context(), material.ID)
	material.QuizQuestions, _ = h.MaterialRepo.GetQuizQuestions(c.Request.Context(), material.ID)

	// Don't expose user ID and original content for shared materials
	material.UserID = uuid.Nil
	material.OriginalContent = ""

	c.JSON(http.StatusOK, material)
}
