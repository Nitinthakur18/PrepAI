const Resume = require("../models/Resume");
const { calculateATS } = require("../services/atsMatcher");

const matchResume = async (req, res) => {
  try {
    const { resumeId, jobDescription } = req.body;

    if (!resumeId || !jobDescription) {
      return res.status(400).json({
        success: false,
        message: "resumeId and jobDescription are required.",
      });
    }

    const resume = await Resume.findById(resumeId);

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found.",
      });
    }

    const result = calculateATS(resume.resumeText, jobDescription);

    resume.jobMatch = result;
    await resume.save();

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  matchResume,
};
