import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: [
    "./src/features/auth/infrastructure/user-schema.ts",
    "./src/features/people/infrastructure/person-schema.ts",
  ],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
});
