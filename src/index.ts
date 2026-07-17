import Fastify from "fastify";
import { registerRoutes } from "./routes/index.js";
import { startScheduler, stopScheduler } from "./services/scheduler.js";
import { migrate, closeDatabase } from "./db/database.js";
import { validateEnv } from "./config/env.js";

async function main(): Promise<void> {
  // Validate environment
  validateEnv();

  // Initialize database
  console.log("[DB] Running migrations...");
  await migrate();
  console.log("[DB] Migrations complete");

  // Start scheduler
  startScheduler();

  // Create Fastify server
  const app = Fastify({ logger: true });

  // Register CORS (allow all origins for development)
  await app.register(import("@fastify/cors"), { origin: true });

  // Register routes
  registerRoutes(app);

  // Graceful shutdown
  const shutdown = async () => {
    console.log("\n[Server] Shutting down...");
    stopScheduler();
    await closeDatabase();
    await app.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Start listening
  const env = process.env;
  const port = Number(env.PORT) || 3000;
  const host = env.HOST || "0.0.0.0";

  try {
    await app.listen({ port, host });
    console.log(`[Server] Running at http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
