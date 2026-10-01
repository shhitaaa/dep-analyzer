import "dotenv/config";
import express from "express";
import rateLimit from "express-rate-limit";
import { analyzeRouter } from "./routes/analyze";
import cors from "cors";

export const app = express();
app.set("trust proxy", 1);

app.use(express.json());
const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:5173",
  ].filter(Boolean) as string[];

app.use(cors({ origin: allowedOrigins }));

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