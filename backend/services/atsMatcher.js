/**
 * Backwards-compatible entry point. The matching logic now lives in the Smart
 * Engine (services/engine/jdMatcher.js): weighted skills, keyword extraction,
 * experience/education requirements and semantic similarity.
 */
const { matchJD } = require("./engine");

const calculateATS = (resumeText, jobDescription) => matchJD(resumeText, jobDescription);

module.exports = { calculateATS };
