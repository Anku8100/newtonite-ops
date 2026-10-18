import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { prisma } from "./db.js";
import workItemsRouter from "./routes/workItems.js";


dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/work-items", workItemsRouter);


const databaseUrl = process.env.DATABASE_URL;

console.log("DATABASE_URL exists:", Boolean(databaseUrl));
console.log("DATABASE_URL starts correctly:",
  databaseUrl?.startsWith("postgresql://") ||
  databaseUrl?.startsWith("postgres://")
);



app.get("/", (req, res) => {
  res.json({
    message: "Newtonite Operations API is running!",
  });
});

app.get("/api/health/db", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      message: "Database connected successfully!",
    });
  } catch (error) {
    console.error("Database connection error:", error.message);

    res.status(500).json({
      message: "Database connection failed",
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});