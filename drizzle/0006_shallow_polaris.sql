CREATE TABLE "watchtower_articles" (
	"id" text PRIMARY KEY NOT NULL,
	"issue_id" text NOT NULL,
	"week_start" text,
	"week_end" text,
	"week_label" text NOT NULL,
	"title" text NOT NULL,
	"opening_song" integer,
	"closing_song" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watchtower_issues" (
	"id" text PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"name" text NOT NULL,
	"language" "content_language" DEFAULT 'es' NOT NULL,
	"year" integer,
	"issue_number" integer,
	"source" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "watchtower_articles" ADD CONSTRAINT "watchtower_articles_issue_id_watchtower_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."watchtower_issues"("id") ON DELETE cascade ON UPDATE no action;