const bcrypt = require("bcrypt");
const User = require("../models/User");
const { signToken } = require("../utils/token");
const { safeErrorMessage } = require("../utils/safeError");
const Resume = require("../models/Resume");
const Interview = require("../models/Interview");
const JobApplication = require("../models/JobApplication");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const strongEnough = (pw) => typeof pw === "string" && pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw);

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

    if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address." });
    }

    if (!strongEnough(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters and include a letter and a number.",
      });
    }

    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: String(name).trim().slice(0, 80),
      email: email.trim().toLowerCase(),
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

// ================= CHANGE PASSWORD =================
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current and new password are required." });
    }
    if (!strongEnough(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters and include a letter and a number.",
      });
    }
    const user = await User.findById(req.user._id).select("+password");
    const ok = user && (await bcrypt.compare(currentPassword, user.password));
    if (!ok) {
      return res.status(400).json({ success: false, message: "Current password is incorrect." });
    }
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.status(200).json({ success: true, message: "Password updated." });
  } catch (error) {
    res.status(500).json({ success: false, message: safeErrorMessage(error, "Failed to change password.") });
  }
};

// ================= DELETE ACCOUNT (and all of the user's data) =================
const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, message: "Please confirm with your password." });
    }
    const user = await User.findById(req.user._id).select("+password");
    const ok = user && (await bcrypt.compare(password, user.password));
    if (!ok) {
      return res.status(400).json({ success: false, message: "Password is incorrect." });
    }
    await Promise.all([
      Resume.deleteMany({ user: user._id }),
      Interview.deleteMany({ user: user._id }),
      JobApplication.deleteMany({ user: user._id }),
    ]);
    await User.deleteOne({ _id: user._id });
    res.status(200).json({ success: true, message: "Account and all data deleted." });
  } catch (error) {
    res.status(500).json({ success: false, message: safeErrorMessage(error, "Failed to delete account.") });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  changePassword,
  deleteAccount,
};
