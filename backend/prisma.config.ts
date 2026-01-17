// Prisma configuration for Clothing Shop System
// Uses MySQL database
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // MySQL connection URL from .env
    url: process.env["DATABASE_URL"],
  },
});
