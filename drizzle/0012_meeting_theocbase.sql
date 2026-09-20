ALTER TABLE "meeting_programs" ADD COLUMN "exception_type" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "meeting_programs" ADD COLUMN "exception_label" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "meeting_assignments" ADD COLUMN "classroom" text DEFAULT 'A' NOT NULL;--> statement-breakpoint
ALTER TABLE "meeting_assignments" ADD COLUMN "study" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "meeting_assignments" ADD COLUMN "source" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "meeting_assignments" ADD COLUMN "notes" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "meeting_assignments" ADD COLUMN "speaker_congregation" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "unavailable" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "unavailable_notes" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "last_assignment_at" timestamp;--> statement-breakpoint
CREATE TABLE "outside_speakers" ("id" text PRIMARY KEY NOT NULL,"name" text NOT NULL,"congregation" text DEFAULT '' NOT NULL,"talk_number" integer,"talk_theme" text DEFAULT '' NOT NULL,"phone" text DEFAULT '' NOT NULL,"notes" text DEFAULT '' NOT NULL,"created_at" timestamp DEFAULT now() NOT NULL,"updated_at" timestamp DEFAULT now() NOT NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "meeting_assignments_program_part_unique" ON "meeting_assignments" USING btree ("program_id","part_key");--> statement-breakpoint
CREATE INDEX "persons_name_idx" ON "persons" USING btree ("first_name","last_name");--> statement-breakpoint
