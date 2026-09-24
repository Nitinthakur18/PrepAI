jest.mock("../../models/User", () => ({
  findById: jest.fn(),
}));

const User = require("../../models/User");
const { requireAuth } = require("../../middleware/auth");
const {
  signTestToken,
  signExpiredTestToken,
  fakeId,
  makeUser,
} = require("../helpers/testHelpers");

function mockReqRes(headers = {}) {
  const req = { headers };
  const res = {
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
  return { req, res };
}

describe("requireAuth middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("rejects requests with no Authorization header (401)", async () => {
    const { req, res } = mockReqRes({});
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  test("rejects an invalid/malformed token (401)", async () => {
    const { req, res } = mockReqRes({
      authorization: "Bearer this-is-not-a-valid-jwt",
    });
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("rejects an expired token (401)", async () => {
    const userId = fakeId("b");
    const token = signExpiredTestToken(userId);
    const { req, res } = mockReqRes({ authorization: `Bearer ${token}` });
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("rejects a valid token for a user that no longer exists (401)", async () => {
    const userId = fakeId("c");
    const token = signTestToken(userId);
    User.findById.mockResolvedValue(null);

    const { req, res } = mockReqRes({ authorization: `Bearer ${token}` });
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("allows a valid token and attaches the correct user to req.user", async () => {
    const user = makeUser({ _id: fakeId("d") });
    const token = signTestToken(user._id);
    User.findById.mockResolvedValue(user);

    const { req, res } = mockReqRes({ authorization: `Bearer ${token}` });
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull(); // never touched res
    expect(req.user).toBe(user);
    expect(User.findById).toHaveBeenCalledWith(user._id);
  });
});
