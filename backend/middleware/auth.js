const { verifyToken } = require("../utils/token");
const User = require("../models/User");

const getTokenFromHeader = (req) => {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    return header.split(" ")[1];
  }
  return null;
};

// Requires a valid token, blocks the request otherwise
const requireAuth = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Please log in.",
      });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired session. Please log in again.",
    });
  }
};

// Attaches the user if a valid token is present, but never blocks
const attachUserIfPresent = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);
    if (!token) return next();

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);
    if (user) req.user = user;
  } catch (error) {
    // ignore invalid token in optional mode
  }
  next();
};

module.exports = { requireAuth, attachUserIfPresent };
