const MAX_BYTES = 10 * 1024 * 1024;
const OK_EXT = /\.(pdf|docx)$/i;

/** Validates a picked/dropped resume file; returns an error string or null. */
export function validateResumeFile(file) {
  if (!file) return "No file selected.";
  if (!OK_EXT.test(file.name)) return "Please choose a PDF or DOCX file.";
  if (file.size > MAX_BYTES) return "That file is larger than 10 MB.";
  if (file.size < 500) return "That file looks empty.";
  return null;
}
