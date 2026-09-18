CREATE TYPE "public"."cleaning_assignment_mode" AS ENUM('person', 'family', 'group');--> statement-breakpoint
CREATE TYPE "public"."cleaning_type_key" AS ENUM('per_meeting', 'weekly', 'general');--> statement-breakpoint
CREATE TYPE "public"."required_sex" AS ENUM('any', 'male', 'female');--> statement-breakpoint
CREATE TABLE "cleaning_sectors" (
	"id" text PRIMARY KEY NOT NULL,
	"cleaning_type_key" "cleaning_type_key" NOT NULL,
	"key" text,
	"name" text NOT NULL,
	"task" text DEFAULT '' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"people_count" integer,
	"required_sex" "required_sex" DEFAULT 'any' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cleaning_types" (
	"id" text PRIMARY KEY NOT NULL,
	"key" "cleaning_type_key" NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"assignment_mode" "cleaning_assignment_mode" DEFAULT 'person' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cleaning_types_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "designation_sectors" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text,
	"name" text NOT NULL,
	"person_flag" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"people_count" integer,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "designation_slots" (
	"id" text PRIMARY KEY NOT NULL,
	"sector_id" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "designation_slots" ADD CONSTRAINT "designation_slots_sector_id_designation_sectors_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."designation_sectors"("id") ON DELETE cascade ON UPDATE no action;