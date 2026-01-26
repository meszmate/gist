package models

import (
	"time"

	"github.com/google/uuid"
)

type QuizQuestion struct {
	ID              uuid.UUID `json:"id,omitempty"`
	StudyMaterialID uuid.UUID `json:"study_material_id,omitempty"`
	Question        string    `json:"question" json_schema:"The text of the quiz question."`
	Options         []string  `json:"options" json_schema:"A list of 3–5 possible answers for the question."`
	Correct         string    `json:"correct" json_schema:"The text of the correct answer, exactly matching one of the options."`
	CreatedAt       time.Time `json:"created_at,omitempty"`
	UpdatedAt       time.Time `json:"updated_at,omitempty"`
}

type CreateQuizQuestionRequest struct {
	Question string   `json:"question" binding:"required"`
	Options  []string `json:"options" binding:"required,min=2,max=5"`
	Correct  string   `json:"correct" binding:"required"`
}

type UpdateQuizQuestionRequest struct {
	Question *string   `json:"question"`
	Options  *[]string `json:"options"`
	Correct  *string   `json:"correct"`
}

type QuizSubmission struct {
	MaterialID uuid.UUID         `json:"material_id" binding:"required"`
	Answers    map[string]string `json:"answers" binding:"required"` // question_id -> selected_answer
}

type QuizResult struct {
	TotalQuestions int     `json:"total_questions"`
	CorrectAnswers int     `json:"correct_answers"`
	Score          float64 `json:"score"` // percentage
	Results        []QuestionResult `json:"results"`
}

type QuestionResult struct {
	QuestionID    uuid.UUID `json:"question_id"`
	UserAnswer    string    `json:"user_answer"`
	CorrectAnswer string    `json:"correct_answer"`
	IsCorrect     bool      `json:"is_correct"`
}
