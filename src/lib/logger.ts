/**
 * Structured JSON logger.
 * - Outputs JSON in production for log aggregation.
 * - Outputs human-readable lines in development.
 * - Never logs PII: passwords, tokens, full emails, or registration numbers.
 *   Log user IDs or request IDs instead.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

const isDev = process.env.NODE_ENV === 'development';

function write(entry: LogEntry): void {
  const output = isDev
    ? `[${entry.level.toUpperCase()}] ${entry.message} ${JSON.stringify(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        Object.fromEntries(Object.entries(entry).filter(([k, _v]) => !['level', 'message', 'timestamp'].includes(k)))
      )}`
    : JSON.stringify(entry);

  switch (entry.level) {
    case 'error':
      console.error(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    default:
      console.log(output);
  }
}

function createEntry(level: LogLevel, message: string, meta?: Record<string, unknown>): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>) {
    if (isDev) write(createEntry('debug', message, meta));
  },
  info(message: string, meta?: Record<string, unknown>) {
    write(createEntry('info', message, meta));
  },
  warn(message: string, meta?: Record<string, unknown>) {
    write(createEntry('warn', message, meta));
  },
  error(message: string, meta?: Record<string, unknown>) {
    write(createEntry('error', message, meta));
  },
};
