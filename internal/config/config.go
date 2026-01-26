package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	// Existing
	TurnstileSecret   string
	ApiKey            string
	Open              bool
	Port              string
	RateLimitInterval time.Duration
	TokenLimit        int

	// Database
	DatabaseURL string

	// Google OAuth
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string

	// JWT
	JWTSecret          string
	JWTAccessDuration  time.Duration
	JWTRefreshDuration time.Duration

	// Rate limits
	MaxGenerationsPerDay  int
	MaxTokensPerDay       int
	MaxChatMessagesPerDay int

	// Frontend URL (for CORS and redirects)
	FrontendURL string
}

func New() *Config {
	ratelimitInterval, _ := strconv.Atoi(os.Getenv("RATELIMIT_INTERVAL"))
	tokenLimit, _ := strconv.Atoi(os.Getenv("TOKEN_LIMIT"))

	maxGenerations := envInt("MAX_GENERATIONS_PER_DAY", 5)
	maxTokens := envInt("MAX_TOKENS_PER_DAY", 50000)
	maxChatMessages := envInt("MAX_CHAT_MESSAGES_PER_DAY", 20)

	accessDuration := envInt("JWT_ACCESS_DURATION_MINS", 15)
	refreshDuration := envInt("JWT_REFRESH_DURATION_DAYS", 7)

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}

	return &Config{
		// Existing
		TurnstileSecret:   os.Getenv("TURNSTILE_SECRET"),
		ApiKey:            os.Getenv("API_KEY"),
		Open:              envBool("OPEN"),
		Port:              os.Getenv("PORT"),
		RateLimitInterval: time.Duration(ratelimitInterval) * time.Second,
		TokenLimit:        tokenLimit,

		// Database
		DatabaseURL: os.Getenv("DATABASE_URL"),

		// Google OAuth
		GoogleClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		GoogleRedirectURL:  os.Getenv("GOOGLE_REDIRECT_URL"),

		// JWT
		JWTSecret:          os.Getenv("JWT_SECRET"),
		JWTAccessDuration:  time.Duration(accessDuration) * time.Minute,
		JWTRefreshDuration: time.Duration(refreshDuration) * 24 * time.Hour,

		// Rate limits
		MaxGenerationsPerDay:  maxGenerations,
		MaxTokensPerDay:       maxTokens,
		MaxChatMessagesPerDay: maxChatMessages,

		// Frontend
		FrontendURL: frontendURL,
	}
}

func envBool(key string) bool {
	if v := os.Getenv(key); v != "" {
		if b, err := strconv.ParseBool(v); err == nil {
			return b
		}
	}
	return false
}

func envInt(key string, defaultVal int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return defaultVal
}
