package api

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/meszmate/smartnotes/internal/api/middleware"
	"github.com/meszmate/smartnotes/internal/models"
	"github.com/meszmate/smartnotes/internal/pkg/auth"
	"github.com/meszmate/smartnotes/internal/repository"
)

const (
	oauthStateCookieName = "oauth_state"
	accessTokenCookie    = "access_token"
	refreshTokenCookie   = "refresh_token"
)

// GET /auth/google - Redirect to Google OAuth
func (h *Handler) GoogleLogin(c *gin.Context) {
	// Generate random state
	state, err := generateState()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal Server Error",
			"message": "Failed to generate OAuth state",
		})
		return
	}

	// Store state in cookie
	c.SetCookie(oauthStateCookieName, state, 300, "/", "", false, true)

	// Redirect to Google
	url := h.GoogleOAuth.GetAuthURL(state)
	c.Redirect(http.StatusTemporaryRedirect, url)
}

// GET /auth/google/callback - Handle OAuth callback
func (h *Handler) GoogleCallback(c *gin.Context) {
	// Verify state
	state := c.Query("state")
	storedState, err := c.Cookie(oauthStateCookieName)
	if err != nil || state != storedState {
		c.Redirect(http.StatusTemporaryRedirect, h.FrontendURL+"/login?error=invalid_state")
		return
	}

	// Clear state cookie
	c.SetCookie(oauthStateCookieName, "", -1, "/", "", false, true)

	// Exchange code for token
	code := c.Query("code")
	if code == "" {
		c.Redirect(http.StatusTemporaryRedirect, h.FrontendURL+"/login?error=no_code")
		return
	}

	token, err := h.GoogleOAuth.Exchange(c.Request.Context(), code)
	if err != nil {
		fmt.Printf("[ERROR] OAuth exchange failed: %v\n", err)
		c.Redirect(http.StatusTemporaryRedirect, h.FrontendURL+"/login?error=exchange_failed")
		return
	}

	// Get user info from Google
	userInfo, err := h.GoogleOAuth.GetUserInfo(c.Request.Context(), token)
	if err != nil {
		fmt.Printf("[ERROR] Get user info failed: %v\n", err)
		c.Redirect(http.StatusTemporaryRedirect, h.FrontendURL+"/login?error=user_info_failed")
		return
	}

	// Find or create user
	user, err := h.findOrCreateUser(c, userInfo)
	if err != nil {
		fmt.Printf("[ERROR] Find/create user failed: %v\n", err)
		c.Redirect(http.StatusTemporaryRedirect, h.FrontendURL+"/login?error=user_creation_failed")
		return
	}

	// Generate JWT tokens
	tokenPair, refreshHash, err := h.JWTManager.GenerateTokenPair(user.ID, user.Email)
	if err != nil {
		fmt.Printf("[ERROR] Generate tokens failed: %v\n", err)
		c.Redirect(http.StatusTemporaryRedirect, h.FrontendURL+"/login?error=token_generation_failed")
		return
	}

	// Store refresh token in database
	refreshToken := &repository.RefreshToken{
		UserID:    user.ID,
		TokenHash: refreshHash,
		ExpiresAt: time.Now().Add(h.JWTManager.RefreshDuration()),
	}
	if err := h.TokenRepo.Create(c.Request.Context(), refreshToken); err != nil {
		fmt.Printf("[ERROR] Store refresh token failed: %v\n", err)
	}

	// Set cookies
	h.setAuthCookies(c, tokenPair)

	// Redirect to frontend with success
	c.Redirect(http.StatusTemporaryRedirect, h.FrontendURL+"/dashboard?login=success")
}

// POST /auth/refresh - Refresh access token
func (h *Handler) RefreshToken(c *gin.Context) {
	refreshToken, err := c.Cookie(refreshTokenCookie)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Unauthorized",
			"message": "Refresh token not found",
		})
		return
	}

	// Hash and lookup refresh token
	tokenHash := auth.HashRefreshToken(refreshToken)
	storedToken, err := h.TokenRepo.GetByHash(c.Request.Context(), tokenHash)
	if err != nil || storedToken == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Unauthorized",
			"message": "Invalid refresh token",
		})
		return
	}

	// Check if expired
	if storedToken.ExpiresAt.Before(time.Now()) {
		h.TokenRepo.Delete(c.Request.Context(), tokenHash)
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Unauthorized",
			"message": "Refresh token expired",
		})
		return
	}

	// Get user
	user, err := h.UserRepo.GetByID(c.Request.Context(), storedToken.UserID)
	if err != nil || user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Unauthorized",
			"message": "User not found",
		})
		return
	}

	// Delete old refresh token
	h.TokenRepo.Delete(c.Request.Context(), tokenHash)

	// Generate new token pair
	tokenPair, newRefreshHash, err := h.JWTManager.GenerateTokenPair(user.ID, user.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal Server Error",
			"message": "Failed to generate tokens",
		})
		return
	}

	// Store new refresh token
	newRefreshToken := &repository.RefreshToken{
		UserID:    user.ID,
		TokenHash: newRefreshHash,
		ExpiresAt: time.Now().Add(h.JWTManager.RefreshDuration()),
	}
	h.TokenRepo.Create(c.Request.Context(), newRefreshToken)

	// Set cookies
	h.setAuthCookies(c, tokenPair)

	c.JSON(http.StatusOK, gin.H{
		"access_token": tokenPair.AccessToken,
		"expires_at":   tokenPair.ExpiresAt,
	})
}

// POST /auth/logout - Logout user
func (h *Handler) Logout(c *gin.Context) {
	// Delete refresh token from database
	if refreshToken, err := c.Cookie(refreshTokenCookie); err == nil {
		tokenHash := auth.HashRefreshToken(refreshToken)
		h.TokenRepo.Delete(c.Request.Context(), tokenHash)
	}

	// Clear cookies
	c.SetCookie(accessTokenCookie, "", -1, "/", "", false, true)
	c.SetCookie(refreshTokenCookie, "", -1, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

// GET /auth/me - Get current user
func (h *Handler) GetMe(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Unauthorized",
			"message": "User not authenticated",
		})
		return
	}

	user, err := h.UserRepo.GetByID(c.Request.Context(), userID)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Not Found",
			"message": "User not found",
		})
		return
	}

	// Get today's usage
	usage, _ := h.UserRepo.GetOrCreateUsage(c.Request.Context(), userID, time.Now())

	c.JSON(http.StatusOK, gin.H{
		"user": user,
		"usage": gin.H{
			"generations_today":    usage.GenerationsCount,
			"generations_limit":    h.Config.MaxGenerationsPerDay,
			"chat_messages_today":  usage.ChatMessagesCount,
			"chat_messages_limit":  h.Config.MaxChatMessagesPerDay,
			"tokens_today":         usage.TokensUsed,
			"tokens_limit":         h.Config.MaxTokensPerDay,
		},
	})
}

// PATCH /auth/preferences - Update user preferences
func (h *Handler) UpdatePreferences(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Unauthorized",
			"message": "User not authenticated",
		})
		return
	}

	var req models.UserPreferences
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Bad Request",
			"message": "Invalid request body",
		})
		return
	}

	if err := h.UserRepo.UpdatePreferences(c.Request.Context(), userID, req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal Server Error",
			"message": "Failed to update preferences",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Preferences updated"})
}

func (h *Handler) findOrCreateUser(c *gin.Context, info *auth.GoogleUserInfo) (*models.User, error) {
	// Try to find existing user
	user, err := h.UserRepo.GetByGoogleID(c.Request.Context(), info.ID)
	if err != nil {
		return nil, err
	}

	if user != nil {
		// Update user info
		user.Email = info.Email
		user.Name = info.Name
		user.AvatarURL = info.Picture
		if err := h.UserRepo.Update(c.Request.Context(), user); err != nil {
			return nil, err
		}
		return user, nil
	}

	// Create new user
	user = &models.User{
		GoogleID:  info.ID,
		Email:     info.Email,
		Name:      info.Name,
		AvatarURL: info.Picture,
		Theme:     "system",
		Locale:    "hu",
	}

	if err := h.UserRepo.Create(c.Request.Context(), user); err != nil {
		return nil, err
	}

	return user, nil
}

func (h *Handler) setAuthCookies(c *gin.Context, tokenPair *auth.TokenPair) {
	// Access token cookie (short-lived)
	c.SetCookie(
		accessTokenCookie,
		tokenPair.AccessToken,
		int(time.Until(tokenPair.ExpiresAt).Seconds()),
		"/",
		"",
		false, // secure in production
		true,  // httpOnly
	)

	// Refresh token cookie (long-lived)
	c.SetCookie(
		refreshTokenCookie,
		tokenPair.RefreshToken,
		int(h.JWTManager.RefreshDuration().Seconds()),
		"/",
		"",
		false, // secure in production
		true,  // httpOnly
	)
}

func generateState() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}
