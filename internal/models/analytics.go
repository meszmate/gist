package models

import (
	"time"

	"github.com/google/uuid"
)

type SessionType string

const (
	SessionFlashcardReview SessionType = "flashcard_review"
	SessionQuiz            SessionType = "quiz"
	SessionPomodoro        SessionType = "pomodoro"
)

type StudySession struct {
	ID            uuid.UUID   `json:"id"`
	UserID        uuid.UUID   `json:"user_id"`
	MaterialID    *uuid.UUID  `json:"material_id,omitempty"`
	SessionType   SessionType `json:"session_type"`
	CardsReviewed int         `json:"cards_reviewed"`
	Score         *float64    `json:"score,omitempty"`
	DurationSecs  int         `json:"duration_seconds"`
	CreatedAt     time.Time   `json:"created_at"`
}

type DailyActivity struct {
	ID              uuid.UUID `json:"id"`
	UserID          uuid.UUID `json:"user_id"`
	Date            time.Time `json:"date"`
	CardsReviewed   int       `json:"cards_reviewed"`
	QuizzesComplete int       `json:"quizzes_completed"`
	StudyTimeSecs   int       `json:"study_time_seconds"`
	StreakCount     int       `json:"streak_count"`
}

type AnalyticsOverview struct {
	TotalMaterials    int     `json:"total_materials"`
	TotalFlashcards   int     `json:"total_flashcards"`
	TotalQuizzes      int     `json:"total_quizzes"`
	CardsReviewedToday int    `json:"cards_reviewed_today"`
	CurrentStreak     int     `json:"current_streak"`
	LongestStreak     int     `json:"longest_streak"`
	AverageQuizScore  float64 `json:"average_quiz_score"`
	TotalStudyTime    int     `json:"total_study_time_seconds"`
	DueCardsCount     int     `json:"due_cards_count"`
}

type StreakData struct {
	CurrentStreak int                 `json:"current_streak"`
	LongestStreak int                 `json:"longest_streak"`
	LastActive    *time.Time          `json:"last_active"`
	Calendar      []CalendarDay       `json:"calendar"`
}

type CalendarDay struct {
	Date          string `json:"date"` // YYYY-MM-DD format
	CardsReviewed int    `json:"cards_reviewed"`
	StudyTimeMins int    `json:"study_time_mins"`
	HasActivity   bool   `json:"has_activity"`
}

type ProgressData struct {
	WeeklyCards  []DayStats `json:"weekly_cards"`
	WeeklyScores []DayStats `json:"weekly_scores"`
	WeeklyTime   []DayStats `json:"weekly_time"`
}

type DayStats struct {
	Date  string  `json:"date"`
	Value float64 `json:"value"`
}

type WeakTopic struct {
	MaterialID   uuid.UUID `json:"material_id"`
	MaterialName string    `json:"material_name"`
	AvgEaseFactor float64  `json:"avg_ease_factor"`
	DueCards     int       `json:"due_cards"`
}
