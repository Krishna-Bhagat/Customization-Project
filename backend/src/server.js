import app from "./app.js";
import { assertRequiredEnv, env } from "./config/env.js";
import { initializeDatabase } from "./db/init.js";

const bootstrap = async () => {
  try {
    assertRequiredEnv();
    await initializeDatabase();

    app.listen(env.port, () => {
      console.log(`Backend running on port ${env.port}`);
    });
  } catch (error) {
    console.error("Failed to start backend:", error.message);
    process.exit(1);
  }
};

bootstrap();
