jest.mock("../../models/User", () => ({ findById: jest.fn() }));
jest.mock("../../models/Resume", () => ({ findById: jest.fn(), findByIdAndDelete: jest.fn(), find: jest.fn(), create: jest.fn() }));
jest.mock("../../utils/gemini", () => ({
  generateJSON: jest.fn().mockRejectedValue(Object.assign(new Error("Gemini 503"), { code: "AI_UNAVAILABLE", reason: "exhausted" })),
  generateContent: jest.fn(),
}));

const fs = require("fs");
const path = require("path");
const request = require("supertest");
const app = require("../../app");
const User = require("../../models/User");
const Resume = require("../../models/Resume");
const engine = require("../../services/engine");
const { signTestToken, fakeId, makeUser } = require("../helpers/testHelpers");

const owner = makeUser({ _id: fakeId("1") });
const token = signTestToken(owner._id);
const uploadsDir = path.join(__dirname, "..", "..", "uploads");

/** Builds a minimal, valid single-page text PDF (no external libs, no personal data). */
function makePdf(lines) {
  const esc = (s) => s.replace(/([()\\])/g, "\\$1").replace(/[^\x20-\x7E]/g, "-");
  const content = `BT /F1 10 Tf 40 780 Td 12 TL\n${lines.map((l) => `(${esc(l)}) Tj T*`).join("\n")}\nET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offs = [];
  objs.forEach((o, i) => {
    offs.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

const files = () => (fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir).filter((f) => f !== ".gitkeep") : []);

beforeEach(() => {
  jest.clearAllMocks();
  User.findById.mockResolvedValue(owner);
  Resume.create.mockImplementation(async (d) => ({ _id: fakeId("7"), ...d }));
});

describe("POST /api/resume/upload (end to end, Gemini down)", () => {
  test("extracts a real PDF, analyses it with the Smart Engine and removes the file from disk", async () => {
    const before = files().length;
    const pdf = makePdf(engine.sampleResume.split("\n"));
    const res = await request(app).post("/api/resume/upload").set("Authorization", `Bearer ${token}`).attach("resume", pdf, "cv.pdf");
    expect(res.status).toBe(200);
    expect(res.body.analysis.technicalSkills).toEqual(expect.arrayContaining(["React", "MongoDB"]));
    expect(res.body.analysis.atsScore).toBeGreaterThan(50);
    expect(res.body.meta).toMatchObject({ source: "local", degraded: true });
    expect(Resume.create).toHaveBeenCalledWith(expect.objectContaining({ user: owner._id, originalName: "cv.pdf" }));
    await new Promise((r) => setTimeout(r, 50));
    expect(files().length).toBe(before); // uploaded file was deleted after text extraction
  });

  test("a document that is not a resume is rejected with NOT_A_RESUME unless forced", async () => {
    const paper = makePdf(Array.from({ length: 30 }, (_, i) => `Question ${i + 1}: Explain polymorphism in object oriented programming and give an example?`));
    const res = await request(app).post("/api/resume/upload").set("Authorization", `Bearer ${token}`).attach("resume", paper, "paper.pdf");
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("NOT_A_RESUME");
    expect(Resume.create).not.toHaveBeenCalled();

    const forced = await request(app).post("/api/resume/upload").set("Authorization", `Bearer ${token}`).field("force", "true").attach("resume", paper, "paper.pdf");
    expect(forced.status).toBe(200);
  });

  test("a PDF with no extractable text gives a helpful 400", async () => {
    const empty = makePdf([" "]);
    const res = await request(app).post("/api/resume/upload").set("Authorization", `Bearer ${token}`).attach("resume", empty, "scan.pdf");
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/text-based/i);
  });

  test("a spoofed file type is rejected before analysis", async () => {
    const res = await request(app).post("/api/resume/upload").set("Authorization", `Bearer ${token}`).attach("resume", Buffer.from("just text"), "fake.pdf");
    expect(res.status).toBe(400);
    expect(Resume.create).not.toHaveBeenCalled();
  });

  test("unsupported extension returns a clean 400 (not a 500)", async () => {
    const res = await request(app).post("/api/resume/upload").set("Authorization", `Bearer ${token}`).attach("resume", Buffer.from("x"), "evil.exe");
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/PDF and DOCX/);
  });
});
