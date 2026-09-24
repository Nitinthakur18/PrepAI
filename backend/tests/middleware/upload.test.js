const fs = require("fs");
const os = require("os");
const path = require("path");
const { validateFileSignature } = require("../../middleware/upload");

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function writeTempFile(name, buffer) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prepai-upload-test-"));
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

const REAL_PDF_HEADER = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
const REAL_ZIP_HEADER = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // PK..

describe("validateFileSignature middleware", () => {
  test("calls next() with no req.file (nothing to validate)", async () => {
    const req = {};
    const res = mockRes();
    const next = jest.fn();

    await validateFileSignature(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  test("accepts a real PDF with a .pdf extension", async () => {
    const filePath = writeTempFile(
      "resume.pdf",
      Buffer.concat([REAL_PDF_HEADER, Buffer.from(" fake pdf body")])
    );
    const req = { file: { path: filePath, originalname: "resume.pdf" } };
    const res = mockRes();
    const next = jest.fn();

    await validateFileSignature(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test("accepts a real DOCX (zip) with a .docx extension", async () => {
    const filePath = writeTempFile(
      "resume.docx",
      Buffer.concat([REAL_ZIP_HEADER, Buffer.from("fake zip body")])
    );
    const req = { file: { path: filePath, originalname: "resume.docx" } };
    const res = mockRes();
    const next = jest.fn();

    await validateFileSignature(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test("rejects plain text renamed to .pdf (spoofed extension) with 400", async () => {
    const filePath = writeTempFile(
      "fake.pdf",
      Buffer.from("this is just plain text, not a real pdf")
    );
    const req = { file: { path: filePath, originalname: "fake.pdf" } };
    const res = mockRes();
    const next = jest.fn();

    await validateFileSignature(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("rejects plain text renamed to .docx (spoofed extension) with 400", async () => {
    const filePath = writeTempFile(
      "fake.docx",
      Buffer.from("this is just plain text, not a real docx")
    );
    const req = { file: { path: filePath, originalname: "fake.docx" } };
    const res = mockRes();
    const next = jest.fn();

    await validateFileSignature(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  test("rejects a real PDF that was mislabeled with a .docx extension", async () => {
    const filePath = writeTempFile(
      "mislabeled.docx",
      Buffer.concat([REAL_PDF_HEADER, Buffer.from(" actually a pdf")])
    );
    const req = { file: { path: filePath, originalname: "mislabeled.docx" } };
    const res = mockRes();
    const next = jest.fn();

    await validateFileSignature(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  test("deletes the rejected file from disk", async () => {
    const filePath = writeTempFile("fake.pdf", Buffer.from("not a pdf"));
    const req = { file: { path: filePath, originalname: "fake.pdf" } };
    const res = mockRes();
    const next = jest.fn();

    await validateFileSignature(req, res, next);

    // Deletion happens via fs.unlink (async callback) — give the event
    // loop a tick to flush it before asserting.
    await new Promise((resolve) => setImmediate(resolve));
    expect(fs.existsSync(filePath)).toBe(false);
  });

  test("never lets an invalid file reach next() / the controller", async () => {
    const filePath = writeTempFile("fake.pdf", Buffer.from("not a pdf"));
    const req = { file: { path: filePath, originalname: "fake.pdf" } };
    const res = mockRes();
    const next = jest.fn();

    await validateFileSignature(req, res, next);

    expect(next).not.toHaveBeenCalled();
  });
});
