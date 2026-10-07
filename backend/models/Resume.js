const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },

    filename: {
      type: String,
      required: true,
    },

    originalName: {
      type: String,
      default: "",
    },

    resumeText: {
      type: String,
      required: true,
    },

    analysis: {
      type: Object,
      default: {},
    },

    jobMatch: {
      type: Object,
      default: null,
    },

    // Recent job matches (newest first) so users can compare roles
    matchHistory: {
      type: [Object],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Resume", resumeSchema);
