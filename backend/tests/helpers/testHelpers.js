const jwt = require("jsonwebtoken");

/** Signs a JWT with the test-only secret from tests/setupEnv.js. */
function signTestToken(userId, overrides = {}) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
    ...overrides,
  });
}

/** Signs an already-expired JWT (exp set in the past). */
function signExpiredTestToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: -10, // seconds — already expired
  });
}

/** Minimal fake Mongo-style ObjectId string (24 hex chars). */
function fakeId(seed = "1") {
  return seed.repeat(24).slice(0, 24);
}

function makeUser(overrides = {}) {
  return {
    _id: fakeId("a"),
    name: "Test User",
    email: "test@example.com",
    role: "Job Seeker",
    ...overrides,
  };
}

module.exports = {
  signTestToken,
  signExpiredTestToken,
  fakeId,
  makeUser,
};
