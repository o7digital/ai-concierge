import "dotenv/config";
import express from "express";
import cors from "cors";

import chatRouter from "./routes/chat.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use("/chat", chatRouter);

app.listen(port, () => {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("[server] OPENAI_API_KEY is missing; /chat will return 503.");
  }
  console.log(`[server] AI Concierge listening on port ${port}`);
});
