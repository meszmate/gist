package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/meszmate/smartnotes/internal/db"
	"github.com/meszmate/smartnotes/internal/models"
)

type AnalyticsRepository struct {
	db *db.DB
}

func NewAnalyticsRepository(db *db.DB) *AnalyticsRepository {
	return &AnalyticsRepository{db: db}
}

// Study Sessions
func (r *AnalyticsRepository) CreateSession(ctx context.Context, session *models.StudySession) error {
	query := `
		INSERT INTO study_sessions (user_id, material_id, session_type, cards_reviewed, score, duration_seconds)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at`

	return r.db.QueryRowContext(ctx, query,
		session.UserID, session.MaterialID, session.SessionType,
		session.CardsReviewed, session.Score, session.DurationSecs,
	).Scan(&session.ID, &session.CreatedAt)
}

func (r *AnalyticsRepository) GetSessionsByUser(ctx context.Context, userID uuid.UUID, limit int) ([]models.StudySession, error) {
	query := `
		SELECT id, user_id, material_id, session_type, cards_reviewed, score, duration_seconds, created_at
		FROM study_sessions WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2`

	rows, err := r.db.QueryContext(ctx, query, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []models.StudySession
	for rows.Next() {
		var s models.StudySession
		if err := rows.Scan(
			&s.ID, &s.UserID, &s.MaterialID, &s.SessionType,
			&s.CardsReviewed, &s.Score, &s.DurationSecs, &s.CreatedAt,
		); err != nil {
			return nil, err
		}
		sessions = append(sessions, s)
	}
	return sessions, rows.Err()
}

// Daily Activity
func (r *AnalyticsRepository) GetOrCreateDailyActivity(ctx context.Context, userID uuid.UUID, date time.Time) (*models.DailyActivity, error) {
	dateStr := date.Format("2006-01-02")

	query := `
		INSERT INTO daily_activity (user_id, date)
		VALUES ($1, $2)
		ON CONFLICT (user_id, date) DO UPDATE SET updated_at = NOW()
		RETURNING id, user_id, date, cards_reviewed, quizzes_completed, study_time_seconds, streak_count`

	activity := &models.DailyActivity{}
	err := r.db.QueryRowContext(ctx, query, userID, dateStr).Scan(
		&activity.ID, &activity.UserID, &activity.Date,
		&activity.CardsReviewed, &activity.QuizzesComplete,
		&activity.StudyTimeSecs, &activity.StreakCount,
	)
	if err != nil {
		return nil, err
	}
	return activity, nil
}

func (r *AnalyticsRepository) IncrementCardsReviewed(ctx context.Context, userID uuid.UUID, count int) error {
	query := `
		INSERT INTO daily_activity (user_id, date, cards_reviewed)
		VALUES ($1, CURRENT_DATE, $2)
		ON CONFLICT (user_id, date)
		DO UPDATE SET cards_reviewed = daily_activity.cards_reviewed + $2`

	_, err := r.db.ExecContext(ctx, query, userID, count)
	return err
}

func (r *AnalyticsRepository) IncrementQuizzesCompleted(ctx context.Context, userID uuid.UUID) error {
	query := `
		INSERT INTO daily_activity (user_id, date, quizzes_completed)
		VALUES ($1, CURRENT_DATE, 1)
		ON CONFLICT (user_id, date)
		DO UPDATE SET quizzes_completed = daily_activity.quizzes_completed + 1`

	_, err := r.db.ExecContext(ctx, query, userID)
	return err
}

func (r *AnalyticsRepository) AddStudyTime(ctx context.Context, userID uuid.UUID, seconds int) error {
	query := `
		INSERT INTO daily_activity (user_id, date, study_time_seconds)
		VALUES ($1, CURRENT_DATE, $2)
		ON CONFLICT (user_id, date)
		DO UPDATE SET study_time_seconds = daily_activity.study_time_seconds + $2`

	_, err := r.db.ExecContext(ctx, query, userID, seconds)
	return err
}

func (r *AnalyticsRepository) UpdateStreak(ctx context.Context, userID uuid.UUID, streak int) error {
	query := `
		UPDATE daily_activity SET streak_count = $2
		WHERE user_id = $1 AND date = CURRENT_DATE`

	_, err := r.db.ExecContext(ctx, query, userID, streak)
	return err
}

// Analytics Queries
func (r *AnalyticsRepository) GetOverview(ctx context.Context, userID uuid.UUID) (*models.AnalyticsOverview, error) {
	overview := &models.AnalyticsOverview{}

	// Count materials
	r.db.QueryRowContext(ctx,
		"SELECT COUNT(*) FROM study_materials WHERE user_id = $1", userID,
	).Scan(&overview.TotalMaterials)

	// Count flashcards
	r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM flashcards f
		 JOIN study_materials sm ON f.study_material_id = sm.id
		 WHERE sm.user_id = $1`, userID,
	).Scan(&overview.TotalFlashcards)

	// Count quiz questions
	r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM quiz_questions q
		 JOIN study_materials sm ON q.study_material_id = sm.id
		 WHERE sm.user_id = $1`, userID,
	).Scan(&overview.TotalQuizzes)

	// Today's cards reviewed
	r.db.QueryRowContext(ctx,
		`SELECT COALESCE(cards_reviewed, 0) FROM daily_activity
		 WHERE user_id = $1 AND date = CURRENT_DATE`, userID,
	).Scan(&overview.CardsReviewedToday)

	// Current streak
	overview.CurrentStreak = r.calculateCurrentStreak(ctx, userID)
	overview.LongestStreak = r.calculateLongestStreak(ctx, userID)

	// Average quiz score
	r.db.QueryRowContext(ctx,
		`SELECT COALESCE(AVG(score), 0) FROM study_sessions
		 WHERE user_id = $1 AND session_type = 'quiz' AND score IS NOT NULL`, userID,
	).Scan(&overview.AverageQuizScore)

	// Total study time
	r.db.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(study_time_seconds), 0) FROM daily_activity WHERE user_id = $1`, userID,
	).Scan(&overview.TotalStudyTime)

	// Due cards count
	r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM flashcards f
		 JOIN study_materials sm ON f.study_material_id = sm.id
		 WHERE sm.user_id = $1 AND f.next_review_date <= CURRENT_DATE`, userID,
	).Scan(&overview.DueCardsCount)

	return overview, nil
}

func (r *AnalyticsRepository) GetStreakData(ctx context.Context, userID uuid.UUID, days int) (*models.StreakData, error) {
	data := &models.StreakData{
		CurrentStreak: r.calculateCurrentStreak(ctx, userID),
		LongestStreak: r.calculateLongestStreak(ctx, userID),
	}

	// Get last active date
	var lastActive sql.NullTime
	r.db.QueryRowContext(ctx,
		`SELECT MAX(date) FROM daily_activity WHERE user_id = $1 AND cards_reviewed > 0`, userID,
	).Scan(&lastActive)
	if lastActive.Valid {
		data.LastActive = &lastActive.Time
	}

	// Get calendar data
	query := `
		SELECT date, cards_reviewed, study_time_seconds
		FROM daily_activity
		WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '1 day' * $2
		ORDER BY date`

	rows, err := r.db.QueryContext(ctx, query, userID, days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var day models.CalendarDay
		var date time.Time
		var studyTimeSecs int
		if err := rows.Scan(&date, &day.CardsReviewed, &studyTimeSecs); err != nil {
			return nil, err
		}
		day.Date = date.Format("2006-01-02")
		day.StudyTimeMins = studyTimeSecs / 60
		day.HasActivity = day.CardsReviewed > 0 || studyTimeSecs > 0
		data.Calendar = append(data.Calendar, day)
	}

	return data, rows.Err()
}

func (r *AnalyticsRepository) GetProgressData(ctx context.Context, userID uuid.UUID) (*models.ProgressData, error) {
	data := &models.ProgressData{}

	// Weekly cards reviewed
	cardsQuery := `
		SELECT date, cards_reviewed FROM daily_activity
		WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '7 days'
		ORDER BY date`

	rows, err := r.db.QueryContext(ctx, cardsQuery, userID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var stat models.DayStats
		var date time.Time
		if err := rows.Scan(&date, &stat.Value); err != nil {
			rows.Close()
			return nil, err
		}
		stat.Date = date.Format("2006-01-02")
		data.WeeklyCards = append(data.WeeklyCards, stat)
	}
	rows.Close()

	// Weekly quiz scores
	scoresQuery := `
		SELECT DATE(created_at), AVG(score) FROM study_sessions
		WHERE user_id = $1 AND session_type = 'quiz' AND score IS NOT NULL
		AND created_at >= CURRENT_DATE - INTERVAL '7 days'
		GROUP BY DATE(created_at)
		ORDER BY DATE(created_at)`

	rows, err = r.db.QueryContext(ctx, scoresQuery, userID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var stat models.DayStats
		var date time.Time
		if err := rows.Scan(&date, &stat.Value); err != nil {
			rows.Close()
			return nil, err
		}
		stat.Date = date.Format("2006-01-02")
		data.WeeklyScores = append(data.WeeklyScores, stat)
	}
	rows.Close()

	// Weekly study time
	timeQuery := `
		SELECT date, study_time_seconds / 60 FROM daily_activity
		WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '7 days'
		ORDER BY date`

	rows, err = r.db.QueryContext(ctx, timeQuery, userID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var stat models.DayStats
		var date time.Time
		if err := rows.Scan(&date, &stat.Value); err != nil {
			rows.Close()
			return nil, err
		}
		stat.Date = date.Format("2006-01-02")
		data.WeeklyTime = append(data.WeeklyTime, stat)
	}
	rows.Close()

	return data, nil
}

func (r *AnalyticsRepository) GetWeakTopics(ctx context.Context, userID uuid.UUID, limit int) ([]models.WeakTopic, error) {
	query := `
		SELECT sm.id, sm.title, AVG(f.ease_factor), COUNT(CASE WHEN f.next_review_date <= CURRENT_DATE THEN 1 END)
		FROM study_materials sm
		JOIN flashcards f ON sm.id = f.study_material_id
		WHERE sm.user_id = $1
		GROUP BY sm.id, sm.title
		HAVING AVG(f.ease_factor) < 2.5 OR COUNT(CASE WHEN f.next_review_date <= CURRENT_DATE THEN 1 END) > 0
		ORDER BY AVG(f.ease_factor) ASC
		LIMIT $2`

	rows, err := r.db.QueryContext(ctx, query, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var topics []models.WeakTopic
	for rows.Next() {
		var t models.WeakTopic
		if err := rows.Scan(&t.MaterialID, &t.MaterialName, &t.AvgEaseFactor, &t.DueCards); err != nil {
			return nil, err
		}
		topics = append(topics, t)
	}
	return topics, rows.Err()
}

func (r *AnalyticsRepository) calculateCurrentStreak(ctx context.Context, userID uuid.UUID) int {
	query := `
		WITH RECURSIVE streak AS (
			SELECT date, 1 as streak_days
			FROM daily_activity
			WHERE user_id = $1 AND date = CURRENT_DATE AND (cards_reviewed > 0 OR study_time_seconds > 0)

			UNION ALL

			SELECT da.date, s.streak_days + 1
			FROM daily_activity da
			JOIN streak s ON da.date = s.date - INTERVAL '1 day'
			WHERE da.user_id = $1 AND (da.cards_reviewed > 0 OR da.study_time_seconds > 0)
		)
		SELECT COALESCE(MAX(streak_days), 0) FROM streak`

	var streak int
	r.db.QueryRowContext(ctx, query, userID).Scan(&streak)
	return streak
}

func (r *AnalyticsRepository) calculateLongestStreak(ctx context.Context, userID uuid.UUID) int {
	// Simplified longest streak calculation
	query := `
		SELECT COALESCE(MAX(streak_count), 0) FROM daily_activity WHERE user_id = $1`

	var streak int
	r.db.QueryRowContext(ctx, query, userID).Scan(&streak)
	return streak
}
