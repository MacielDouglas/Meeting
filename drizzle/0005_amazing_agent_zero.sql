CREATE TYPE "public"."content_language" AS ENUM('es', 'pt', 'en');--> statement-breakpoint
CREATE TABLE "songs" (
	"id" text PRIMARY KEY NOT NULL,
	"number" integer NOT NULL,
	"theme" text NOT NULL,
	"language" "content_language" DEFAULT 'es' NOT NULL,
	"source" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "talk_outlines" (
	"id" text PRIMARY KEY NOT NULL,
	"number" integer NOT NULL,
	"theme" text NOT NULL,
	"language" "content_language" DEFAULT 'es' NOT NULL,
	"source" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
