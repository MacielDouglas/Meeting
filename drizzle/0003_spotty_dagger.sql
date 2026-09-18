CREATE TYPE "public"."schedule_exception_type" AS ENUM('no_meeting', 'modified_time', 'special_meeting');--> statement-breakpoint
CREATE TYPE "public"."special_event_type" AS ENUM('regional_assembly', 'circuit_assembly', 'representative_assembly', 'memorial', 'circuit_visit', 'special_talk', 'other');--> statement-breakpoint
CREATE TABLE "meeting_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"midweek_day" integer DEFAULT 2 NOT NULL,
	"midweek_time" text DEFAULT '19:30' NOT NULL,
	"weekend_day" integer DEFAULT 0 NOT NULL,
	"weekend_time" text DEFAULT '10:00' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_exceptions" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "schedule_exception_type" NOT NULL,
	"date" text NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "special_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "special_event_type" NOT NULL,
	"title" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text,
	"start_time" text NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
