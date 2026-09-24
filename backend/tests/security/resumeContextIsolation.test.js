jest.mock("../../models/User", () => ({ findById: jest.fn() }));
jest.mock("../../models/Interview", () => ({
  findById: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
}));
jest.mock("../../models/Resume", () => ({ findById: jest.fn() }));
jest.mock("../../utils/gemini", () => ({
  generateJSON: jest.fn(),
  generateContent: jest.fn(),
}));

const request = require("supertest");
const app = require("../../app");
const User = require("../../models/User");
const Resume = require("../../models/Resume");
const Interview = require("../../models/Interview");
const { generateJSON } = require("../../utils/gemini");
const { signTestToken, fakeId, makeUser } = require("../helpers/testHelpers");

const owner = makeUser({ _id: fakeId("1") });
const attacker = makeUser({ _id: fakeId("2") });
const ownerToken = signTestToken(owner._id);
const attackerToken = signTestToken(attacker._id);

const SECRET_SUMMARY = "Confidential: owner previously worked at SecretCorp on Project Nightingale.";

function attackerOwnedResume() {
  return {
    _id: fakeId("5"),
    user: owner._id, // belongs to `owner`, not the attacker
    resumeText: "Full resume text...",
    analysis: { summary: SECRET_SUMMARY, technicalSkills: ["Rust", "Kubernetes"] },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  User.findById.mockImplementation(async (id) => {
    if (id === owner._id) return owner;
    if (id === attacker._id) return attacker;
    return null;
  });
  generateJSON.mockResolvedValue({ questions: [{ question: "Q1", category: "Technical", difficulty: "Easy" }] });
  Interview.create.mockImplementation(async (doc) => ({ ...doc, _id: fakeId("8") }));
});

describe("AI resume-context isolation (generateQuestions)", () => {
  test("owner's own resume IS used as context and linked to the interview", async () => {
    const resume = attackerOwnedResume(); // owned by `owner` here
    Resume.findById.mockResolvedValue(resume);

    const res = await request(app)
      .post("/api/interview/questions")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ role: "Backend Engineer", resumeId: resume._id });

    expect(res.status).toBe(200);

    // The prompt sent to the AI must contain the owner's resume summary.
    const promptSent = generateJSON.mock.calls[0][0];
    expect(promptSent).toContain(SECRET_SUMMARY);

    // The interview record must be linked to that resume.
    expect(Interview.create).toHaveBeenCalledWith(
      expect.objectContaining({ resume: resume._id, user: owner._id })
    );
  });

  test("another user's resume is NOT injected into the prompt, even if its ID is guessed", async () => {
    const resume = attackerOwnedResume(); // owned by `owner`
    Resume.findById.mockResolvedValue(resume);

    const res = await request(app)
      .post("/api/interview/questions")
      .set("Authorization", `Bearer ${attackerToken}`) // attacker requests it
      .send({ role: "Backend Engineer", resumeId: resume._id });

    expect(res.status).toBe(200); // request still succeeds...

    // ...but the secret resume content must never reach the AI prompt.
    const promptSent = generateJSON.mock.calls[0][0];
    expect(promptSent).not.toContain(SECRET_SUMMARY);
    expect(promptSent).not.toContain("Rust");

    // And the interview must not be linked to someone else's resume.
    expect(Interview.create).toHaveBeenCalledWith(
      expect.objectContaining({ resume: undefined, user: attacker._id })
    );
  });

  test("an invalid/stale resume ID does not expose another user's data or error out", async () => {
    Resume.findById.mockResolvedValue(null); // stale/deleted resume

    const res = await request(app)
      .post("/api/interview/questions")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ role: "Backend Engineer", resumeId: fakeId("6") });

    expect(res.status).toBe(200);
    const promptSent = generateJSON.mock.calls[0][0];
    expect(promptSent).not.toContain(SECRET_SUMMARY);
    expect(Interview.create).toHaveBeenCalledWith(
      expect.objectContaining({ resume: undefined })
    );
  });
});
