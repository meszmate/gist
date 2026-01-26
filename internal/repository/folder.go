package repository

import (
	"context"
	"database/sql"

	"github.com/google/uuid"
	"github.com/meszmate/smartnotes/internal/db"
	"github.com/meszmate/smartnotes/internal/models"
)

type FolderRepository struct {
	db *db.DB
}

func NewFolderRepository(db *db.DB) *FolderRepository {
	return &FolderRepository{db: db}
}

func (r *FolderRepository) Create(ctx context.Context, folder *models.Folder) error {
	query := `
		INSERT INTO folders (user_id, parent_id, name, color)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at, updated_at`

	return r.db.QueryRowContext(ctx, query,
		folder.UserID, folder.ParentID, folder.Name, folder.Color,
	).Scan(&folder.ID, &folder.CreatedAt, &folder.UpdatedAt)
}

func (r *FolderRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Folder, error) {
	query := `
		SELECT id, user_id, parent_id, name, color, created_at, updated_at
		FROM folders WHERE id = $1`

	f := &models.Folder{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&f.ID, &f.UserID, &f.ParentID, &f.Name, &f.Color, &f.CreatedAt, &f.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return f, nil
}

func (r *FolderRepository) ListByUser(ctx context.Context, userID uuid.UUID) ([]models.Folder, error) {
	query := `
		SELECT id, user_id, parent_id, name, color, created_at, updated_at
		FROM folders WHERE user_id = $1
		ORDER BY name`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var folders []models.Folder
	for rows.Next() {
		var f models.Folder
		if err := rows.Scan(
			&f.ID, &f.UserID, &f.ParentID, &f.Name, &f.Color, &f.CreatedAt, &f.UpdatedAt,
		); err != nil {
			return nil, err
		}
		folders = append(folders, f)
	}
	return folders, rows.Err()
}

func (r *FolderRepository) ListByParent(ctx context.Context, userID uuid.UUID, parentID *uuid.UUID) ([]models.Folder, error) {
	var query string
	var args []interface{}

	if parentID == nil {
		query = `
			SELECT id, user_id, parent_id, name, color, created_at, updated_at
			FROM folders WHERE user_id = $1 AND parent_id IS NULL
			ORDER BY name`
		args = []interface{}{userID}
	} else {
		query = `
			SELECT id, user_id, parent_id, name, color, created_at, updated_at
			FROM folders WHERE user_id = $1 AND parent_id = $2
			ORDER BY name`
		args = []interface{}{userID, *parentID}
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var folders []models.Folder
	for rows.Next() {
		var f models.Folder
		if err := rows.Scan(
			&f.ID, &f.UserID, &f.ParentID, &f.Name, &f.Color, &f.CreatedAt, &f.UpdatedAt,
		); err != nil {
			return nil, err
		}
		folders = append(folders, f)
	}
	return folders, rows.Err()
}

func (r *FolderRepository) GetFolderTree(ctx context.Context, userID uuid.UUID) ([]models.Folder, error) {
	// Get all folders for user
	folders, err := r.ListByUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Build tree structure
	folderMap := make(map[uuid.UUID]*models.Folder)
	var roots []models.Folder

	for i := range folders {
		folderMap[folders[i].ID] = &folders[i]
	}

	for i := range folders {
		if folders[i].ParentID == nil {
			roots = append(roots, folders[i])
		} else {
			parent, ok := folderMap[*folders[i].ParentID]
			if ok {
				parent.Children = append(parent.Children, folders[i])
			}
		}
	}

	return roots, nil
}

func (r *FolderRepository) Update(ctx context.Context, folder *models.Folder) error {
	query := `
		UPDATE folders
		SET name = $2, parent_id = $3, color = $4
		WHERE id = $1`

	_, err := r.db.ExecContext(ctx, query,
		folder.ID, folder.Name, folder.ParentID, folder.Color,
	)
	return err
}

func (r *FolderRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM folders WHERE id = $1", id)
	return err
}

// Tags
type TagRepository struct {
	db *db.DB
}

func NewTagRepository(db *db.DB) *TagRepository {
	return &TagRepository{db: db}
}

func (r *TagRepository) Create(ctx context.Context, tag *models.Tag) error {
	query := `
		INSERT INTO tags (user_id, name, color)
		VALUES ($1, $2, $3)
		RETURNING id, created_at`

	return r.db.QueryRowContext(ctx, query,
		tag.UserID, tag.Name, tag.Color,
	).Scan(&tag.ID, &tag.CreatedAt)
}

func (r *TagRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Tag, error) {
	query := `SELECT id, user_id, name, color, created_at FROM tags WHERE id = $1`

	t := &models.Tag{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&t.ID, &t.UserID, &t.Name, &t.Color, &t.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return t, nil
}

func (r *TagRepository) ListByUser(ctx context.Context, userID uuid.UUID) ([]models.Tag, error) {
	query := `SELECT id, user_id, name, color, created_at FROM tags WHERE user_id = $1 ORDER BY name`

	rows, err := r.db.QueryContext(ctx, query, userID)
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

func (r *TagRepository) Update(ctx context.Context, tag *models.Tag) error {
	query := `UPDATE tags SET name = $2, color = $3 WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, tag.ID, tag.Name, tag.Color)
	return err
}

func (r *TagRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM tags WHERE id = $1", id)
	return err
}
