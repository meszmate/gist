-- Drop contacts + contact_groups. Superseded by the courses feature —
-- classroom memberships + join codes cover every real use of the old
-- address book. No rollback: if you want contacts back, restore from
-- a snapshot and revert this migration file.

DROP TABLE IF EXISTS "contacts";--> statement-breakpoint
DROP TABLE IF EXISTS "contact_groups";
