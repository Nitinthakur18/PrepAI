const bcrypt = require("bcrypt");
const User = require("../models/User");
const { signToken } = require("../utils/token");
const { safeErrorMessage } = require("../utils/safeError");

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  headline: user.headline,
  createdAt: user.createdAt,
});

// ================= REGISTER USER =================
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    const token = signToken(user._id);

    res.status(201).json({
      success: true,
      message: "Account created successfully.",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: safeErrorMessage(error, "Failed to create account. Please try again."),
    });
  }
};

// ================= LOGIN USER =================
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password"
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = signToken(user._id);

    res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: safeErrorMessage(error, "Login failed. Please try again."),
    });
  }
};

// ================= CURRENT USER =================
const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: sanitizeUser(req.user),
  });
};

// ================= UPDATE PROFILE =================
const updateProfile = async (req, res) => {
  try {
    const { name, headline, role } = req.body;

    if (name) req.user.name = name;
    if (headline !== undefined) req.user.headline = headline;
    if (role) req.user.role = role;

    await req.user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated.",
      user: sanitizeUser(req.user),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: safeErrorMessage(error, "Failed to update profile. Please try again."),
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
};
