package models

import (
	"time"

	"github.com/google/uuid"
)

type Difficulty string

const (
	DifficultyBeginner Difficulty = "beginner"
	DifficultyStandard Difficulty = "standard"
	DifficultyAdvanced Difficulty = "advanced"
)

type StudyMaterial struct {
	ID              uuid.UUID      `json:"id"`
	UserID          uuid.UUID      `json:"user_id"`
	FolderID        *uuid.UUID     `json:"folder_id,omitempty"`
	Title           string         `json:"title"`
	Summary         string         `json:"summary"`
	OriginalContent string         `json:"original_content,omitempty"`
	Difficulty      Difficulty     `json:"difficulty"`
	IsPublic        bool           `json:"is_public"`
	ShareToken      *string        `json:"share_token,omitempty"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	Flashcards      []Flashcard    `json:"flashcards,omitempty"`
	QuizQuestions   []QuizQuestion `json:"quiz_questions,omitempty"`
	Tags            []Tag          `json:"tags,omitempty"`
}

type CreateMaterialRequest struct {
	Prompt          string     `json:"prompt" binding:"required"`
	Summary         bool       `json:"summary"`
	Flashcards      bool       `json:"flashcards"`
	Quiz            bool       `json:"quiz"`
	Difficulty      Difficulty `json:"difficulty"`
	FlashcardCount  int        `json:"flashcard_count"`
	QuizCount       int        `json:"quiz_count"`
	FolderID        *uuid.UUID `json:"folder_id"`
	Turnstile       string     `json:"turnstile"`
}

type UpdateMaterialRequest struct {
	Title    *string    `json:"title"`
	FolderID *uuid.UUID `json:"folder_id"`
	IsPublic *bool      `json:"is_public"`
	TagIDs   []uuid.UUID `json:"tag_ids"`
}

type MaterialsFilter struct {
	UserID   uuid.UUID
	FolderID *uuid.UUID
	TagID    *uuid.UUID
	Search   string
	Limit    int
	Offset   int
}
