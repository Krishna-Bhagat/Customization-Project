import app from "./app.js";
import { assertRequiredEnv, env } from "./config/env.js";
import { initializeDatabase } from "./db/init.js";
import { logger, toError } from "./utils/logger.js";

const registerProcessErrorHandlers = () => {
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection detected", toError(reason));
  });

  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception detected", toError(error));
    process.exit(1);
  });
};

const bootstrap = async () => {
  try {
    logger.info("Bootstrapping backend service", {
      nodeEnv: env.nodeEnv,
      port: env.port
    });

    assertRequiredEnv();
    logger.success("Environment variables validated");

    await initializeDatabase();
    logger.success("Database initialized successfully");

    const server = app.listen(env.port, () => {
      logger.success(`Backend running on port ${env.port}`);
    });

    server.on("error", (error) => {
      logger.error("HTTP server runtime error", error);
      process.exit(1);
    });
  } catch (error) {
    logger.error("Failed to start backend", toError(error, "Startup failed"));
    process.exit(1);
  }
};

registerProcessErrorHandlers();
bootstrap();
