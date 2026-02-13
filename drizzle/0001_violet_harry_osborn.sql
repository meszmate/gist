CREATE TABLE "token_usage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tokens_used" integer NOT NULL,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"operation" varchar(100) NOT NULL,
	"model" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "token_usage_logs" ADD CONSTRAINT "token_usage_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "token_usage_logs_user_idx" ON "token_usage_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "token_usage_logs_user_created_idx" ON "token_usage_logs" USING btree ("user_id","created_at");