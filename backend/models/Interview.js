const mongoose = require("mongoose");

const qaSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    category: { type: String, default: "General" },
    difficulty: { type: String, default: "Medium" },
    answer: { type: String, default: "" },
    score: { type: Number, default: null },
    feedback: { type: String, default: "" },
    idealAnswerTips: { type: String, default: "" },
    strengths: { type: [String], default: [] },
    improvements: { type: [String], default: [] },
    rubric: { type: Object, default: null },
    modelAnswer: { type: String, default: "" },
    durationSec: { type: Number, default: null },
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

    // Final report for mock interviews (category scores, strengths, next steps, AI/engine meta)
    report: {
      type: Object,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Interview", interviewSchema);
