import { logger } from "../utils/logger.js";

const toDurationMs = (startTimeNs) => {
  const elapsedNs = process.hrtime.bigint() - startTimeNs;
  return Number(elapsedNs) / 1_000_000;
};

const chooseLogLevel = (statusCode) => {
  if (statusCode >= 500) {
    return "error";
  }
  if (statusCode >= 400) {
    return "warn";
  }
  return "success";
};

export const requestLogger = (req, res, next) => {
  const startedAt = process.hrtime.bigint();
  logger.info(`--> ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.headers["user-agent"] || "unknown"
  });

  res.on("finish", () => {
    const durationMs = toDurationMs(startedAt).toFixed(1);
    const message = `<-- ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`;
    const logLevel = chooseLogLevel(res.statusCode);

    if (logLevel === "error") {
      logger.error(message);
      return;
    }

    logger[logLevel](message);
  });

  next();
};
