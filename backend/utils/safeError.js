/**
 * Returns a message safe to send in an API response.
 * - In development/test, the real error message is returned (useful for
 *   debugging).
 * - In production, only the provided generic fallback is ever returned —
 *   raw error messages can accidentally contain internal details (DB
 *   driver errors, file paths, provider error text) that shouldn't reach
 *   the client.
 */
function safeErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (process.env.NODE_ENV !== "production" && error?.message) {
    return error.message;
  }
  return fallback;
}

module.exports = { safeErrorMessage };
