const mongoose = require("mongoose");

const STATUSES = ["wishlist", "applied", "interview", "offer", "rejected"];

const jobApplicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    company: { type: String, required: true, trim: true, maxlength: 120 },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    status: { type: String, enum: STATUSES, default: "wishlist" },
    url: { type: String, default: "", maxlength: 500 },
    location: { type: String, default: "", maxlength: 120 },
    salary: { type: String, default: "", maxlength: 80 },
    jobDescription: { type: String, default: "", maxlength: 12000 },
    notes: { type: String, default: "", maxlength: 4000 },
    matchScore: { type: Number, default: null, min: 0, max: 100 },
    resume: { type: mongoose.Schema.Types.ObjectId, ref: "Resume", required: false },
    appliedAt: { type: Date, default: null },
    nextStep: { type: String, default: "", maxlength: 200 },
    nextStepAt: { type: Date, default: null },
    history: {
      type: [{ status: String, at: { type: Date, default: Date.now }, _id: false }],
      default: [],
    },
  },
  { timestamps: true }
);

jobApplicationSchema.statics.STATUSES = STATUSES;

module.exports = mongoose.model("JobApplication", jobApplicationSchema);
