import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: [
    "./src/features/auth/infrastructure/user-schema.ts",
    "./src/features/people/infrastructure/person-schema.ts",
    "./src/features/settings/infrastructure/settings-schema.ts",
    "./src/features/cleaning/infrastructure/cleaning-schema.ts",
    "./src/features/designations/infrastructure/designation-schema.ts",
    "./src/features/meeting-content/infrastructure/meeting-content-schema.ts",
  ],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
});
