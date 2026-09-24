const Interview = require("../models/Interview");
const Resume = require("../models/Resume");
const { generateJSON } = require("../utils/gemini");
const { safeErrorMessage } = require("../utils/safeError");

/* =========================================================
   AI INTERVIEW QUESTION GENERATOR
   Generates a curated question bank based on a role,
   optional job description, and optional resume context.
========================================================= */
const generateQuestions = async (req, res) => {
  try {
    const { role, jobDescription = "", resumeId, count = 10 } = req.body;

    if (!role || !role.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide a target job role.",
      });
    }

    let resumeContext = "";
    let resume = null;

    if (resumeId) {
      const candidateResume = await Resume.findById(resumeId);
      // Only use the resume as context (and link it to this interview) if
      // it actually belongs to the requesting user — otherwise silently
      // skip it rather than pulling another user's resume into context.
      if (
        candidateResume &&
        candidateResume.user?.toString() === req.user._id.toString()
      ) {
        resume = candidateResume;
        resumeContext = `\nCandidate resume summary: ${
          resume.analysis?.summary || resume.resumeText.slice(0, 1200)
        }\nCandidate skills: ${(resume.analysis?.technicalSkills || []).join(
          ", "
        )}`;
      }
    }

    const prompt = `
You are a senior technical interviewer and career coach.

Generate ${count} interview questions for the role "${role}".
${jobDescription ? `Target job description:\n${jobDescription}\n` : ""}
${resumeContext}

Mix the questions across these categories: Technical, Behavioral, Situational, and Role-specific.
Vary difficulty across Easy, Medium, Hard.

Return ONLY valid JSON, no markdown, no explanations, in exactly this format:

{
  "questions": [
    {
      "question": "Question text",
      "category": "Technical",
      "difficulty": "Medium",
      "idealAnswerTips": "1-2 short sentences on what a strong answer covers"
    }
  ]
}
`;

    const parsed = await generateJSON(prompt);
    const questions = parsed.questions || [];

    const interview = await Interview.create({
      user: req.user._id,
      resume: resume ? resume._id : undefined,
      mode: "question-bank",
      role,
      jobDescription,
      questions: questions.map((q) => ({
        question: q.question,
        category: q.category || "General",
        difficulty: q.difficulty || "Medium",
      })),
      status: "completed",
    });

    return res.status(200).json({
      success: true,
      interviewId: interview._id,
      role,
      questions: parsed.questions,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: safeErrorMessage(error, "Failed to generate interview questions."),
    });
  }
};

/* =========================================================
   AI MOCK INTERVIEW - start a session (returns first batch
   of questions to ask one at a time on the frontend)
========================================================= */
const startMockInterview = async (req, res) => {
  try {
    const { role, jobDescription = "", resumeId, count = 6 } = req.body;

    if (!role || !role.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide a target job role.",
      });
    }

    let resumeContext = "";
    let resume = null;

    if (resumeId) {
      const candidateResume = await Resume.findById(resumeId);
      if (
        candidateResume &&
        candidateResume.user?.toString() === req.user._id.toString()
      ) {
        resume = candidateResume;
        resumeContext = `\nCandidate resume summary: ${
          resume.analysis?.summary || resume.resumeText.slice(0, 1200)
        }`;
      }
    }

    const prompt = `
You are conducting a live mock interview for the role "${role}".
${jobDescription ? `Job description:\n${jobDescription}\n` : ""}
${resumeContext}

Create ${count} interview questions ordered from warm-up to more challenging,
mixing behavioral and technical/role-specific questions appropriate for this role.

Return ONLY valid JSON in exactly this format:
{
  "questions": [
    { "question": "Question text", "category": "Behavioral", "difficulty": "Easy" }
  ]
}
`;

    const parsed = await generateJSON(prompt);
    const questions = (parsed.questions || []).map((q) => ({
      question: q.question,
      category: q.category || "General",
      difficulty: q.difficulty || "Medium",
    }));

    const interview = await Interview.create({
      user: req.user._id,
      resume: resume ? resume._id : undefined,
      mode: "mock-interview",
      role,
      jobDescription,
      questions,
      status: "in-progress",
    });

    return res.status(200).json({
      success: true,
      interviewId: interview._id,
      role,
      questions: interview.questions,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: safeErrorMessage(error, "Failed to start mock interview."),
    });
  }
};

/* =========================================================
   Submit one answer during a mock interview - AI scores it
========================================================= */
const submitAnswer = async (req, res) => {
  try {
    const { interviewId, questionIndex, answer } = req.body;

    if (interviewId === undefined || questionIndex === undefined) {
      return res.status(400).json({
        success: false,
        message: "interviewId and questionIndex are required.",
      });
    }

    const interview = await Interview.findById(interviewId);

    if (!interview || interview.user?.toString() !== req.user._id.toString()) {
      return res.status(404).json({
        success: false,
        message: "Interview session not found.",
      });
    }

    const q = interview.questions[questionIndex];

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Invalid question index.",
      });
    }

    const prompt = `
You are an expert interviewer evaluating a candidate's spoken/written answer.

Role: ${interview.role}
Question (${q.category}, ${q.difficulty}): ${q.question}
Candidate's answer: """${answer || "(no answer provided)"}"""

Score the answer from 0-10 and give concise, constructive feedback (2-3 sentences).
Return ONLY valid JSON in exactly this format:
{ "score": 7, "feedback": "..." }
`;

    const parsed = await generateJSON(prompt);

    q.answer = answer || "";
    q.score = typeof parsed.score === "number" ? parsed.score : 0;
    q.feedback = parsed.feedback || "";

    await interview.save();

    return res.status(200).json({
      success: true,
      score: q.score,
      feedback: q.feedback,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: safeErrorMessage(error, "Failed to evaluate answer."),
    });
  }
};

/* =========================================================
   Finish a mock interview - generates the final report
========================================================= */
const finishMockInterview = async (req, res) => {
  try {
    const { interviewId } = req.body;

    const interview = await Interview.findById(interviewId);

    if (!interview || interview.user?.toString() !== req.user._id.toString()) {
      return res.status(404).json({
        success: false,
        message: "Interview session not found.",
      });
    }

    const answered = interview.questions.filter((q) => q.score !== null);
    const overallScore = answered.length
      ? Math.round(
          (answered.reduce((sum, q) => sum + q.score, 0) / answered.length) *
            10
        ) / 10
      : 0;

    const transcript = interview.questions
      .map(
        (q, i) =>
          `${i + 1}. [${q.category}] ${q.question}\nAnswer: ${
            q.answer || "(skipped)"
          }\nScore: ${q.score ?? "N/A"}/10`
      )
      .join("\n\n");

    const prompt = `
You just evaluated a mock interview for the role "${interview.role}".
Here is the full transcript with per-question scores:

${transcript}

Write a short overall performance summary (3-4 sentences) covering strengths,
key areas to improve, and one concrete piece of advice for next time.
Return ONLY valid JSON in exactly this format:
{ "summary": "..." }
`;

    let summary = "";
    try {
      const parsed = await generateJSON(prompt);
      summary = parsed.summary || "";
    } catch (e) {
      summary =
        "Great effort completing this mock interview! Review the per-question feedback above to keep improving.";
    }

    interview.status = "completed";
    interview.overallScore = overallScore;
    interview.summary = summary;
    await interview.save();

    return res.status(200).json({
      success: true,
      data: interview,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: safeErrorMessage(error, "Failed to finish mock interview."),
    });
  }
};

/* =========================================================
   History of interview sessions
========================================================= */
const getInterviewHistory = async (req, res) => {
  try {
    const filter = { user: req.user._id };
    const interviews = await Interview.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: interviews,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch interview history.",
    });
  }
};

const getInterviewById = async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);

    if (!interview || interview.user?.toString() !== req.user._id.toString()) {
      return res.status(404).json({
        success: false,
        message: "Interview not found.",
      });
    }

    return res.status(200).json({ success: true, data: interview });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch interview.",
    });
  }
};

const deleteInterview = async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);

    if (!interview || interview.user?.toString() !== req.user._id.toString()) {
      return res.status(404).json({
        success: false,
        message: "Interview not found.",
      });
    }

    await Interview.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, message: "Deleted." });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete interview.",
    });
  }
};

module.exports = {
  generateQuestions,
  startMockInterview,
  submitAnswer,
  finishMockInterview,
  getInterviewHistory,
  getInterviewById,
  deleteInterview,
};
