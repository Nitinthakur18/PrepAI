jest.mock("../../models/User", () => ({ findById: jest.fn() }));
jest.mock("../../models/Resume", () => ({ find: jest.fn() }));
jest.mock("../../models/Interview", () => ({ find: jest.fn() }));
// app.js transitively loads utils/gemini via resumeRoutes -> resumeController;
// mock it so tests never construct a real Gemini client or warn about a
// missing API key.
jest.mock("../../utils/gemini", () => ({
  generateJSON: jest.fn(),
  generateContent: jest.fn(),
}));

const request = require("supertest");
const app = require("../../app");
const User = require("../../models/User");
const Resume = require("../../models/Resume");
const Interview = require("../../models/Interview");
const { signTestToken, fakeId, makeUser } = require("../helpers/testHelpers");

const owner = makeUser({ _id: fakeId("1") });
const ownerToken = signTestToken(owner._id);

// Resume.find(filter).sort(...) — single-level chain.
function mockFindSort(model, resolvedValue) {
  model.find.mockReturnValue({
    sort: jest.fn().mockResolvedValue(resolvedValue),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  User.findById.mockResolvedValue(owner);
});

describe("Analytics isolation", () => {
  test("unauthenticated request is rejected (401)", async () => {
    const res = await request(app).get("/api/analytics/dashboard");
    expect(res.status).toBe(401);
    // and it must never have queried the DB for aggregate/global stats
    expect(Resume.find).not.toHaveBeenCalled();
  });

  test("authenticated user receives only their own stats, scoped by user id", async () => {
    const myResumes = [
      { analysis: { atsScore: 90 }, createdAt: new Date(), originalName: "r1.pdf" },
    ];
    const myInterviews = [{ overallScore: 8, createdAt: new Date(), mode: "mock-interview", role: "SWE", questions: [] }];
    mockFindSort(Resume, myResumes);
    mockFindSort(Interview, myInterviews);

    const res = await request(app)
      .get("/api/analytics/dashboard")
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalResumes).toBe(1);
    expect(res.body.data.totalInterviews).toBe(1);
    expect(res.body.data.averageAtsScore).toBe(90);

    // The query must be scoped to this user's id — never a global/empty filter.
    expect(Resume.find).toHaveBeenCalledWith({ user: owner._id });
    expect(Interview.find).toHaveBeenCalledWith({
      user: owner._id,
      status: "completed",
    });
  });

  test("stats reflect ONLY the fixture returned for this user, never a broader dataset", async () => {
    // Simulate the DB mock as if it were correctly scoped — returns just
    // this user's 2 resumes, none of some other user's data.
    const myResumes = [
      { analysis: { atsScore: 70 }, createdAt: new Date(), originalName: "a.pdf" },
      { analysis: { atsScore: 80 }, createdAt: new Date(), originalName: "b.pdf" },
    ];
    mockFindSort(Resume, myResumes);
    mockFindSort(Interview, []);

    const res = await request(app)
      .get("/api/analytics/dashboard")
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalResumes).toBe(2);
    expect(res.body.data.averageAtsScore).toBe(75); // (70+80)/2, not inflated by other users
  });
});
