package models

import (
	"time"

	"github.com/google/uuid"
)

type Flashcard struct {
	ID              uuid.UUID  `json:"id,omitempty"`
	StudyMaterialID uuid.UUID  `json:"study_material_id,omitempty"`
	Question        string     `json:"question" json_schema:"A concise question that tests a key concept from the text."`
	Answer          string     `json:"answer" json_schema:"A clear, correct answer to the flashcard question."`
	// SM-2 SRS fields
	EaseFactor     float64    `json:"ease_factor,omitempty"`
	IntervalDays   int        `json:"interval_days,omitempty"`
	Repetitions    int        `json:"repetitions,omitempty"`
	NextReviewDate *time.Time `json:"next_review_date,omitempty"`
	LastReviewedAt *time.Time `json:"last_reviewed_at,omitempty"`
	CreatedAt      time.Time  `json:"created_at,omitempty"`
	UpdatedAt      time.Time  `json:"updated_at,omitempty"`
}

type CreateFlashcardRequest struct {
	Question string `json:"question" binding:"required"`
	Answer   string `json:"answer" binding:"required"`
}

type UpdateFlashcardRequest struct {
	Question *string `json:"question"`
	Answer   *string `json:"answer"`
}

// SRS Rating for review
type SRSRating int

const (
	RatingAgain SRSRating = 0 // Complete blackout
	RatingHard  SRSRating = 1 // Hard to remember
	RatingGood  SRSRating = 2 // Good recall
	RatingEasy  SRSRating = 3 // Easy recall
)

type ReviewRequest struct {
	CardID uuid.UUID `json:"card_id" binding:"required"`
	Rating SRSRating `json:"rating" binding:"required"`
}

type DueCardsResponse struct {
	Cards      []Flashcard `json:"cards"`
	TotalDue   int         `json:"total_due"`
	MaterialID *uuid.UUID  `json:"material_id,omitempty"`
}
