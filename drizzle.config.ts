import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./server/migrations",
  schema: "./shared/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: "./server/kairo.db",
  },
});
