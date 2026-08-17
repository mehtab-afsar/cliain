import { defineConfig, env } from "prisma/config";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local present — fall back to whatever is already in the environment.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
