ALTER TABLE "special_events" ADD COLUMN IF NOT EXISTS "speaker_name" text;--> statement-breakpoint
ALTER TABLE "special_events" ADD COLUMN IF NOT EXISTS "midweek_theme" text;--> statement-breakpoint
ALTER TABLE "special_events" ADD COLUMN IF NOT EXISTS "public_talk_theme" text;--> statement-breakpoint
ALTER TABLE "special_events" ADD COLUMN IF NOT EXISTS "final_talk_theme" text;
