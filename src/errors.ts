// =========================================================================
// YTDL — Custom Error Classes
// =========================================================================

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public readonly field?: string) {
    super(message, 400, "VALIDATION_ERROR");
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404, "NOT_FOUND");
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string, public readonly service: string) {
    super(message, 502, "EXTERNAL_SERVICE_ERROR");
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Too many requests") {
    super(message, 429, "RATE_LIMIT_EXCEEDED");
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export class DownloadError extends AppError {
  constructor(message: string, public readonly originalError?: Error) {
    super(message, 500, "DOWNLOAD_ERROR");
    Object.setPrototypeOf(this, DownloadError.prototype);
  }
}

export class BinaryNotFoundError extends AppError {
  constructor(binary: string) {
    super(`${binary} not found. Install it or place the binary in ./bin/`, 503, "BINARY_NOT_FOUND");
    Object.setPrototypeOf(this, BinaryNotFoundError.prototype);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function handleError(error: unknown): { message: string; statusCode: number; code?: string } {
  if (isAppError(error)) {
    return {
      message: error.message,
      statusCode: error.statusCode,
      code: error.code,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      statusCode: 500,
      code: "INTERNAL_ERROR",
    };
  }

  return {
    message: "An unknown error occurred",
    statusCode: 500,
    code: "UNKNOWN_ERROR",
  };
}