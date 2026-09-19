CREATE INDEX "cleaning_assignments_person_date_idx" ON "cleaning_assignments" USING btree ("person_id","assignment_date");--> statement-breakpoint
CREATE INDEX "cleaning_assignments_program_idx" ON "cleaning_assignments" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "cleaning_programs_type_period_idx" ON "cleaning_programs" USING btree ("type_key","start_date","end_date");
