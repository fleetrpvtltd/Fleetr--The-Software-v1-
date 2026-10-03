import express from "express";
import { apiRouter } from "../src/backend/apiRoutes";
import { dbStore } from "../src/backend/dbService";

const app = express();

app.use(express.json());

// Ensure dbStore initialization on cold-starts
app.use(async (req, res, next) => {
  if (!dbStore.isInitialized) {
    try {
      await dbStore.init();
    } catch (err) {
      console.error("Cold-start dbStore init error:", err);
    }
  }
  next();
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", gateway: "Vercel Serverless" });
});

// Mount API router for both /api subpath and root subpath
app.use("/api", apiRouter);
app.use("/", apiRouter);

export default app;

