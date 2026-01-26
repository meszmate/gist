-- Drop triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_user_usage_updated_at ON user_usage;
DROP TRIGGER IF EXISTS update_folders_updated_at ON folders;
DROP TRIGGER IF EXISTS update_study_materials_updated_at ON study_materials;
DROP TRIGGER IF EXISTS update_flashcards_updated_at ON flashcards;
DROP TRIGGER IF EXISTS update_quiz_questions_updated_at ON quiz_questions;
DROP TRIGGER IF EXISTS update_daily_activity_updated_at ON daily_activity;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables in reverse order of creation (respecting foreign keys)
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS daily_activity;
DROP TABLE IF EXISTS study_sessions;
DROP TABLE IF EXISTS material_tags;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS quiz_questions;
DROP TABLE IF EXISTS flashcards;
DROP TABLE IF EXISTS study_materials;
DROP TABLE IF EXISTS folders;
DROP TABLE IF EXISTS user_usage;
DROP TABLE IF EXISTS users;

-- Drop extension
DROP EXTENSION IF EXISTS "uuid-ossp";
