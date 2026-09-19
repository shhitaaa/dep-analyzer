import "dotenv/config";
import express from "express";
import { analyzeRouter } from "./routes/analyze";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/analyze", analyzeRouter);

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});