CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" varchar(255) NOT NULL,
	"provider" varchar(255) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" varchar(255),
	"scope" varchar(255),
	"id_token" text,
	"session_state" varchar(255),
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);

CREATE TABLE "contact_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"group_id" uuid,
	"has_account" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "flashcard_study_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"user_id" uuid,
	"guest_email" varchar(255),
	"cards_studied" integer NOT NULL,
	"cards_correct" integer NOT NULL,
	"time_spent_seconds" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "flashcards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"study_material_id" uuid NOT NULL,
	"front" text NOT NULL,
	"back" text NOT NULL,
	"interval" integer DEFAULT 0,
	"repetitions" integer DEFAULT 0,
	"ease_factor" numeric(4, 2) DEFAULT '2.50',
	"next_review" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"color" varchar(20),
	"parent_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "grading_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"study_material_id" uuid NOT NULL,
	"grading_type" varchar(20) DEFAULT 'percentage',
	"pass_threshold" numeric(5, 2) DEFAULT '60.0',
	"letter_grades" jsonb,
	"show_grade_on_completion" boolean DEFAULT true,
	"show_point_values" boolean DEFAULT false,
	"partial_credit_enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "grading_configs_study_material_id_unique" UNIQUE("study_material_id")
);

CREATE TABLE "lesson_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"user_id" uuid,
	"guest_identifier" varchar(255),
	"current_step_index" integer DEFAULT 0 NOT NULL,
	"completed_step_ids" jsonb DEFAULT '[]'::jsonb,
	"answers" jsonb DEFAULT '{}'::jsonb,
	"step_results" jsonb DEFAULT '{}'::jsonb,
	"total_steps" integer DEFAULT 0 NOT NULL,
	"interactive_steps" integer DEFAULT 0 NOT NULL,
	"correct_count" integer DEFAULT 0 NOT NULL,
	"score" numeric(5, 2),
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"time_spent_seconds" integer
);

CREATE TABLE "lesson_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"step_type" varchar(50) NOT NULL,
	"content" jsonb NOT NULL,
	"answer_data" jsonb,
	"explanation" text,
	"hint" text,
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"study_material_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"order" integer DEFAULT 0 NOT NULL,
	"settings" jsonb,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "question_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"config_schema" jsonb NOT NULL,
	"answer_schema" jsonb NOT NULL,
	"is_system" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "question_types_slug_unique" UNIQUE("slug")
);

CREATE TABLE "quiz_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"study_material_id" uuid NOT NULL,
	"user_id" uuid,
	"guest_email" varchar(255),
	"participant_name" varchar(255),
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"score" numeric(5, 2),
	"answers" jsonb,
	"answers_data" jsonb,
	"points_earned" numeric(7, 2),
	"points_possible" numeric(7, 2),
	"grade" varchar(10),
	"question_results" jsonb,
	"time_spent_seconds" integer,
	"attempt_number" integer DEFAULT 1
);

CREATE TABLE "quiz_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"study_material_id" uuid NOT NULL,
	"question" text NOT NULL,
	"question_type" varchar(50) DEFAULT 'multiple_choice' NOT NULL,
	"question_config" jsonb DEFAULT '{}'::jsonb,
	"correct_answer_data" jsonb,
	"points" numeric(5, 2) DEFAULT '1.0',
	"order" integer,
	"options" jsonb,
	"correct_answer" integer,
	"explanation" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE "quiz_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"study_material_id" uuid NOT NULL,
	"time_limit_seconds" integer,
	"require_signin" boolean DEFAULT false,
	"allowed_emails" text[],
	"max_attempts" integer,
	"shuffle_questions" boolean DEFAULT true,
	"show_correct_answers" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quiz_settings_study_material_id_unique" UNIQUE("study_material_id")
);

CREATE TABLE "resource_access_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"email" varchar(255),
	"user_id" uuid,
	"access_type" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "saved_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"permission" varchar(20) DEFAULT 'read',
	"saved_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "sessions" (
	"session_token" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp NOT NULL
);

CREATE TABLE "study_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"folder_id" uuid,
	"title" varchar(255) NOT NULL,
	"description" text,
	"source_content" text,
	"summary" text,
	"difficulty" varchar(50),
	"share_token" varchar(64),
	"is_public" boolean DEFAULT false,
	"available_from" timestamp,
	"available_to" timestamp,
	"visible_sections" jsonb DEFAULT '{"flashcards":true,"summary":true,"quiz":true,"lessons":true}'::jsonb,
	"require_auth_to_interact" boolean DEFAULT false,
	"allowed_viewer_emails" text[],
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "study_materials_share_token_unique" UNIQUE("share_token")
);

CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"email_verified" timestamp,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE "verification_tokens" (
	"identifier" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);

ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "contact_groups" ADD CONSTRAINT "contact_groups_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_group_id_contact_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."contact_groups"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "flashcard_study_logs" ADD CONSTRAINT "flashcard_study_logs_resource_id_study_materials_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."study_materials"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "flashcard_study_logs" ADD CONSTRAINT "flashcard_study_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_study_material_id_study_materials_id_fk" FOREIGN KEY ("study_material_id") REFERENCES "public"."study_materials"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "folders" ADD CONSTRAINT "folders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "grading_configs" ADD CONSTRAINT "grading_configs_study_material_id_study_materials_id_fk" FOREIGN KEY ("study_material_id") REFERENCES "public"."study_materials"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "lesson_attempts" ADD CONSTRAINT "lesson_attempts_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "lesson_attempts" ADD CONSTRAINT "lesson_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "lesson_steps" ADD CONSTRAINT "lesson_steps_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_study_material_id_study_materials_id_fk" FOREIGN KEY ("study_material_id") REFERENCES "public"."study_materials"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_study_material_id_study_materials_id_fk" FOREIGN KEY ("study_material_id") REFERENCES "public"."study_materials"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_study_material_id_study_materials_id_fk" FOREIGN KEY ("study_material_id") REFERENCES "public"."study_materials"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "quiz_settings" ADD CONSTRAINT "quiz_settings_study_material_id_study_materials_id_fk" FOREIGN KEY ("study_material_id") REFERENCES "public"."study_materials"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "resource_access_logs" ADD CONSTRAINT "resource_access_logs_resource_id_study_materials_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."study_materials"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "resource_access_logs" ADD CONSTRAINT "resource_access_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "saved_resources" ADD CONSTRAINT "saved_resources_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "saved_resources" ADD CONSTRAINT "saved_resources_resource_id_study_materials_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."study_materials"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "study_materials" ADD CONSTRAINT "study_materials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "study_materials" ADD CONSTRAINT "study_materials_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "contact_groups_teacher_idx" ON "contact_groups" USING btree ("teacher_id");
CREATE INDEX "contacts_teacher_idx" ON "contacts" USING btree ("teacher_id");
CREATE INDEX "contacts_email_idx" ON "contacts" USING btree ("email");
CREATE INDEX "flashcard_study_logs_resource_idx" ON "flashcard_study_logs" USING btree ("resource_id");
CREATE INDEX "flashcard_study_logs_user_idx" ON "flashcard_study_logs" USING btree ("user_id");
CREATE INDEX "flashcards_material_idx" ON "flashcards" USING btree ("study_material_id");
CREATE INDEX "flashcards_next_review_idx" ON "flashcards" USING btree ("next_review");
CREATE INDEX "lesson_attempts_lesson_idx" ON "lesson_attempts" USING btree ("lesson_id");
CREATE INDEX "lesson_attempts_user_idx" ON "lesson_attempts" USING btree ("user_id");
CREATE INDEX "lesson_steps_lesson_idx" ON "lesson_steps" USING btree ("lesson_id");
CREATE INDEX "lesson_steps_order_idx" ON "lesson_steps" USING btree ("lesson_id","order");
CREATE INDEX "lessons_material_idx" ON "lessons" USING btree ("study_material_id");
CREATE INDEX "lessons_order_idx" ON "lessons" USING btree ("study_material_id","order");
CREATE INDEX "question_types_slug_idx" ON "question_types" USING btree ("slug");
CREATE INDEX "quiz_attempts_material_idx" ON "quiz_attempts" USING btree ("study_material_id");
CREATE INDEX "quiz_attempts_user_idx" ON "quiz_attempts" USING btree ("user_id");
CREATE INDEX "quiz_attempts_completed_idx" ON "quiz_attempts" USING btree ("completed_at");
CREATE INDEX "quiz_questions_material_idx" ON "quiz_questions" USING btree ("study_material_id");
CREATE INDEX "quiz_questions_type_idx" ON "quiz_questions" USING btree ("question_type");
CREATE INDEX "access_logs_resource_idx" ON "resource_access_logs" USING btree ("resource_id");
CREATE INDEX "access_logs_email_idx" ON "resource_access_logs" USING btree ("email");
CREATE INDEX "saved_resources_user_idx" ON "saved_resources" USING btree ("user_id");
CREATE INDEX "saved_resources_resource_idx" ON "saved_resources" USING btree ("resource_id");
CREATE INDEX "study_materials_user_idx" ON "study_materials" USING btree ("user_id");
CREATE INDEX "study_materials_folder_idx" ON "study_materials" USING btree ("folder_id");
CREATE INDEX "study_materials_share_token_idx" ON "study_materials" USING btree ("share_token");