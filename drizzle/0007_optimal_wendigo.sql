CREATE TABLE "workbook_issues" (
	"id" text PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"name" text NOT NULL,
	"language" "content_language" DEFAULT 'es' NOT NULL,
	"months" text,
	"source" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workbook_parts" (
	"id" text PRIMARY KEY NOT NULL,
	"week_id" text NOT NULL,
	"section" text NOT NULL,
	"number" integer,
	"title" text NOT NULL,
	"duration_minutes" integer,
	"territory" text,
	"assignment" text,
	"content" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workbook_weeks" (
	"id" text PRIMARY KEY NOT NULL,
	"issue_id" text NOT NULL,
	"week_start" text,
	"week_end" text,
	"week_label" text NOT NULL,
	"bible_reading" text,
	"opening_song" integer,
	"middle_song" integer,
	"closing_song" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workbook_parts" ADD CONSTRAINT "workbook_parts_week_id_workbook_weeks_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."workbook_weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workbook_weeks" ADD CONSTRAINT "workbook_weeks_issue_id_workbook_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."workbook_issues"("id") ON DELETE cascade ON UPDATE no action;