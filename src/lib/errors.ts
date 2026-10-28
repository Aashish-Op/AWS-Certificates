/**
 * Discriminated union for all server action / route handler results.
 * Never leak stack traces or DB error text to the client.
 */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export function success<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function failure(code: string, message: string): ActionResult<never> {
  return { ok: false, error: { code, message } };
}

/**
 * Application error with a code for programmatic handling.
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** Common error codes */
export const ErrorCodes = {
  VALIDATION: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMITED: 'RATE_LIMITED',
  CONFLICT: 'CONFLICT',
  INTERNAL: 'INTERNAL_ERROR',
} as const;
