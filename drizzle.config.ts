import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({
  path: ".env.local",
});

const postgresUrl = process.env.POSTGRES_URL;
if (!postgresUrl) {
  console.warn(
    "[drizzle.config] POSTGRES_URL is not set – drizzle-kit commands will fail without a database URL"
  );
}

export default defineConfig({
  dbCredentials: {
    url: postgresUrl ?? "",
  },
  dialect: "postgresql",
  out: "./lib/db/migrations",
  schema: "./lib/db/schema.ts",
});
