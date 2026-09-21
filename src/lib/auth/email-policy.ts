/** Email confirmation is required in production once a mail provider is configured. */
export function emailVerificationRequired() {
  return process.env.NODE_ENV === "production" && Boolean(process.env.RESEND_API_KEY);
}
