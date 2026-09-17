jest.mock('../../src/models', () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn()
  }
}));
jest.mock('bcryptjs', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hashed-password')
}));

const { User } = require('../../src/models');
const authController = require('../../src/controllers/authController');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('authController.signup (unit, mocked models)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when a required field is missing', async () => {
    const req = { body: { username: 'a', email: 'a@example.com' } }; // no password
    const res = mockRes();

    await authController.signup(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringMatching(/required/i) })
    );
    expect(User.create).not.toHaveBeenCalled();
  });

  it('returns 400 when the email is already taken', async () => {
    User.findOne.mockResolvedValue({ email: 'dupe@example.com', username: 'other' });
    const req = { body: { username: 'new', email: 'dupe@example.com', password: 'pw' } };
    const res = mockRes();

    await authController.signup(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/email already in use/i) }));
  });

  it('returns 400 when the username is already taken', async () => {
    User.findOne.mockResolvedValue({ email: 'different@example.com', username: 'taken' });
    const req = { body: { username: 'taken', email: 'fresh@example.com', password: 'pw' } };
    const res = mockRes();

    await authController.signup(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/username already taken/i) }));
  });

  it('creates the user and logs them in on success', async () => {
    User.findOne.mockResolvedValue(null);
    const createdUser = { user_id: 42, username: 'new', email: 'new@example.com', role: 'player' };
    User.create.mockResolvedValue(createdUser);

    const req = {
      body: { username: 'new', email: 'new@example.com', password: 'pw' },
      logIn: jest.fn((user, cb) => cb(null))
    };
    const res = mockRes();

    await authController.signup(req, res);

    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'new', email: 'new@example.com', auth_provider: 'local' })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Signup successful', user: expect.objectContaining({ user_id: 42 }) })
    );
  });

  it('returns 500 if req.logIn fails after creating the user', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({ user_id: 1, username: 'x', email: 'x@example.com', role: 'player' });

    const req = {
      body: { username: 'x', email: 'x@example.com', password: 'pw' },
      logIn: jest.fn((user, cb) => cb(new Error('session failure')))
    };
    const res = mockRes();

    await authController.signup(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('returns 500 when the database throws unexpectedly', async () => {
    User.findOne.mockRejectedValue(new Error('connection lost'));
    const req = { body: { username: 'x', email: 'x@example.com', password: 'pw' } };
    const res = mockRes();

    await authController.signup(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('authController.checkUserExists (unit, mocked models)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports exists:true, field:email when an email match is found', async () => {
    User.findOne.mockResolvedValueOnce({ email: 'a@example.com' });
    const req = { query: { email: 'a@example.com' } };
    const res = mockRes();

    await authController.checkUserExists(req, res);

    expect(res.json).toHaveBeenCalledWith({ exists: true, field: 'email' });
  });

  it('reports exists:false when nothing matches', async () => {
    User.findOne.mockResolvedValue(null);
    const req = { query: { email: 'nobody@example.com' } };
    const res = mockRes();

    await authController.checkUserExists(req, res);

    expect(res.json).toHaveBeenCalledWith({ exists: false });
  });
});
