const formatTimestamp = () => new Date().toISOString();

const formatPrefix = (level) => `[${formatTimestamp()}] [${level}]`;

const stringifyUnknown = (value) => {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export const toError = (error, fallbackMessage = "Unknown error") => {
  if (error instanceof Error) {
    return error;
  }

  const normalizedMessage = stringifyUnknown(error).trim();
  return new Error(normalizedMessage || fallbackMessage);
};

const logWithStream = (stream, level, message, details = undefined) => {
  const prefix = formatPrefix(level);

  if (details === undefined) {
    stream(`${prefix} ${message}`);
    return;
  }

  stream(`${prefix} ${message}`, details);
};

export const logger = {
  info: (message, details) => logWithStream(console.log, "INFO", message, details),
  success: (message, details) => logWithStream(console.log, "SUCCESS", message, details),
  warn: (message, details) => logWithStream(console.warn, "WARN", message, details),
  error: (message, error, details) => {
    const prefix = formatPrefix("ERROR");
    if (details !== undefined) {
      console.error(`${prefix} ${message}`, details);
    } else {
      console.error(`${prefix} ${message}`);
    }

    if (error !== undefined) {
      const normalizedError = toError(error);
      if (normalizedError.stack) {
        console.error(normalizedError.stack);
      } else {
        console.error(normalizedError.message || String(normalizedError));
      }
    }
  }
};
