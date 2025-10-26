import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Load .env.local file for Prisma CLI commands
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
