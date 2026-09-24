import path from "node:path";
import { defineConfig } from "vitest/config";

const testDir = path.resolve(__dirname, "test");
const srcDir = path.resolve(__dirname, "src");

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@test\//, replacement: `${testDir}/` },
      { find: /^@\//, replacement: `${srcDir}/` },
    ],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./test/setup.ts"],
  },
});
