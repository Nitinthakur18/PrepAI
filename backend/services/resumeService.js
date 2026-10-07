const fs = require("fs");
const path = require("path");
// Import the library file directly: the package index has a debug branch that
// tries to read a bundled test PDF when `module.parent` is missing (bundlers/ESM).
const pdfParse = require("pdf-parse/lib/pdf-parse.js");
const mammoth = require("mammoth");
const { cleanText } = require("./engine/textUtils");

const withTimeout = (promise, ms, label) => {
  let timer;
  const timeout = new Promise((_, rej) => {
    timer = setTimeout(() => rej(new Error(`${label} timed out`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

/**
 * Extracts text from a PDF/DOCX/TXT file on disk and normalises it.
 * Never throws raw library errors: always a friendly, user-safe message.
 */
const extractResumeText = async (filePath) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const dataBuffer = fs.readFileSync(filePath);

    let text = "";
    if (ext === ".docx") {
      const result = await withTimeout(mammoth.extractRawText({ buffer: dataBuffer }), 30000, "DOCX parsing");
      text = result.value;
    } else if (ext === ".txt") {
      text = dataBuffer.toString("utf8");
    } else {
      const pdfData = await withTimeout(pdfParse(dataBuffer), 30000, "PDF parsing");
      text = pdfData.text;
    }
    return cleanText(text);
  } catch (error) {
    console.error("Resume Parsing Error:", error.message);
    throw new Error(
      "Could not read this file. Please upload a text-based PDF or DOCX (not a scanned image)."
    );
  }
};

module.exports = { extractResumeText };
