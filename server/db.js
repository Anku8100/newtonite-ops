
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.ts";

console.log(
  "Database URL loaded:",
  Boolean(process.env.DATABASE_URL)
);

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

export const prisma = new PrismaClient({ adapter });
