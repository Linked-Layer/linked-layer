/** Base error carrying an HTTP status + stable machine code. */
export class RecallError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, opts: { status: number; code: string; details?: unknown }) {
    super(message);
    this.name = new.target.name;
    this.status = opts.status;
    this.code = opts.code;
    this.details = opts.details;
  }
}

export class ValidationError extends RecallError {
  constructor(message: string, details?: unknown) {
    super(message, { status: 400, code: "validation_error", details });
  }
}

export class NotFoundError extends RecallError {
  constructor(message = "Not found", details?: unknown) {
    super(message, { status: 404, code: "not_found", details });
  }
}

/** Missing/invalid API key. */
export class AuthError extends RecallError {
  constructor(message = "Unauthorized", details?: unknown) {
    super(message, { status: 401, code: "unauthorized", details });
  }
}

/** Authenticated but lacking the required scope. */
export class ForbiddenError extends RecallError {
  constructor(message = "Forbidden", details?: unknown) {
    super(message, { status: 403, code: "forbidden", details });
  }
}

/** Token gating (hold-to-use) rejection. */
export class GatingError extends RecallError {
  constructor(message = "Insufficient token balance", details?: unknown) {
    super(message, { status: 403, code: "gating_insufficient_balance", details });
  }
}

/** x402 pay-per-call challenge: caller must pay and retry. */
export class PaymentRequiredError extends RecallError {
  constructor(message = "Payment required", details?: unknown) {
    super(message, { status: 402, code: "payment_required", details });
  }
}

export function isRecallError(e: unknown): e is RecallError {
  return e instanceof RecallError;
}
