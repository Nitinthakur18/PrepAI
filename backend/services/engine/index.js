/** Public API of the offline Smart Engine. */
const { analyzeResume, ENGINE_VERSION } = require("./resumeAnalyzer");
const { matchJD } = require("./jdMatcher");
const { parseResume } = require("./resumeParser");
const { generateQuestions } = require("./interviewBank");
const { scoreAnswer, summarizeInterview } = require("./answerScorer");
const writing = require("./writing");
const { buildRoadmap } = require("./roadmap");
const skills = require("./skills");
const { roleFit, detectFamily } = require("./roleFit");
const sampleResume = require("./sampleResume");

module.exports = {
  ENGINE_VERSION,
  analyzeResume,
  matchJD,
  parseResume,
  generateQuestions,
  scoreAnswer,
  summarizeInterview,
  ...writing,
  buildRoadmap,
  skills,
  roleFit,
  detectFamily,
  sampleResume,
};
