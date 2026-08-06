const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

const extractResumeText = async (filePath) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const dataBuffer = fs.readFileSync(filePath);

    if (ext === ".docx") {
      const result = await mammoth.extractRawText({ buffer: dataBuffer });
      return result.value;
    }

    // default: treat as PDF
    const pdfData = await pdfParse(dataBuffer);
    return pdfData.text;
  } catch (error) {
    console.error("Resume Parsing Error:", error);
    throw new Error(
      "Could not read this file. Please upload a text-based PDF or DOCX (not a scanned image)."
    );
  }
};

module.exports = {
  extractResumeText,
};
