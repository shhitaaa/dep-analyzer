import "dotenv/config";
import express from "express";
import rateLimit from "express-rate-limit";
import { analyzeRouter } from "./routes/analyze";
import cors from "cors";

export const app = express();

app.use(express.json());
app.use(cors());

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many requests, please try again later." },
});
if (process.env.NODE_ENV !== "test") {
  app.use(limiter);
}

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/analyze", analyzeRouter);