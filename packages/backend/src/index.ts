import "dotenv/config";
import express from "express";
import { analyzeRouter } from "./routes/analyze";
import rateLimit from "express-rate-limit";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(express.json());

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per IP
  message: { error: "Too many requests, please try again later." },
});

app.use(limiter);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/analyze", analyzeRouter);

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});