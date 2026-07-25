export class Logger {
  info(...args: unknown[]) {
    console.log("[Luuku]", ...args);
  }

  warn(...args: unknown[]) {
    console.warn("[Luuku]", ...args);
  }

  error(...args: unknown[]) {
    console.error("[Luuku]", ...args);
  }
}

export const logger = new Logger();