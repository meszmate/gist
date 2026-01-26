package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/meszmate/smartnotes/internal/db"
	"github.com/meszmate/smartnotes/internal/models"
)

type SRSRepository struct {
	db *db.DB
}

func NewSRSRepository(db *db.DB) *SRSRepository {
	return &SRSRepository{db: db}
}

func (r *SRSRepository) GetDueCards(ctx context.Context, userID uuid.UUID, limit int) ([]models.Flashcard, error) {
	query := `
		SELECT f.id, f.study_material_id, f.question, f.answer, f.ease_factor,
		       f.interval_days, f.repetitions, f.next_review_date, f.last_reviewed_at,
		       f.created_at, f.updated_at
		FROM flashcards f
		JOIN study_materials sm ON f.study_material_id = sm.id
		WHERE sm.user_id = $1 AND f.next_review_date <= CURRENT_DATE
		ORDER BY f.next_review_date, f.ease_factor ASC
		LIMIT $2`

	rows, err := r.db.QueryContext(ctx, query, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cards []models.Flashcard
	for rows.Next() {
		var fc models.Flashcard
		if err := rows.Scan(
			&fc.ID, &fc.StudyMaterialID, &fc.Question, &fc.Answer, &fc.EaseFactor,
			&fc.IntervalDays, &fc.Repetitions, &fc.NextReviewDate, &fc.LastReviewedAt,
			&fc.CreatedAt, &fc.UpdatedAt,
		); err != nil {
			return nil, err
		}
		cards = append(cards, fc)
	}
	return cards, rows.Err()
}

func (r *SRSRepository) GetDueCardsByMaterial(ctx context.Context, userID uuid.UUID, materialID uuid.UUID, limit int) ([]models.Flashcard, error) {
	query := `
		SELECT f.id, f.study_material_id, f.question, f.answer, f.ease_factor,
		       f.interval_days, f.repetitions, f.next_review_date, f.last_reviewed_at,
		       f.created_at, f.updated_at
		FROM flashcards f
		JOIN study_materials sm ON f.study_material_id = sm.id
		WHERE sm.user_id = $1 AND f.study_material_id = $2 AND f.next_review_date <= CURRENT_DATE
		ORDER BY f.next_review_date, f.ease_factor ASC
		LIMIT $3`

	rows, err := r.db.QueryContext(ctx, query, userID, materialID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cards []models.Flashcard
	for rows.Next() {
		var fc models.Flashcard
		if err := rows.Scan(
			&fc.ID, &fc.StudyMaterialID, &fc.Question, &fc.Answer, &fc.EaseFactor,
			&fc.IntervalDays, &fc.Repetitions, &fc.NextReviewDate, &fc.LastReviewedAt,
			&fc.CreatedAt, &fc.UpdatedAt,
		); err != nil {
			return nil, err
		}
		cards = append(cards, fc)
	}
	return cards, rows.Err()
}

func (r *SRSRepository) CountDueCards(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM flashcards f
		 JOIN study_materials sm ON f.study_material_id = sm.id
		 WHERE sm.user_id = $1 AND f.next_review_date <= CURRENT_DATE`,
		userID,
	).Scan(&count)
	return count, err
}

func (r *SRSRepository) CountDueCardsByMaterial(ctx context.Context, materialID uuid.UUID) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx,
		"SELECT COUNT(*) FROM flashcards WHERE study_material_id = $1 AND next_review_date <= CURRENT_DATE",
		materialID,
	).Scan(&count)
	return count, err
}

func (r *SRSRepository) UpdateCardSRS(ctx context.Context, cardID uuid.UUID, easeFactor float64, interval int, repetitions int, nextReview time.Time) error {
	query := `
		UPDATE flashcards
		SET ease_factor = $2, interval_days = $3, repetitions = $4,
		    next_review_date = $5, last_reviewed_at = NOW()
		WHERE id = $1`

	_, err := r.db.ExecContext(ctx, query, cardID, easeFactor, interval, repetitions, nextReview)
	return err
}

func (r *SRSRepository) GetSRSStats(ctx context.Context, userID uuid.UUID) (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// Total cards
	var totalCards int
	r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM flashcards f
		 JOIN study_materials sm ON f.study_material_id = sm.id
		 WHERE sm.user_id = $1`, userID,
	).Scan(&totalCards)
	stats["total_cards"] = totalCards

	// Due today
	var dueToday int
	r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM flashcards f
		 JOIN study_materials sm ON f.study_material_id = sm.id
		 WHERE sm.user_id = $1 AND f.next_review_date <= CURRENT_DATE`, userID,
	).Scan(&dueToday)
	stats["due_today"] = dueToday

	// New cards (never reviewed)
	var newCards int
	r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM flashcards f
		 JOIN study_materials sm ON f.study_material_id = sm.id
		 WHERE sm.user_id = $1 AND f.repetitions = 0`, userID,
	).Scan(&newCards)
	stats["new_cards"] = newCards

	// Learned cards
	var learnedCards int
	r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM flashcards f
		 JOIN study_materials sm ON f.study_material_id = sm.id
		 WHERE sm.user_id = $1 AND f.repetitions > 0`, userID,
	).Scan(&learnedCards)
	stats["learned_cards"] = learnedCards

	// Mature cards (interval > 21 days)
	var matureCards int
	r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM flashcards f
		 JOIN study_materials sm ON f.study_material_id = sm.id
		 WHERE sm.user_id = $1 AND f.interval_days > 21`, userID,
	).Scan(&matureCards)
	stats["mature_cards"] = matureCards

	// Average ease factor
	var avgEase float64
	r.db.QueryRowContext(ctx,
		`SELECT COALESCE(AVG(f.ease_factor), 2.5) FROM flashcards f
		 JOIN study_materials sm ON f.study_material_id = sm.id
		 WHERE sm.user_id = $1`, userID,
	).Scan(&avgEase)
	stats["average_ease"] = avgEase

	// Cards reviewed today
	var reviewedToday int
	r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM flashcards f
		 JOIN study_materials sm ON f.study_material_id = sm.id
		 WHERE sm.user_id = $1 AND DATE(f.last_reviewed_at) = CURRENT_DATE`, userID,
	).Scan(&reviewedToday)
	stats["reviewed_today"] = reviewedToday

	return stats, nil
}
