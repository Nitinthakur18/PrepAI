const mongoose = require("mongoose");

const qaSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    category: { type: String, default: "General" },
    difficulty: { type: String, default: "Medium" },
    answer: { type: String, default: "" },
    score: { type: Number, default: null },
    feedback: { type: String, default: "" },
  },
  { _id: false }
);

const interviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },

    resume: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
      required: false,
    },

    mode: {
      type: String,
      enum: ["question-bank", "mock-interview"],
      default: "question-bank",
    },

    role: {
      type: String,
      default: "Software Engineer",
    },

    jobDescription: {
      type: String,
      default: "",
    },

    questions: {
      type: [qaSchema],
      default: [],
    },

    status: {
      type: String,
      enum: ["in-progress", "completed"],
      default: "in-progress",
    },

    overallScore: {
      type: Number,
      default: null,
    },

    summary: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Interview", interviewSchema);
