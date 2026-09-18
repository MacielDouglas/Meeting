CREATE TYPE "public"."cleaning_program_status" AS ENUM('draft', 'confirmed', 'archived');--> statement-breakpoint
CREATE TABLE "cleaning_programs" (
	"id" text PRIMARY KEY NOT NULL,
	"type_key" "cleaning_type_key" NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"status" "cleaning_program_status" DEFAULT 'draft' NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "cleaning_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"program_id" text NOT NULL,
	"assignment_date" text NOT NULL,
	"sector_key" text NOT NULL,
	"sector_name" text NOT NULL,
	"person_id" text,
	"person_name" text DEFAULT '' NOT NULL,
	"is_family" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "cleaning_programs" ADD CONSTRAINT "cleaning_programs_type_key_cleaning_types_key_fk" FOREIGN KEY ("type_key") REFERENCES "public"."cleaning_types"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cleaning_programs" ADD CONSTRAINT "cleaning_programs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cleaning_assignments" ADD CONSTRAINT "cleaning_assignments_program_id_cleaning_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."cleaning_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cleaning_assignments" ADD CONSTRAINT "cleaning_assignments_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE set null ON UPDATE no action;