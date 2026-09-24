jest.mock("../../models/User", () => ({ findById: jest.fn() }));
jest.mock("../../models/Interview", () => ({
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
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
const Interview = require("../../models/Interview");
const { generateJSON } = require("../../utils/gemini");
const { signTestToken, fakeId, makeUser } = require("../helpers/testHelpers");

const owner = makeUser({ _id: fakeId("1") });
const attacker = makeUser({ _id: fakeId("2") });
const ownerToken = signTestToken(owner._id);
const attackerToken = signTestToken(attacker._id);

function ownedInterviewFixture(overrides = {}) {
  return {
    _id: fakeId("7"),
    user: owner._id,
    role: "Backend Engineer",
    mode: "mock-interview",
    status: "in-progress",
    questions: [
      {
        question: "Explain how a hash map works.",
        category: "Technical",
        difficulty: "Medium",
        answer: "",
        score: null,
        feedback: "",
      },
    ],
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  User.findById.mockImplementation(async (id) => {
    if (id === owner._id) return owner;
    if (id === attacker._id) return attacker;
    return null;
  });
  generateJSON.mockResolvedValue({ score: 8, feedback: "Solid answer.", summary: "Good job." });
});

describe("Interview authorization", () => {
  describe("GET /api/interview/:id", () => {
    test("owner can retrieve their own interview (200)", async () => {
      const interview = ownedInterviewFixture();
      Interview.findById.mockResolvedValue(interview);

      const res = await request(app)
        .get(`/api/interview/${interview._id}`)
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
    });

    test("non-owner receives 404", async () => {
      const interview = ownedInterviewFixture();
      Interview.findById.mockResolvedValue(interview);

      const res = await request(app)
        .get(`/api/interview/${interview._id}`)
        .set("Authorization", `Bearer ${attackerToken}`);

      expect(res.status).toBe(404);
    });

    test("unauthenticated request is rejected (401)", async () => {
      const res = await request(app).get(`/api/interview/${fakeId("7")}`);
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/interview/mock/answer", () => {
    test("owner can submit an answer", async () => {
      const interview = ownedInterviewFixture();
      Interview.findById.mockResolvedValue(interview);

      const res = await request(app)
        .post("/api/interview/mock/answer")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          interviewId: interview._id,
          questionIndex: 0,
          answer: "A hash map uses a hash function to map keys to buckets.",
        });

      expect(res.status).toBe(200);
      expect(interview.save).toHaveBeenCalled();
    });

    test("non-owner cannot submit an answer to another user's interview", async () => {
      const interview = ownedInterviewFixture();
      Interview.findById.mockResolvedValue(interview);

      const res = await request(app)
        .post("/api/interview/mock/answer")
        .set("Authorization", `Bearer ${attackerToken}`)
        .send({ interviewId: interview._id, questionIndex: 0, answer: "hijacked" });

      expect(res.status).toBe(404);
      expect(interview.save).not.toHaveBeenCalled();
    });

    test("unauthenticated answer submission is rejected (401) — cannot be called anonymously", async () => {
      const res = await request(app)
        .post("/api/interview/mock/answer")
        .send({ interviewId: fakeId("7"), questionIndex: 0, answer: "anon" });

      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/interview/mock/finish", () => {
    test("owner can finish their own interview", async () => {
      const interview = ownedInterviewFixture({
        questions: [
          {
            question: "Q1",
            category: "Technical",
            difficulty: "Medium",
            answer: "answer",
            score: 8,
            feedback: "good",
          },
        ],
      });
      Interview.findById.mockResolvedValue(interview);

      const res = await request(app)
        .post("/api/interview/mock/finish")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ interviewId: interview._id });

      expect(res.status).toBe(200);
      expect(interview.save).toHaveBeenCalled();
    });

    test("non-owner cannot finish another user's interview", async () => {
      const interview = ownedInterviewFixture();
      Interview.findById.mockResolvedValue(interview);

      const res = await request(app)
        .post("/api/interview/mock/finish")
        .set("Authorization", `Bearer ${attackerToken}`)
        .send({ interviewId: interview._id });

      expect(res.status).toBe(404);
      expect(interview.save).not.toHaveBeenCalled();
    });

    test("unauthenticated finish is rejected (401) — cannot be called anonymously", async () => {
      const res = await request(app)
        .post("/api/interview/mock/finish")
        .send({ interviewId: fakeId("7") });

      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /api/interview/:id", () => {
    test("owner can delete their own interview", async () => {
      const interview = ownedInterviewFixture();
      Interview.findById.mockResolvedValue(interview);
      Interview.findByIdAndDelete.mockResolvedValue(interview);

      const res = await request(app)
        .delete(`/api/interview/${interview._id}`)
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(Interview.findByIdAndDelete).toHaveBeenCalledWith(interview._id);
    });

    test("non-owner cannot delete another user's interview", async () => {
      const interview = ownedInterviewFixture();
      Interview.findById.mockResolvedValue(interview);

      const res = await request(app)
        .delete(`/api/interview/${interview._id}`)
        .set("Authorization", `Bearer ${attackerToken}`);

      expect(res.status).toBe(404);
      expect(Interview.findByIdAndDelete).not.toHaveBeenCalled();
    });

    test("unauthenticated delete is rejected (401)", async () => {
      const res = await request(app).delete(`/api/interview/${fakeId("7")}`);
      expect(res.status).toBe(401);
    });
  });
});
