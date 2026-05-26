import { logger, toError } from "../utils/logger.js";

export const errorHandler = (error, req, res, next) => {
  const normalizedError = toError(error, "Internal server error");
  const status = Number(error?.status) || 500;

  logger.error(
    `Request failed: ${req.method} ${req.originalUrl} -> ${status}`,
    normalizedError,
    { ip: req.ip }
  );

  res.status(status).json({
    message: normalizedError.message || "Internal server error"
  });
};
