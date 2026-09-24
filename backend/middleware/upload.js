const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },

  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const allowedExtensions = [".pdf", ".docx"];
const allowedMimeTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (
    allowedMimeTypes.includes(file.mimetype) ||
    allowedExtensions.includes(ext)
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF and DOCX files are allowed"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// File-signature (magic bytes) validation. Multer's fileFilter only sees the
// client-supplied extension/mimetype, both of which are trivial to spoof, so
// this runs AFTER the file is saved and checks the actual bytes on disk.
// PDF files start with "%PDF" (25 50 44 46).
// DOCX files are zip archives and start with the local file header
// signature "PK\x03\x04" (50 4B 03 04) — 50 4B 05 06 / 50 4B 07 08 are the
// (rarer) empty/spanned-archive zip signatures, included for robustness.
const PDF_SIGNATURE = "25504446";
const ZIP_SIGNATURES = ["504b0304", "504b0506", "504b0708"];

const validateFileSignature = (req, res, next) => {
  if (!req.file) return next();

  const cleanupAndReject = (message) => {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ success: false, message });
  };

  let fd;
  try {
    fd = fs.openSync(req.file.path, "r");
    const header = Buffer.alloc(4);
    fs.readSync(fd, header, 0, 4, 0);
    fs.closeSync(fd);

    const signature = header.toString("hex");
    const ext = path.extname(req.file.originalname).toLowerCase();

    const isValidPdf = ext === ".pdf" && signature === PDF_SIGNATURE;
    const isValidDocx = ext === ".docx" && ZIP_SIGNATURES.includes(signature);

    if (!isValidPdf && !isValidDocx) {
      return cleanupAndReject(
        "This file doesn't look like a valid PDF or DOCX. It may be corrupted, mislabeled, or a different file type — please re-export and re-upload it."
      );
    }

    return next();
  } catch (err) {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch (_) {}
    }
    return cleanupAndReject(
      "We couldn't verify this file's contents. Please try uploading it again."
    );
  }
};

module.exports = upload;
module.exports.validateFileSignature = validateFileSignature;
