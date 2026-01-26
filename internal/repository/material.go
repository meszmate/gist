package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/meszmate/smartnotes/internal/db"
	"github.com/meszmate/smartnotes/internal/models"
)

type MaterialRepository struct {
	db *db.DB
}

func NewMaterialRepository(db *db.DB) *MaterialRepository {
	return &MaterialRepository{db: db}
}

func (r *MaterialRepository) Create(ctx context.Context, material *models.StudyMaterial) error {
	query := `
		INSERT INTO study_materials (user_id, folder_id, title, summary, original_content, difficulty, is_public)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at, updated_at`

	return r.db.QueryRowContext(ctx, query,
		material.UserID, material.FolderID, material.Title, material.Summary,
		material.OriginalContent, material.Difficulty, material.IsPublic,
	).Scan(&material.ID, &material.CreatedAt, &material.UpdatedAt)
}

func (r *MaterialRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.StudyMaterial, error) {
	query := `
		SELECT id, user_id, folder_id, title, summary, original_content, difficulty,
		       is_public, share_token, created_at, updated_at
		FROM study_materials WHERE id = $1`

	m := &models.StudyMaterial{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&m.ID, &m.UserID, &m.FolderID, &m.Title, &m.Summary,
		&m.OriginalContent, &m.Difficulty, &m.IsPublic, &m.ShareToken,
		&m.CreatedAt, &m.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return m, nil
}

func (r *MaterialRepository) GetByShareToken(ctx context.Context, token string) (*models.StudyMaterial, error) {
	query := `
		SELECT id, user_id, folder_id, title, summary, original_content, difficulty,
		       is_public, share_token, created_at, updated_at
		FROM study_materials WHERE share_token = $1 AND is_public = true`

	m := &models.StudyMaterial{}
	err := r.db.QueryRowContext(ctx, query, token).Scan(
		&m.ID, &m.UserID, &m.FolderID, &m.Title, &m.Summary,
		&m.OriginalContent, &m.Difficulty, &m.IsPublic, &m.ShareToken,
		&m.CreatedAt, &m.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return m, nil
}

func (r *MaterialRepository) List(ctx context.Context, filter models.MaterialsFilter) ([]models.StudyMaterial, int, error) {
	var conditions []string
	var args []interface{}
	argIdx := 1

	conditions = append(conditions, fmt.Sprintf("user_id = $%d", argIdx))
	args = append(args, filter.UserID)
	argIdx++

	if filter.FolderID != nil {
		conditions = append(conditions, fmt.Sprintf("folder_id = $%d", argIdx))
		args = append(args, *filter.FolderID)
		argIdx++
	}

	if filter.Search != "" {
		conditions = append(conditions, fmt.Sprintf("(title ILIKE $%d OR summary ILIKE $%d)", argIdx, argIdx))
		args = append(args, "%"+filter.Search+"%")
		argIdx++
	}

	whereClause := strings.Join(conditions, " AND ")

	// Count total
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM study_materials WHERE %s", whereClause)
	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Get items
	query := fmt.Sprintf(`
		SELECT id, user_id, folder_id, title, summary, original_content, difficulty,
		       is_public, share_token, created_at, updated_at
		FROM study_materials WHERE %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d`, whereClause, argIdx, argIdx+1)

	limit := filter.Limit
	if limit <= 0 {
		limit = 20
	}
	args = append(args, limit, filter.Offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var materials []models.StudyMaterial
	for rows.Next() {
		var m models.StudyMaterial
		if err := rows.Scan(
			&m.ID, &m.UserID, &m.FolderID, &m.Title, &m.Summary,
			&m.OriginalContent, &m.Difficulty, &m.IsPublic, &m.ShareToken,
			&m.CreatedAt, &m.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		materials = append(materials, m)
	}

	return materials, total, rows.Err()
}

func (r *MaterialRepository) Update(ctx context.Context, material *models.StudyMaterial) error {
	query := `
		UPDATE study_materials
		SET title = $2, folder_id = $3, is_public = $4, share_token = $5
		WHERE id = $1`

	_, err := r.db.ExecContext(ctx, query,
		material.ID, material.Title, material.FolderID, material.IsPublic, material.ShareToken,
	)
	return err
}

func (r *MaterialRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM study_materials WHERE id = $1", id)
	return err
}

func (r *MaterialRepository) SetShareToken(ctx context.Context, id uuid.UUID, token string) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE study_materials SET share_token = $2, is_public = true WHERE id = $1",
		id, token,
	)
	return err
}

func (r *MaterialRepository) CountByUser(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx,
		"SELECT COUNT(*) FROM study_materials WHERE user_id = $1",
		userID,
	).Scan(&count)
	return count, err
}

// Flashcards
func (r *MaterialRepository) CreateFlashcard(ctx context.Context, fc *models.Flashcard) error {
	query := `
		INSERT INTO flashcards (study_material_id, question, answer)
		VALUES ($1, $2, $3)
		RETURNING id, ease_factor, interval_days, repetitions, next_review_date, created_at, updated_at`

	return r.db.QueryRowContext(ctx, query,
		fc.StudyMaterialID, fc.Question, fc.Answer,
	).Scan(&fc.ID, &fc.EaseFactor, &fc.IntervalDays, &fc.Repetitions,
		&fc.NextReviewDate, &fc.CreatedAt, &fc.UpdatedAt)
}

func (r *MaterialRepository) CreateFlashcards(ctx context.Context, materialID uuid.UUID, cards []models.Flashcard) error {
	for i := range cards {
		cards[i].StudyMaterialID = materialID
		if err := r.CreateFlashcard(ctx, &cards[i]); err != nil {
			return err
		}
	}
	return nil
}

func (r *MaterialRepository) GetFlashcards(ctx context.Context, materialID uuid.UUID) ([]models.Flashcard, error) {
	query := `
		SELECT id, study_material_id, question, answer, ease_factor, interval_days,
		       repetitions, next_review_date, last_reviewed_at, created_at, updated_at
		FROM flashcards WHERE study_material_id = $1
		ORDER BY created_at`

	rows, err := r.db.QueryContext(ctx, query, materialID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cards []models.Flashcard
	for rows.Next() {
		var fc models.Flashcard
		if err := rows.Scan(
			&fc.ID, &fc.StudyMaterialID, &fc.Question, &fc.Answer,
			&fc.EaseFactor, &fc.IntervalDays, &fc.Repetitions,
			&fc.NextReviewDate, &fc.LastReviewedAt, &fc.CreatedAt, &fc.UpdatedAt,
		); err != nil {
			return nil, err
		}
		cards = append(cards, fc)
	}
	return cards, rows.Err()
}

func (r *MaterialRepository) GetFlashcardByID(ctx context.Context, id uuid.UUID) (*models.Flashcard, error) {
	query := `
		SELECT id, study_material_id, question, answer, ease_factor, interval_days,
		       repetitions, next_review_date, last_reviewed_at, created_at, updated_at
		FROM flashcards WHERE id = $1`

	fc := &models.Flashcard{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&fc.ID, &fc.StudyMaterialID, &fc.Question, &fc.Answer,
		&fc.EaseFactor, &fc.IntervalDays, &fc.Repetitions,
		&fc.NextReviewDate, &fc.LastReviewedAt, &fc.CreatedAt, &fc.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return fc, nil
}

func (r *MaterialRepository) UpdateFlashcard(ctx context.Context, fc *models.Flashcard) error {
	query := `
		UPDATE flashcards
		SET question = $2, answer = $3, ease_factor = $4, interval_days = $5,
		    repetitions = $6, next_review_date = $7, last_reviewed_at = $8
		WHERE id = $1`

	_, err := r.db.ExecContext(ctx, query,
		fc.ID, fc.Question, fc.Answer, fc.EaseFactor, fc.IntervalDays,
		fc.Repetitions, fc.NextReviewDate, fc.LastReviewedAt,
	)
	return err
}

func (r *MaterialRepository) DeleteFlashcard(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM flashcards WHERE id = $1", id)
	return err
}

func (r *MaterialRepository) CountFlashcardsByUser(ctx context.Context, userID uuid.UUID) (int, error) {
	query := `
		SELECT COUNT(*) FROM flashcards f
		JOIN study_materials sm ON f.study_material_id = sm.id
		WHERE sm.user_id = $1`
	var count int
	err := r.db.QueryRowContext(ctx, query, userID).Scan(&count)
	return count, err
}

// Quiz questions
func (r *MaterialRepository) CreateQuizQuestion(ctx context.Context, q *models.QuizQuestion) error {
	optionsJSON, err := json.Marshal(q.Options)
	if err != nil {
		return err
	}

	query := `
		INSERT INTO quiz_questions (study_material_id, question, options, correct_answer)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at, updated_at`

	return r.db.QueryRowContext(ctx, query,
		q.StudyMaterialID, q.Question, optionsJSON, q.Correct,
	).Scan(&q.ID, &q.CreatedAt, &q.UpdatedAt)
}

func (r *MaterialRepository) CreateQuizQuestions(ctx context.Context, materialID uuid.UUID, questions []models.QuizQuestion) error {
	for i := range questions {
		questions[i].StudyMaterialID = materialID
		if err := r.CreateQuizQuestion(ctx, &questions[i]); err != nil {
			return err
		}
	}
	return nil
}

func (r *MaterialRepository) GetQuizQuestions(ctx context.Context, materialID uuid.UUID) ([]models.QuizQuestion, error) {
	query := `
		SELECT id, study_material_id, question, options, correct_answer, created_at, updated_at
		FROM quiz_questions WHERE study_material_id = $1
		ORDER BY created_at`

	rows, err := r.db.QueryContext(ctx, query, materialID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var questions []models.QuizQuestion
	for rows.Next() {
		var q models.QuizQuestion
		var optionsJSON []byte
		if err := rows.Scan(
			&q.ID, &q.StudyMaterialID, &q.Question, &optionsJSON, &q.Correct,
			&q.CreatedAt, &q.UpdatedAt,
		); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(optionsJSON, &q.Options); err != nil {
			return nil, err
		}
		questions = append(questions, q)
	}
	return questions, rows.Err()
}

func (r *MaterialRepository) GetQuizQuestionByID(ctx context.Context, id uuid.UUID) (*models.QuizQuestion, error) {
	query := `
		SELECT id, study_material_id, question, options, correct_answer, created_at, updated_at
		FROM quiz_questions WHERE id = $1`

	q := &models.QuizQuestion{}
	var optionsJSON []byte
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&q.ID, &q.StudyMaterialID, &q.Question, &optionsJSON, &q.Correct,
		&q.CreatedAt, &q.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(optionsJSON, &q.Options); err != nil {
		return nil, err
	}
	return q, nil
}

func (r *MaterialRepository) UpdateQuizQuestion(ctx context.Context, q *models.QuizQuestion) error {
	optionsJSON, err := json.Marshal(q.Options)
	if err != nil {
		return err
	}

	query := `
		UPDATE quiz_questions
		SET question = $2, options = $3, correct_answer = $4
		WHERE id = $1`

	_, err = r.db.ExecContext(ctx, query, q.ID, q.Question, optionsJSON, q.Correct)
	return err
}

func (r *MaterialRepository) DeleteQuizQuestion(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM quiz_questions WHERE id = $1", id)
	return err
}

// Tags for materials
func (r *MaterialRepository) SetMaterialTags(ctx context.Context, materialID uuid.UUID, tagIDs []uuid.UUID) error {
	// Delete existing tags
	if _, err := r.db.ExecContext(ctx, "DELETE FROM material_tags WHERE material_id = $1", materialID); err != nil {
		return err
	}

	// Insert new tags
	for _, tagID := range tagIDs {
		_, err := r.db.ExecContext(ctx,
			"INSERT INTO material_tags (material_id, tag_id) VALUES ($1, $2)",
			materialID, tagID,
		)
		if err != nil {
			return err
		}
	}
	return nil
}

func (r *MaterialRepository) GetMaterialTags(ctx context.Context, materialID uuid.UUID) ([]models.Tag, error) {
	query := `
		SELECT t.id, t.user_id, t.name, t.color, t.created_at
		FROM tags t
		JOIN material_tags mt ON t.id = mt.tag_id
		WHERE mt.material_id = $1`

	rows, err := r.db.QueryContext(ctx, query, materialID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []models.Tag
	for rows.Next() {
		var t models.Tag
		if err := rows.Scan(&t.ID, &t.UserID, &t.Name, &t.Color, &t.CreatedAt); err != nil {
			return nil, err
		}
		tags = append(tags, t)
	}
	return tags, rows.Err()
}
