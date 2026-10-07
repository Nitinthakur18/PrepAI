jest.mock("../../models/User", () => ({ findById: jest.fn() }));
jest.mock("../../models/Resume", () => ({ findById: jest.fn(), findByIdAndDelete: jest.fn(), find: jest.fn(), create: jest.fn() }));
jest.mock("../../models/JobApplication", () => {
  const m = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), deleteOne: jest.fn() };
  m.STATUSES = ["wishlist", "applied", "interview", "offer", "rejected"];
  return m;
});
jest.mock("../../utils/gemini", () => ({
  generateJSON: jest.fn().mockRejectedValue(Object.assign(new Error("down"), { code: "AI_UNAVAILABLE", reason: "exhausted" })),
  generateContent: jest.fn(),
}));

const request = require("supertest");
const app = require("../../app");
const User = require("../../models/User");
const Resume = require("../../models/Resume");
const JobApplication = require("../../models/JobApplication");
const engine = require("../../services/engine");
const { signTestToken, fakeId, makeUser } = require("../helpers/testHelpers");

const owner = makeUser({ _id: fakeId("1") });
const attacker = makeUser({ _id: fakeId("2") });
const ownerToken = signTestToken(owner._id);
const attackerToken = signTestToken(attacker._id);

const resumeDoc = (extra = {}) => ({
  _id: fakeId("9"), user: owner._id, filename: "r.pdf", originalName: "r.pdf",
  resumeText: engine.sampleResume, analysis: { atsScore: 80, meta: { source: "local" } },
  save: jest.fn().mockResolvedValue(true), ...extra,
});

beforeEach(() => {
  jest.clearAllMocks();
  User.findById.mockImplementation(async (id) => (id === owner._id ? owner : id === attacker._id ? attacker : null));
});

describe("health & AI status", () => {
  test("GET /api/health reports db and ai state without auth", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("db");
  });
  test("GET /api/health/ai is public and exposes no secrets", async () => {
    const res = await request(app).get("/api/health/ai");
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/AIza|apiKey|key=/i);
  });
});

describe("resilience at the API level (Gemini down)", () => {
  test("POST /api/resume/sample succeeds using the Smart Engine", async () => {
    Resume.create.mockImplementation(async (doc) => ({ _id: fakeId("7"), ...doc }));
    const res = await request(app).post("/api/resume/sample").set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ source: "local", degraded: true });
    expect(res.body.analysis.atsScore).toBeGreaterThan(0);
    expect(Resume.create).toHaveBeenCalledWith(expect.objectContaining({ user: owner._id }));
  });
  test("POST /api/resume/match returns a full result with insights", async () => {
    Resume.findById.mockResolvedValue(resumeDoc());
    const res = await request(app).post("/api/resume/match").set("Authorization", `Bearer ${ownerToken}`)
      .send({ resumeId: fakeId("9"), jobDescription: "Frontend Developer\nRequirements:\n- React, JavaScript, TypeScript and REST APIs" });
    expect(res.status).toBe(200);
    expect(res.body.data.insights).toBeTruthy();
    expect(res.body.data.matchedSkills).toContain("React");
    expect(res.body.meta.source).toBe("local");
  });
  test("POST /api/interview/questions still returns questions", async () => {
    const Interview = require("../../models/Interview");
    jest.spyOn(Interview, "create").mockImplementation(async (d) => ({ _id: fakeId("5"), ...d }));
    Resume.findById.mockResolvedValue(resumeDoc());
    const res = await request(app).post("/api/interview/questions").set("Authorization", `Bearer ${ownerToken}`)
      .send({ role: "Backend Developer", count: 6, resumeId: fakeId("9") });
    expect(res.status).toBe(200);
    expect(res.body.questions).toHaveLength(6);
    expect(res.body.meta.source).toBe("local");
  });
  test("POST /api/resume/:id/reanalyze reports when Gemini is still busy and keeps the analysis", async () => {
    Resume.findById.mockResolvedValue(resumeDoc());
    const res = await request(app).post(`/api/resume/${fakeId("9")}/reanalyze`).set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.improved).toBe(false);
  });
  test("reanalyze of someone else's resume is 404", async () => {
    Resume.findById.mockResolvedValue(resumeDoc());
    const res = await request(app).post(`/api/resume/${fakeId("9")}/reanalyze`).set("Authorization", `Bearer ${attackerToken}`);
    expect(res.status).toBe(404);
  });
});

describe("career tools", () => {
  test("require authentication", async () => {
    for (const p of ["cover-letter", "bullets", "linkedin", "pitch", "roadmap"]) {
      expect((await request(app).post(`/api/tools/${p}`).send({})).status).toBe(401);
    }
  });
  test("cannot use another user's resume", async () => {
    Resume.findById.mockResolvedValue(resumeDoc());
    const res = await request(app).post("/api/tools/cover-letter").set("Authorization", `Bearer ${attackerToken}`).send({ resumeId: fakeId("9") });
    expect(res.status).toBe(404);
  });
  test("cover letter works for the owner", async () => {
    Resume.findById.mockResolvedValue(resumeDoc());
    const res = await request(app).post("/api/tools/cover-letter").set("Authorization", `Bearer ${ownerToken}`)
      .send({ resumeId: fakeId("9"), jobTitle: "MERN Developer", company: "Acme", tone: "enthusiastic" });
    expect(res.status).toBe(200);
    expect(res.body.data.letter).toMatch(/Acme/);
  });
  test("bullet improver validates input and works without a resume", async () => {
    const bad = await request(app).post("/api/tools/bullets").set("Authorization", `Bearer ${ownerToken}`).send({ bullets: "" });
    expect(bad.status).toBe(400);
    const ok = await request(app).post("/api/tools/bullets").set("Authorization", `Bearer ${ownerToken}`).send({ bullets: "Responsible for testing\nWorked on the login page" });
    expect(ok.status).toBe(200);
    expect(ok.body.data.items).toHaveLength(2);
  });
  test("roadmap is deterministic and validates input", async () => {
    expect((await request(app).post("/api/tools/roadmap").set("Authorization", `Bearer ${ownerToken}`).send({ skills: [] })).status).toBe(400);
    const res = await request(app).post("/api/tools/roadmap").set("Authorization", `Bearer ${ownerToken}`).send({ skills: ["Docker", "Kubernetes"] });
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(2);
  });
});

describe("job tracker", () => {
  const appDoc = (extra = {}) => ({
    _id: fakeId("4"), user: owner._id, company: "Acme", title: "Dev", status: "wishlist", history: [],
    save: jest.fn().mockResolvedValue(true), ...extra,
  });

  test("requires authentication", async () => {
    expect((await request(app).get("/api/tracker")).status).toBe(401);
    expect((await request(app).post("/api/tracker").send({})).status).toBe(401);
  });
  test("list is scoped to the requesting user", async () => {
    JobApplication.find.mockReturnValue({ select: () => ({ sort: async () => [] }) });
    const res = await request(app).get("/api/tracker").set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(JobApplication.find).toHaveBeenCalledWith({ user: owner._id });
  });
  test("create validates required fields and stamps ownership", async () => {
    const bad = await request(app).post("/api/tracker").set("Authorization", `Bearer ${ownerToken}`).send({ company: "Acme" });
    expect(bad.status).toBe(400);
    JobApplication.create.mockImplementation(async (d) => ({ _id: fakeId("4"), ...d }));
    const ok = await request(app).post("/api/tracker").set("Authorization", `Bearer ${ownerToken}`)
      .send({ company: "Acme", title: "Dev", status: "applied", user: attacker._id });
    expect(ok.status).toBe(201);
    expect(JobApplication.create).toHaveBeenCalledWith(expect.objectContaining({ user: owner._id, status: "applied" }));
    expect(ok.body.data.appliedAt).toBeTruthy();
  });
  test("lookups are always filtered by user, so other users get 404", async () => {
    JobApplication.findOne.mockImplementation(async (q) => (q.user === owner._id ? appDoc() : null));
    const mine = await request(app).put(`/api/tracker/${fakeId("4")}`).set("Authorization", `Bearer ${ownerToken}`).send({ status: "interview" });
    expect(mine.status).toBe(200);
    const theirs = await request(app).put(`/api/tracker/${fakeId("4")}`).set("Authorization", `Bearer ${attackerToken}`).send({ status: "offer" });
    expect(theirs.status).toBe(404);
    const del = await request(app).delete(`/api/tracker/${fakeId("4")}`).set("Authorization", `Bearer ${attackerToken}`);
    expect(del.status).toBe(404);
    expect(JobApplication.deleteOne).not.toHaveBeenCalled();
  });
  test("status changes are validated and recorded in history", async () => {
    const doc = appDoc();
    JobApplication.findOne.mockResolvedValue(doc);
    expect((await request(app).put(`/api/tracker/${fakeId("4")}`).set("Authorization", `Bearer ${ownerToken}`).send({ status: "hacked" })).status).toBe(400);
    await request(app).put(`/api/tracker/${fakeId("4")}`).set("Authorization", `Bearer ${ownerToken}`).send({ status: "applied" });
    expect(doc.status).toBe("applied");
    expect(doc.history).toHaveLength(1);
    expect(doc.appliedAt).toBeTruthy();
  });
});
