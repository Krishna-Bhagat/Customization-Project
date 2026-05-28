const isDev =
  typeof import.meta !== "undefined" &&
  import.meta.env &&
  import.meta.env.DEV;

const write = (method, scope, message, payload) => {
  if (!isDev) {
    return;
  }

  const prefix = `[GiftCraft][${scope}] ${message}`;
  if (payload === undefined) {
    // eslint-disable-next-line no-console
    console[method](prefix);
    return;
  }

  // eslint-disable-next-line no-console
  console[method](prefix, payload);
};

export const debugLog = (scope, message, payload) => {
  write("log", scope, message, payload);
};

export const debugWarn = (scope, message, payload) => {
  write("warn", scope, message, payload);
};

export const debugError = (scope, message, payload) => {
  write("error", scope, message, payload);
};

