package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/joho/godotenv"
	"github.com/meszmate/smartnotes/internal/api"
	"github.com/meszmate/smartnotes/internal/config"
	"github.com/meszmate/smartnotes/internal/db"
	"github.com/meszmate/smartnotes/internal/pkg/ai"
	"github.com/meszmate/smartnotes/internal/pkg/auth"
	"github.com/meszmate/smartnotes/internal/pkg/captcha"
	"github.com/meszmate/smartnotes/internal/repository"
)

func main() {
	_ = godotenv.Load("cmd/.env", ".env")

	cfg := config.New()

	// Initialize database
	var database *db.DB
	var err error

	if cfg.DatabaseURL != "" {
		database, err = db.New(db.Config{
			URL: cfg.DatabaseURL,
		})
		if err != nil {
			log.Fatalf("Failed to connect to database: %v", err)
		}
		defer database.Close()

		// Run migrations
		if err := database.Migrate(); err != nil {
			log.Printf("Warning: Migration failed: %v", err)
		}
		fmt.Println("Database connected and migrations applied")
	} else {
		fmt.Println("Warning: DATABASE_URL not set, running without database")
	}

	// Initialize services
	var googleOAuth *auth.GoogleOAuth
	var jwtManager *auth.JWTManager

	if cfg.GoogleClientID != "" && cfg.GoogleClientSecret != "" {
		googleOAuth = auth.NewGoogleOAuth(
			cfg.GoogleClientID,
			cfg.GoogleClientSecret,
			cfg.GoogleRedirectURL,
		)
	}

	if cfg.JWTSecret != "" {
		jwtManager = auth.NewJWTManager(
			cfg.JWTSecret,
			cfg.JWTAccessDuration,
			cfg.JWTRefreshDuration,
		)
	}

	// Initialize repositories
	var userRepo *repository.UserRepository
	var materialRepo *repository.MaterialRepository
	var folderRepo *repository.FolderRepository
	var tagRepo *repository.TagRepository
	var srsRepo *repository.SRSRepository
	var analyticsRepo *repository.AnalyticsRepository
	var chatRepo *repository.ChatRepository
	var tokenRepo *repository.TokenRepository

	if database != nil {
		userRepo = repository.NewUserRepository(database)
		materialRepo = repository.NewMaterialRepository(database)
		folderRepo = repository.NewFolderRepository(database)
		tagRepo = repository.NewTagRepository(database)
		srsRepo = repository.NewSRSRepository(database)
		analyticsRepo = repository.NewAnalyticsRepository(database)
		chatRepo = repository.NewChatRepository(database)
		tokenRepo = repository.NewTokenRepository(database)
	}

	h := &api.Handler{
		// Services
		Captcha:     captcha.NewTurnstile(cfg.TurnstileSecret),
		AI:          ai.NewAIClient(cfg.ApiKey, cfg.RateLimitInterval, cfg.TokenLimit),
		GoogleOAuth: googleOAuth,
		JWTManager:  jwtManager,

		// Repositories
		UserRepo:      userRepo,
		MaterialRepo:  materialRepo,
		FolderRepo:    folderRepo,
		TagRepo:       tagRepo,
		SRSRepo:       srsRepo,
		AnalyticsRepo: analyticsRepo,
		ChatRepo:      chatRepo,
		TokenRepo:     tokenRepo,

		// Config
		Config:      cfg,
		FrontendURL: cfg.FrontendURL,
	}

	// Graceful shutdown
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan
		fmt.Println("\nShutting down...")
		if database != nil {
			database.Close()
		}
		os.Exit(0)
	}()

	fmt.Printf("Starting server on port %s...\n", cfg.Port)
	api.Start(h, cfg.Open, cfg.Port)
}
