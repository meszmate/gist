ALTER TABLE "study_materials" ADD COLUMN "forked_from_id" uuid;--> statement-breakpoint
ALTER TABLE "study_materials" ADD CONSTRAINT "study_materials_forked_from_id_study_materials_id_fk" FOREIGN KEY ("forked_from_id") REFERENCES "public"."study_materials"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "study_materials_forked_from_idx" ON "study_materials" USING btree ("forked_from_id");
