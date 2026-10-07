/** Rubric-based local grader for interview answers (used when AI is unavailable, and to anchor AI scores). */
const { tokenize, stem, STOPWORDS, GENERIC_JD_WORDS, clamp, round1, wordCount } = require("./textUtils");
const { findSkills } = require("./skills");
const { hasMetric } = require("./resumeParser");

const FILLERS = /\b(um+|uh+|you know|basically|kind of|sort of|literally|actually|i guess|maybe|i think|stuff like that|and so on)\b/gi;
const ACTION = /\b(i (?:built|led|created|designed|implemented|developed|fixed|wrote|launched|organized|organised|analy[sz]ed|optimi[sz]ed|reduced|improved|automated|decided|proposed|migrated|owned|mentored|coordinated|resolved|delivered|learned|researched|presented|tested|deployed))\b/gi;
const RESULT = /\b(result(?:ed|s)?|as a result|outcome|achieved|increased|decreased|reduced|improved|saved|delivered|launched|learned|lesson|impact|led to|which (?:helped|allowed)|ended up)\b/gi;
const SITUATION = /\b(when|during|while|at my|in my|last (?:year|semester|month)|project|internship|team|college|company|situation|problem|challenge)\b/gi;
const TASK = /\b(my (?:task|role|responsibility|goal)|i was (?:responsible|asked|tasked)|needed to|had to|goal was|objective)\b/gi;
const CONNECTORS = /\b(first(?:ly)?|second(?:ly)?|then|next|finally|because|therefore|however|for example|for instance|as a result|in addition|so that|which means)\b/gi;
const count = (re, s) => (s.match(re) || []).length;

function keywordSet(text) {
  return new Set(
    tokenize(text)
      .filter((t) => t.length > 3 && !STOPWORDS.has(t) && !GENERIC_JD_WORDS.has(t))
      .map(stem)
  );
}

const STRUCTURES = {
  Behavioral: "Situation: set the scene in one sentence. Task: your responsibility. Action: 2–3 specific things YOU did. Result: a measurable outcome and what you learned.",
  Situational: "Clarify assumptions → state your priorities → walk through concrete steps in order → mention how you would communicate and measure success.",
  Technical: "Define the concept in one sentence → explain how it works → give a short real example → mention trade-offs or edge cases.",
  "Role-specific": "Give a direct answer first, then two pieces of evidence from your experience, and link it back to what the team needs.",
};

function scoreAnswer({ question = "", category = "General", answer = "", role = "", tips = "", jobDescription = "" } = {}) {
  const text = String(answer || "").trim();
  const words = wordCount(text);

  if (words < 4) {
    return {
      score: 0,
      feedback: "No real answer was given. Even a short structured answer earns credit — try the outline below.",
      strengths: [],
      improvements: ["Write at least 3–4 sentences.", "Use a clear structure (see the suggested outline)."],
      rubric: { relevance: 0, structure: 0, specificity: 0, depth: 0, clarity: 0 },
      modelAnswer: STRUCTURES[category] || STRUCTURES["Role-specific"],
    };
  }

  const isBehavioral = category === "Behavioral" || category === "Situational";
  const qKeys = keywordSet(`${question} ${tips}`);
  const aKeys = keywordSet(text);
  let overlap = 0;
  qKeys.forEach((k) => aKeys.has(k) && overlap++);
  const relevanceRaw = qKeys.size ? overlap / Math.min(qKeys.size, 8) : 0.5;
  const skillHits = findSkills(text).length;
  const jdKeys = jobDescription ? keywordSet(jobDescription) : new Set();
  let jdOverlap = 0;
  jdKeys.forEach((k) => aKeys.has(k) && jdOverlap++);

  const sit = count(SITUATION, text) > 0;
  const task = count(TASK, text) > 0;
  const act = count(ACTION, text) > 0 || count(/\bI\b/g, text) >= 2;
  const res = count(RESULT, text) > 0;
  const star = [sit, task, act, res].filter(Boolean).length;
  const connectors = count(CONNECTORS, text);
  const sentenceCount = Math.max(1, (text.match(/[.!?]+/g) || []).length);
  const avgSentence = words / sentenceCount;
  const fillers = count(FILLERS, text);
  const metric = hasMetric(text);

  let relevance = clamp(relevanceRaw * 8 + (skillHits ? 1 : 0) + Math.min(1, jdOverlap / 3), 0, 10);
  // Behavioral prompts are generic ("a challenging project"): judge relevance by substance, not keyword overlap.
  if (isBehavioral) relevance = Math.max(relevance, Math.min(7.5, words / 9));
  const structure = isBehavioral
    ? clamp(star * 2 + Math.min(2, connectors * 0.7), 0, 10)
    : clamp(3 + Math.min(4, connectors * 1.2) + (sentenceCount >= 3 ? 2 : 0) + (/for example|for instance|e\.g\./i.test(text) ? 1 : 0), 0, 10);
  const specificity = clamp((metric ? 4 : 0) + Math.min(3, skillHits * 1.2) + (/\b[A-Z][a-z]+[A-Z]\w*|\b\d/.test(text) ? 1 : 0) + (count(ACTION, text) ? 2 : 0), 0, 10);
  const depth = words < 20 ? 2 : words < 40 ? 4 : words < 70 ? 6.5 : words <= 220 ? 9 : 7;
  const clarity = clamp(9 - fillers * 1.2 - (avgSentence > 35 ? 2 : 0) - (avgSentence < 5 ? 1.5 : 0), 2, 10);

  const score = round1(
    clamp(relevance * 0.3 + structure * 0.25 + specificity * 0.2 + depth * 0.15 + clarity * 0.1, 0, 10)
  );

  const strengths = [];
  const improvements = [];
  if (relevance >= 6) strengths.push("Your answer addresses the question directly and uses the right concepts.");
  else improvements.push("Answer the exact question first, using its key terms, before adding context.");
  if (isBehavioral ? star >= 3 : structure >= 6.5) strengths.push(isBehavioral ? "Clear story arc covering most of situation, action and result." : "Logical flow with connecting words.");
  else improvements.push(isBehavioral ? "Follow STAR: add the missing parts (usually the Task and the measurable Result)." : "Organise the answer: definition → how it works → example → trade-offs.");
  if (metric) strengths.push("You backed your claims with numbers — that makes answers memorable.");
  else improvements.push("Add a concrete number (time saved, % improved, users, scale) to prove impact.");
  if (skillHits >= 2) strengths.push("Good use of specific tools/technologies.");
  else if (category === "Technical") improvements.push("Name the specific tools, patterns or technologies you would actually use.");
  if (words < 40) improvements.push("Go deeper — aim for roughly 80–150 words (about 45–90 seconds spoken).");
  if (words > 230) improvements.push("Tighten the answer; interviewers prefer 1–2 minutes of focused content.");
  if (fillers >= 3) improvements.push("Cut filler/hedging words (“basically”, “I guess”, “maybe”) to sound more confident.");
  if (isBehavioral && count(/\bwe\b/gi, text) > count(/\bI\b/g, text) * 2) improvements.push("Say what *you* did — too many “we” statements hide your personal contribution.");

  const verdict = score >= 8 ? "Excellent answer." : score >= 6.5 ? "Good answer with room to sharpen." : score >= 4.5 ? "Decent start, but it needs more structure and specifics." : "This answer needs significant development.";
  const feedback = `${verdict} ${strengths[0] || ""} ${improvements[0] ? "Next step: " + improvements[0] : ""}`.replace(/\s+/g, " ").trim();

  return {
    score,
    feedback,
    strengths: strengths.slice(0, 3),
    improvements: improvements.slice(0, 4),
    rubric: {
      relevance: Math.round(relevance), structure: Math.round(structure), specificity: Math.round(specificity),
      depth: Math.round(depth), clarity: Math.round(clarity),
    },
    modelAnswer: tips ? `${tips} Suggested structure — ${STRUCTURES[category] || STRUCTURES["Role-specific"]}` : STRUCTURES[category] || STRUCTURES["Role-specific"],
  };
}

/** Builds the final-report data for a mock interview. */
function summarizeInterview(questions = [], role = "the role") {
  const answered = questions.filter((q) => typeof q.score === "number");
  const cats = {};
  for (const q of answered) (cats[q.category || "General"] ||= []).push(q.score);
  const categoryScores = Object.entries(cats).map(([category, arr]) => ({
    category,
    score: round1(arr.reduce((a, b) => a + b, 0) / arr.length),
    count: arr.length,
  }));
  const avg = answered.length ? answered.reduce((a, q) => a + q.score, 0) / answered.length : 0;
  const best = [...categoryScores].sort((a, b) => b.score - a.score)[0];
  const worst = [...categoryScores].sort((a, b) => a.score - b.score)[0];
  const skipped = questions.length - answered.length;

  const improvementCounts = {};
  for (const q of answered) for (const i of q.improvements || []) improvementCounts[i] = (improvementCounts[i] || 0) + 1;
  const topImprovements = Object.entries(improvementCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);

  const strengths = [];
  if (best && best.score >= 6) strengths.push(`Strongest in ${best.category} questions (${best.score}/10).`);
  if (answered.some((q) => (q.strengths || []).some((s) => /numbers/i.test(s)))) strengths.push("Used measurable results to support answers.");
  if (!strengths.length) strengths.push("You completed the session and have a baseline to improve on.");
  const nextSteps = [
    ...(worst && worst.score < 7 ? [`Practise ${worst.category} questions — re-attempt them aloud with a 90-second timer.`] : []),
    ...topImprovements,
    "Record yourself answering once and listen for filler words and pacing.",
  ].slice(0, 4);

  let tone = "a solid foundation";
  if (avg >= 8) tone = "an excellent, interview-ready performance";
  else if (avg >= 6.5) tone = "a good performance with clear room to polish";
  else if (avg >= 4.5) tone = "a promising start that needs more structure and specifics";
  else tone = "an early-stage performance — with practice this can improve quickly";
  const summary = `For the ${role} interview you delivered ${tone} (average ${round1(avg)}/10 across ${answered.length} answered question${answered.length === 1 ? "" : "s"}${skipped ? `, ${skipped} skipped` : ""}). ${best ? `Your best area was ${best.category}.` : ""} ${worst && worst !== best ? `Focus next on ${worst.category} answers.` : ""} ${nextSteps[0] || ""}`.replace(/\s+/g, " ").trim();

  return { overallScore: round1(avg), categoryScores, strengths, improvements: topImprovements, nextSteps, summary };
}

module.exports = { scoreAnswer, summarizeInterview };
