CREATE INDEX "duty_assignments_person_date_idx" ON "duty_assignments" USING btree ("person_id","assignment_date");--> statement-breakpoint
CREATE INDEX "duty_assignments_program_idx" ON "duty_assignments" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "duty_assignments_date_idx" ON "duty_assignments" USING btree ("assignment_date");--> statement-breakpoint
CREATE INDEX "cleaning_assignments_date_idx" ON "cleaning_assignments" USING btree ("assignment_date");
