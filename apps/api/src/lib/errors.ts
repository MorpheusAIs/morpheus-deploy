import { HTTPException } from 'hono/http-exception';

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'INSUFFICIENT_FUNDS'
  | 'INVALID_CONFIG'
  | 'DEPLOYMENT_FAILED'
  | 'PROVIDER_ERROR'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR';

const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  INSUFFICIENT_FUNDS: 402,
  INVALID_CONFIG: 400,
  DEPLOYMENT_FAILED: 500,
  PROVIDER_ERROR: 502,
  VALIDATION_ERROR: 400,
  INTERNAL_ERROR: 500,
};

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.status = ERROR_STATUS_MAP[code];
    this.details = details;
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }

  toHTTPException(): HTTPException {
    return new HTTPException(this.status as 400, {
      message: this.message,
      cause: this,
    });
  }
}

export function unauthorized(message = 'Unauthorized'): ApiError {
  return new ApiError('UNAUTHORIZED', message);
}

export function forbidden(message = 'Forbidden'): ApiError {
  return new ApiError('FORBIDDEN', message);
}

export function notFound(resource = 'Resource'): ApiError {
  return new ApiError('NOT_FOUND', `${resource} not found`);
}

export function rateLimited(retryAfter?: number): ApiError {
  return new ApiError('RATE_LIMITED', 'Rate limit exceeded', { retryAfter });
}

export function insufficientFunds(required: number, available: number, currency: string): ApiError {
  return new ApiError('INSUFFICIENT_FUNDS', 'Insufficient funds for this operation', {
    required,
    available,
    currency,
  });
}

export function validationError(message: string, fields?: Record<string, string>): ApiError {
  return new ApiError('VALIDATION_ERROR', message, fields ? { fields } : undefined);
}

export function deploymentFailed(message: string, details?: Record<string, unknown>): ApiError {
  return new ApiError('DEPLOYMENT_FAILED', message, details);
}
