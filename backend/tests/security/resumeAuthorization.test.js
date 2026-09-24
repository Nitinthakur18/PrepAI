jest.mock("../../models/User", () => ({ findById: jest.fn() }));
jest.mock("../../models/Resume", () => ({
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
}));
// Never make real Gemini calls in tests.
jest.mock("../../utils/gemini", () => ({
  generateJSON: jest.fn(),
  generateContent: jest.fn(),
}));

const request = require("supertest");
const app = require("../../app");
const User = require("../../models/User");
const Resume = require("../../models/Resume");
const { signTestToken, fakeId, makeUser } = require("../helpers/testHelpers");

const owner = makeUser({ _id: fakeId("1") });
const attacker = makeUser({ _id: fakeId("2") });

const ownerToken = signTestToken(owner._id);
const attackerToken = signTestToken(attacker._id);

function ownedResumeFixture(overrides = {}) {
  return {
    _id: fakeId("9"),
    user: owner._id,
    filename: "resume.pdf",
    originalName: "My Resume.pdf",
    resumeText: "Experienced software engineer with 5 years...",
    analysis: { atsScore: 82 },
    jobMatch: null,
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  // requireAuth resolves whichever user the caller's token belongs to.
  User.findById.mockImplementation(async (id) => {
    if (id === owner._id) return owner;
    if (id === attacker._id) return attacker;
    return null;
  });
});

describe("Resume authorization", () => {
  describe("GET /api/resume/:id", () => {
    test("unauthenticated request is rejected (401)", async () => {
      const res = await request(app).get(`/api/resume/${fakeId("9")}`);
      expect(res.status).toBe(401);
    });

    test("owner can retrieve their own resume (200)", async () => {
      const resume = ownedResumeFixture();
      Resume.findById.mockResolvedValue(resume);

      const res = await request(app)
        .get(`/api/resume/${resume._id}`)
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test("non-owner receives 404, not the resume data", async () => {
      const resume = ownedResumeFixture();
      Resume.findById.mockResolvedValue(resume);

      const res = await request(app)
        .get(`/api/resume/${resume._id}`)
        .set("Authorization", `Bearer ${attackerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.data).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain("Experienced software engineer");
    });
  });

  describe("DELETE /api/resume/:id", () => {
    test("owner can delete their own resume", async () => {
      const resume = ownedResumeFixture();
      Resume.findById.mockResolvedValue(resume);
      Resume.findByIdAndDelete.mockResolvedValue(resume);

      const res = await request(app)
        .delete(`/api/resume/${resume._id}`)
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(Resume.findByIdAndDelete).toHaveBeenCalledWith(resume._id);
    });

    test("non-owner cannot delete another user's resume", async () => {
      const resume = ownedResumeFixture();
      Resume.findById.mockResolvedValue(resume);

      const res = await request(app)
        .delete(`/api/resume/${resume._id}`)
        .set("Authorization", `Bearer ${attackerToken}`);

      expect(res.status).toBe(404);
      expect(Resume.findByIdAndDelete).not.toHaveBeenCalled();
    });

    test("unauthenticated delete is rejected (401)", async () => {
      const res = await request(app).delete(`/api/resume/${fakeId("9")}`);
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/resume/match (ATS matching)", () => {
    test("owner can run ATS matching against their own resume", async () => {
      const resume = ownedResumeFixture();
      Resume.findById.mockResolvedValue(resume);

      const res = await request(app)
        .post("/api/resume/match")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          resumeId: resume._id,
          jobDescription:
            "We need a software engineer with React and Node experience.",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(resume.save).toHaveBeenCalled();
    });

    test("non-owner cannot run ATS matching against another user's resume", async () => {
      const resume = ownedResumeFixture();
      Resume.findById.mockResolvedValue(resume);

      const res = await request(app)
        .post("/api/resume/match")
        .set("Authorization", `Bearer ${attackerToken}`)
        .send({ resumeId: resume._id, jobDescription: "Some JD" });

      expect(res.status).toBe(404);
      expect(resume.save).not.toHaveBeenCalled();
    });

    test("unauthenticated matching is rejected (401)", async () => {
      const res = await request(app)
        .post("/api/resume/match")
        .send({ resumeId: fakeId("9"), jobDescription: "Some JD" });

      expect(res.status).toBe(401);
    });
  });
});
