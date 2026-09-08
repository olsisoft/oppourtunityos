/**
 * English strings — section "validation". Keys are referenced as "validation.<key>".
 * Zod schemas (src/domain/schemas.ts) use these keys as their messages; forms
 * render field errors with t(message), so a key and a legacy sentence both work.
 */
export const validation = {
  required: "This field is required",
  tooShort: "Use at least 3 characters",
  nameRequired: "Name is required",
  email: "Enter a valid email",
  passwordRequired: "Enter your password",
  passwordMin: "Use at least 8 characters",
  excerptRequired: "Paste the quote, note or excerpt",
  /** Top-level message of an action whose input failed validation. */
  checkHighlighted: "Check the highlighted fields.",
  checkFields: "Check the fields.",
  invalidInput: "Invalid input",
} as const;
