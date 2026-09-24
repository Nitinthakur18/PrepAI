// Test-only environment configuration.
// Deliberately fake values — never real credentials. Jest sets
// NODE_ENV=test automatically, which app.js uses to silence request
// logging and stack traces.
process.env.JWT_SECRET = "test-only-jwt-secret-never-used-in-production";
process.env.JWT_EXPIRES_IN = "7d";
process.env.CLIENT_ORIGIN = "http://localhost:5173";
