/** Raised when a user reaches for a workspace they do not own. Framework-free so data-layer code stays testable. */
export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}
