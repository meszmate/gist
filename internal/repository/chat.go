package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/meszmate/smartnotes/internal/db"
	"github.com/meszmate/smartnotes/internal/models"
)

type ChatRepository struct {
	db *db.DB
}

func NewChatRepository(db *db.DB) *ChatRepository {
	return &ChatRepository{db: db}
}

func (r *ChatRepository) Create(ctx context.Context, msg *models.ChatMessage) error {
	query := `
		INSERT INTO chat_messages (user_id, study_material_id, role, content)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at`

	return r.db.QueryRowContext(ctx, query,
		msg.UserID, msg.StudyMaterialID, msg.Role, msg.Content,
	).Scan(&msg.ID, &msg.CreatedAt)
}

func (r *ChatRepository) GetByMaterial(ctx context.Context, userID uuid.UUID, materialID uuid.UUID, limit int) ([]models.ChatMessage, error) {
	query := `
		SELECT id, user_id, study_material_id, role, content, created_at
		FROM chat_messages
		WHERE user_id = $1 AND study_material_id = $2
		ORDER BY created_at DESC
		LIMIT $3`

	rows, err := r.db.QueryContext(ctx, query, userID, materialID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []models.ChatMessage
	for rows.Next() {
		var m models.ChatMessage
		if err := rows.Scan(&m.ID, &m.UserID, &m.StudyMaterialID, &m.Role, &m.Content, &m.CreatedAt); err != nil {
			return nil, err
		}
		messages = append(messages, m)
	}

	// Reverse to get chronological order
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	return messages, rows.Err()
}

func (r *ChatRepository) GetRecentByUser(ctx context.Context, userID uuid.UUID, limit int) ([]models.ChatMessage, error) {
	query := `
		SELECT id, user_id, study_material_id, role, content, created_at
		FROM chat_messages
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2`

	rows, err := r.db.QueryContext(ctx, query, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []models.ChatMessage
	for rows.Next() {
		var m models.ChatMessage
		if err := rows.Scan(&m.ID, &m.UserID, &m.StudyMaterialID, &m.Role, &m.Content, &m.CreatedAt); err != nil {
			return nil, err
		}
		messages = append(messages, m)
	}
	return messages, rows.Err()
}

func (r *ChatRepository) DeleteByMaterial(ctx context.Context, userID uuid.UUID, materialID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx,
		"DELETE FROM chat_messages WHERE user_id = $1 AND study_material_id = $2",
		userID, materialID,
	)
	return err
}

func (r *ChatRepository) CountTodayByUser(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM chat_messages
		 WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE AND role = 'user'`,
		userID,
	).Scan(&count)
	return count, err
}
