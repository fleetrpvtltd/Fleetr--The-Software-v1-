/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { apiRouter } from "./src/backend/apiRoutes";
import { dbStore } from "./src/backend/dbService";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Initialize dbStore with persistent Firestore content in the background so it doesn't block server startup
  dbStore.init().then(() => {
    console.log("Firestore dbStore initialization completed successfully.");
  }).catch((err) => {
    console.error("Firestore dbStore background initialization failed:", err);
  });

  // Parse JSON payloads
  app.use(express.json());

  // Ensure dbStore is populated before processing API requests
  app.use(async (req, res, next) => {
    if (req.path.startsWith('/api') && !dbStore.isInitialized) {
      try {
        await dbStore.init();
      } catch (err) {
        console.error('Cold-start dbStore init error:', err);
      }
    }
    next();
  });

  // Mount API router
  app.use("/api", apiRouter);

  // Health endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server connected to Express middleware");
  } else {
    // Serve build files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Production server configured with static build delivery");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Fleetr Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start Fleetr server:", err);
});
