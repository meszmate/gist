package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/meszmate/smartnotes/internal/api/middleware"
	"github.com/meszmate/smartnotes/internal/errx"
	"github.com/meszmate/smartnotes/internal/models"
)

// GET /folders - List user's folders
func (h *Handler) ListFolders(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	folders, err := h.FolderRepo.GetFolderTree(c.Request.Context(), userID)
	if err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	c.JSON(http.StatusOK, gin.H{"folders": folders})
}

// POST /folders - Create folder
func (h *Handler) CreateFolder(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	var req models.CreateFolderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Invalid request body",
		})
		return
	}

	// Verify parent folder ownership if provided
	if req.ParentID != nil {
		parent, err := h.FolderRepo.GetByID(c.Request.Context(), *req.ParentID)
		if err != nil {
			errx.Handle(c, errx.InternalError())
			return
		}
		if parent == nil || parent.UserID != userID {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Bad Request",
				"message": "Invalid parent folder",
			})
			return
		}
	}

	color := req.Color
	if color == "" {
		color = "#6366f1"
	}

	folder := &models.Folder{
		UserID:   userID,
		ParentID: req.ParentID,
		Name:     req.Name,
		Color:    color,
	}

	if err := h.FolderRepo.Create(c.Request.Context(), folder); err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	c.JSON(http.StatusCreated, folder)
}

// PATCH /folders/:id - Update folder
func (h *Handler) UpdateFolder(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	folderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Invalid folder ID",
		})
		return
	}

	folder, err := h.FolderRepo.GetByID(c.Request.Context(), folderID)
	if err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}
	if folder == nil || folder.UserID != userID {
		errx.Handle(c, errx.ErrNotFound)
		return
	}

	var req models.UpdateFolderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Invalid request body",
		})
		return
	}

	if req.Name != nil {
		folder.Name = *req.Name
	}
	if req.ParentID != nil {
		// Prevent circular reference
		if *req.ParentID == folderID {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Bad Request",
				"message": "Folder cannot be its own parent",
			})
			return
		}
		folder.ParentID = req.ParentID
	}
	if req.Color != nil {
		folder.Color = *req.Color
	}

	if err := h.FolderRepo.Update(c.Request.Context(), folder); err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	c.JSON(http.StatusOK, folder)
}

// DELETE /folders/:id - Delete folder
func (h *Handler) DeleteFolder(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	folderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Invalid folder ID",
		})
		return
	}

	folder, err := h.FolderRepo.GetByID(c.Request.Context(), folderID)
	if err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}
	if folder == nil || folder.UserID != userID {
		errx.Handle(c, errx.ErrNotFound)
		return
	}

	if err := h.FolderRepo.Delete(c.Request.Context(), folderID); err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Folder deleted"})
}

// GET /tags - List user's tags
func (h *Handler) ListTags(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	tags, err := h.TagRepo.ListByUser(c.Request.Context(), userID)
	if err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	c.JSON(http.StatusOK, gin.H{"tags": tags})
}

// POST /tags - Create tag
func (h *Handler) CreateTag(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	var req models.CreateTagRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Invalid request body",
		})
		return
	}

	color := req.Color
	if color == "" {
		color = "#6366f1"
	}

	tag := &models.Tag{
		UserID: userID,
		Name:   req.Name,
		Color:  color,
	}

	if err := h.TagRepo.Create(c.Request.Context(), tag); err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	c.JSON(http.StatusCreated, tag)
}

// PATCH /tags/:id - Update tag
func (h *Handler) UpdateTag(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	tagID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Invalid tag ID",
		})
		return
	}

	tag, err := h.TagRepo.GetByID(c.Request.Context(), tagID)
	if err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}
	if tag == nil || tag.UserID != userID {
		errx.Handle(c, errx.ErrNotFound)
		return
	}

	var req models.UpdateTagRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Invalid request body",
		})
		return
	}

	if req.Name != nil {
		tag.Name = *req.Name
	}
	if req.Color != nil {
		tag.Color = *req.Color
	}

	if err := h.TagRepo.Update(c.Request.Context(), tag); err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	c.JSON(http.StatusOK, tag)
}

// DELETE /tags/:id - Delete tag
func (h *Handler) DeleteTag(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	tagID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Invalid tag ID",
		})
		return
	}

	tag, err := h.TagRepo.GetByID(c.Request.Context(), tagID)
	if err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}
	if tag == nil || tag.UserID != userID {
		errx.Handle(c, errx.ErrNotFound)
		return
	}

	if err := h.TagRepo.Delete(c.Request.Context(), tagID); err != nil {
		errx.Handle(c, errx.InternalError())
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tag deleted"})
}
