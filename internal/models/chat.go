package models

import (
	"time"

	"github.com/google/uuid"
)

type ChatRole string

const (
	ChatRoleUser      ChatRole = "user"
	ChatRoleAssistant ChatRole = "assistant"
)

type ChatMessage struct {
	ID              uuid.UUID  `json:"id"`
	UserID          uuid.UUID  `json:"user_id"`
	StudyMaterialID *uuid.UUID `json:"study_material_id,omitempty"`
	Role            ChatRole   `json:"role"`
	Content         string     `json:"content"`
	CreatedAt       time.Time  `json:"created_at"`
}

type SendChatMessageRequest struct {
	Content string `json:"content" binding:"required,max=2000"`
}

type ChatHistory struct {
	Messages     []ChatMessage `json:"messages"`
	MaterialID   *uuid.UUID    `json:"material_id,omitempty"`
	MaterialName string        `json:"material_name,omitempty"`
}
