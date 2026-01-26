package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/meszmate/smartnotes/internal/db"
	"github.com/meszmate/smartnotes/internal/models"
)

type UserRepository struct {
	db *db.DB
}

func NewUserRepository(db *db.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(ctx context.Context, user *models.User) error {
	query := `
		INSERT INTO users (google_id, email, name, avatar_url, theme, locale)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at`

	return r.db.QueryRowContext(ctx, query,
		user.GoogleID, user.Email, user.Name, user.AvatarURL, user.Theme, user.Locale,
	).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
}

func (r *UserRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	query := `
		SELECT id, google_id, email, name, avatar_url, theme, locale, created_at, updated_at
		FROM users WHERE id = $1`

	user := &models.User{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&user.ID, &user.GoogleID, &user.Email, &user.Name, &user.AvatarURL,
		&user.Theme, &user.Locale, &user.CreatedAt, &user.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (r *UserRepository) GetByGoogleID(ctx context.Context, googleID string) (*models.User, error) {
	query := `
		SELECT id, google_id, email, name, avatar_url, theme, locale, created_at, updated_at
		FROM users WHERE google_id = $1`

	user := &models.User{}
	err := r.db.QueryRowContext(ctx, query, googleID).Scan(
		&user.ID, &user.GoogleID, &user.Email, &user.Name, &user.AvatarURL,
		&user.Theme, &user.Locale, &user.CreatedAt, &user.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `
		SELECT id, google_id, email, name, avatar_url, theme, locale, created_at, updated_at
		FROM users WHERE email = $1`

	user := &models.User{}
	err := r.db.QueryRowContext(ctx, query, email).Scan(
		&user.ID, &user.GoogleID, &user.Email, &user.Name, &user.AvatarURL,
		&user.Theme, &user.Locale, &user.CreatedAt, &user.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (r *UserRepository) Update(ctx context.Context, user *models.User) error {
	query := `
		UPDATE users
		SET email = $2, name = $3, avatar_url = $4, theme = $5, locale = $6
		WHERE id = $1`

	_, err := r.db.ExecContext(ctx, query,
		user.ID, user.Email, user.Name, user.AvatarURL, user.Theme, user.Locale,
	)
	return err
}

func (r *UserRepository) UpdatePreferences(ctx context.Context, userID uuid.UUID, prefs models.UserPreferences) error {
	query := `UPDATE users SET theme = $2, locale = $3 WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, userID, prefs.Theme, prefs.Locale)
	return err
}

func (r *UserRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM users WHERE id = $1", id)
	return err
}

// Usage tracking
func (r *UserRepository) GetUsage(ctx context.Context, userID uuid.UUID, date time.Time) (*models.UserUsage, error) {
	query := `
		SELECT id, user_id, date, generations_count, tokens_used, chat_messages_count
		FROM user_usage WHERE user_id = $1 AND date = $2`

	usage := &models.UserUsage{}
	err := r.db.QueryRowContext(ctx, query, userID, date.Format("2006-01-02")).Scan(
		&usage.ID, &usage.UserID, &usage.Date,
		&usage.GenerationsCount, &usage.TokensUsed, &usage.ChatMessagesCount,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return usage, nil
}

func (r *UserRepository) GetOrCreateUsage(ctx context.Context, userID uuid.UUID, date time.Time) (*models.UserUsage, error) {
	usage, err := r.GetUsage(ctx, userID, date)
	if err != nil {
		return nil, err
	}
	if usage != nil {
		return usage, nil
	}

	// Create new usage record
	query := `
		INSERT INTO user_usage (user_id, date)
		VALUES ($1, $2)
		ON CONFLICT (user_id, date) DO NOTHING
		RETURNING id, user_id, date, generations_count, tokens_used, chat_messages_count`

	usage = &models.UserUsage{}
	err = r.db.QueryRowContext(ctx, query, userID, date.Format("2006-01-02")).Scan(
		&usage.ID, &usage.UserID, &usage.Date,
		&usage.GenerationsCount, &usage.TokensUsed, &usage.ChatMessagesCount,
	)
	if err == sql.ErrNoRows {
		return r.GetUsage(ctx, userID, date)
	}
	if err != nil {
		return nil, err
	}
	return usage, nil
}

func (r *UserRepository) IncrementGenerations(ctx context.Context, userID uuid.UUID, tokens int) error {
	query := `
		INSERT INTO user_usage (user_id, date, generations_count, tokens_used)
		VALUES ($1, CURRENT_DATE, 1, $2)
		ON CONFLICT (user_id, date)
		DO UPDATE SET generations_count = user_usage.generations_count + 1,
		              tokens_used = user_usage.tokens_used + $2`

	_, err := r.db.ExecContext(ctx, query, userID, tokens)
	return err
}

func (r *UserRepository) IncrementChatMessages(ctx context.Context, userID uuid.UUID) error {
	query := `
		INSERT INTO user_usage (user_id, date, chat_messages_count)
		VALUES ($1, CURRENT_DATE, 1)
		ON CONFLICT (user_id, date)
		DO UPDATE SET chat_messages_count = user_usage.chat_messages_count + 1`

	_, err := r.db.ExecContext(ctx, query, userID)
	return err
}
