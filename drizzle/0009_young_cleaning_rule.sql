ALTER TABLE "persons" ADD COLUMN "young" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "cleaning_sectors" ADD COLUMN "allow_young" boolean DEFAULT true NOT NULL;--> statement-breakpoint
UPDATE "cleaning_sectors" SET "allow_young" = false WHERE "key" IN ('banheiro_masculino', 'banheiro_feminino', 'banheiros');--> statement-breakpoint
UPDATE "cleaning_sectors" SET "required_sex" = 'male' WHERE "key" = 'banheiro_masculino' AND "required_sex" = 'any';--> statement-breakpoint
UPDATE "cleaning_sectors" SET "required_sex" = 'female' WHERE "key" = 'banheiro_feminino' AND "required_sex" = 'any';
