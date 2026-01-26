package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID        uuid.UUID `json:"id"`
	GoogleID  string    `json:"-"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	AvatarURL string    `json:"avatar_url"`
	Theme     string    `json:"theme"`
	Locale    string    `json:"locale"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type UserUsage struct {
	ID                uuid.UUID `json:"id"`
	UserID            uuid.UUID `json:"user_id"`
	Date              time.Time `json:"date"`
	GenerationsCount  int       `json:"generations_count"`
	TokensUsed        int       `json:"tokens_used"`
	ChatMessagesCount int       `json:"chat_messages_count"`
}

type UserPreferences struct {
	Theme  string `json:"theme"`
	Locale string `json:"locale"`
}
