package api

import (
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/meszmate/smartnotes/internal/api/middleware"
	"github.com/meszmate/smartnotes/internal/config"
	"github.com/meszmate/smartnotes/internal/pkg/ai"
	"github.com/meszmate/smartnotes/internal/pkg/auth"
	"github.com/meszmate/smartnotes/internal/pkg/captcha"
	"github.com/meszmate/smartnotes/internal/repository"
)

type Handler struct {
	// Services
	Captcha    *captcha.Turnstile
	AI         *ai.AIClient
	GoogleOAuth *auth.GoogleOAuth
	JWTManager *auth.JWTManager

	// Repositories
	UserRepo      *repository.UserRepository
	MaterialRepo  *repository.MaterialRepository
	FolderRepo    *repository.FolderRepository
	TagRepo       *repository.TagRepository
	SRSRepo       *repository.SRSRepository
	AnalyticsRepo *repository.AnalyticsRepository
	ChatRepo      *repository.ChatRepository
	TokenRepo     *repository.TokenRepository

	// Config
	Config      *config.Config
	FrontendURL string
}

func Start(h *Handler, open bool, port string) {
	r := gin.New()
	r.Use(gin.Recovery())

	// CORS configuration
	corsConfig := cors.Config{
		AllowOrigins:     []string{h.FrontendURL, "http://localhost:5173", "http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}
	r.Use(cors.New(corsConfig))

	// Auth middleware
	authMiddleware := middleware.NewAuthMiddleware(h.JWTManager)

	// Public routes
	r.POST("/generate", h.GenerateResponse) // Legacy endpoint (with captcha)

	// Auth routes
	authGroup := r.Group("/auth")
	{
		authGroup.GET("/google", h.GoogleLogin)
		authGroup.GET("/google/callback", h.GoogleCallback)
		authGroup.POST("/refresh", h.RefreshToken)
		authGroup.POST("/logout", h.Logout)
		authGroup.GET("/me", authMiddleware.RequireAuth(), h.GetMe)
		authGroup.PATCH("/preferences", authMiddleware.RequireAuth(), h.UpdatePreferences)
	}

	// Materials routes (authenticated)
	materialsGroup := r.Group("/materials")
	materialsGroup.Use(authMiddleware.RequireAuth())
	{
		materialsGroup.GET("", h.ListMaterials)
		materialsGroup.POST("", h.CreateMaterial)
		materialsGroup.GET("/:id", h.GetMaterial)
		materialsGroup.PATCH("/:id", h.UpdateMaterial)
		materialsGroup.DELETE("/:id", h.DeleteMaterial)

		// Flashcards
		materialsGroup.POST("/:id/flashcards", h.AddFlashcard)
		materialsGroup.PATCH("/:id/flashcards/:cardId", h.UpdateFlashcard)
		materialsGroup.DELETE("/:id/flashcards/:cardId", h.DeleteFlashcard)

		// Quiz
		materialsGroup.POST("/:id/quiz", h.AddQuizQuestion)
		materialsGroup.PATCH("/:id/quiz/:qId", h.UpdateQuizQuestion)
		materialsGroup.DELETE("/:id/quiz/:qId", h.DeleteQuizQuestion)
		materialsGroup.POST("/:id/quiz/submit", h.SubmitQuiz)

		// Share
		materialsGroup.POST("/:id/share", h.ShareMaterial)
	}

	// Public shared materials
	r.GET("/shared/:token", h.GetSharedMaterial)

	// SRS routes
	srsGroup := r.Group("/srs")
	srsGroup.Use(authMiddleware.RequireAuth())
	{
		srsGroup.GET("/due", h.GetDueCards)
		srsGroup.GET("/due/:materialId", h.GetDueCardsByMaterial)
		srsGroup.POST("/review", h.SubmitReview)
		srsGroup.GET("/stats", h.GetSRSStats)
	}

	// Folders routes
	foldersGroup := r.Group("/folders")
	foldersGroup.Use(authMiddleware.RequireAuth())
	{
		foldersGroup.GET("", h.ListFolders)
		foldersGroup.POST("", h.CreateFolder)
		foldersGroup.PATCH("/:id", h.UpdateFolder)
		foldersGroup.DELETE("/:id", h.DeleteFolder)
	}

	// Tags routes
	tagsGroup := r.Group("/tags")
	tagsGroup.Use(authMiddleware.RequireAuth())
	{
		tagsGroup.GET("", h.ListTags)
		tagsGroup.POST("", h.CreateTag)
		tagsGroup.PATCH("/:id", h.UpdateTag)
		tagsGroup.DELETE("/:id", h.DeleteTag)
	}

	// Analytics routes
	analyticsGroup := r.Group("/analytics")
	analyticsGroup.Use(authMiddleware.RequireAuth())
	{
		analyticsGroup.GET("/overview", h.GetAnalyticsOverview)
		analyticsGroup.GET("/streak", h.GetStreakData)
		analyticsGroup.GET("/activity", h.GetActivityCalendar)
		analyticsGroup.GET("/progress", h.GetProgressData)
	}

	// Chat routes
	chatGroup := r.Group("/chat")
	chatGroup.Use(authMiddleware.RequireAuth())
	{
		chatGroup.GET("/:materialId", h.GetChatHistory)
		chatGroup.POST("/:materialId", h.SendChatMessage)
		chatGroup.DELETE("/:materialId", h.ClearChatHistory)
	}

	// Export routes
	exportGroup := r.Group("/export")
	exportGroup.Use(authMiddleware.RequireAuth())
	{
		exportGroup.GET("/anki/:id", h.ExportAnki)
		exportGroup.GET("/pdf/:id", h.ExportPDF)
	}

	var p string
	if open {
		p = "0.0.0.0"
	}
	r.Run(p + ":" + port)
}
