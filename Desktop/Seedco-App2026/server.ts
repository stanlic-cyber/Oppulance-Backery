import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { initializeDatabases, closeDatabases } from "./src/lib/db.js";
import apiRoutes from "./src/lib/api-routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const preferredPort = parseInt(process.env.PORT || '3000', 10);

  // Middleware
  app.use(helmet({
    // Vite injects an inline React refresh preamble and websocket client in development.
    contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false,
  }));
  app.use(cors());
  app.use(morgan('combined'));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Initialize databases
  try {
    await initializeDatabases();
  } catch (error) {
    console.error('Failed to initialize databases. Some features may be unavailable:', error);
  }

  // Mount all API routes
  app.use('/api', apiRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log('Vite middleware loaded');
    } catch (error) {
      console.error('Failed to initialize Vite:', error);
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await closeDatabases();
    process.exit(0);
  });

  const listenOnAvailablePort = (port: number) => {
    const server = app.listen(port, "0.0.0.0", () => {
      console.log(`✓ Server running on http://localhost:${port}`);
      console.log(`✓ API endpoints at http://localhost:${port}/api`);
    });

    server.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE" && !process.env.PORT) {
        console.warn(`Port ${port} is already in use; trying port ${port + 1}.`);
        listenOnAvailablePort(port + 1);
        return;
      }

      console.error(`Unable to start server on port ${port}:`, error);
      process.exit(1);
    });
  };

  listenOnAvailablePort(preferredPort);
}

startServer().catch(error => {
  console.error('Server error:', error);
  process.exit(1);
});
