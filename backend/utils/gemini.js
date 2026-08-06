const { GoogleGenAI } = require("@google/genai");

if (!process.env.GEMINI_API_KEY) {
  console.warn(
    "⚠️  GEMINI_API_KEY is not set. AI features (analysis, matching, interview prep) will fail until it is configured in backend/.env"
  );
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const MODEL = "gemini-flash-latest";

async function generateContent(prompt) {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
  });

  return response.text;
}

// Calls Gemini and parses the response as JSON, stripping any markdown fences.
async function generateJSON(prompt) {
  const raw = await generateContent(prompt);

  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // Try to salvage the first {...} or [...] block in the response
    const match = cleaned.match(/[\{\[][\s\S]*[\}\]]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error("AI returned a response that could not be parsed as JSON.");
  }
}

module.exports = {
  generateContent,
  generateJSON,
};
