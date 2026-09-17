const { signup, checkUserExists } = require('../../src/controllers/authController');
const { User } = require('../../src/models');
const bcrypt = require('bcryptjs');

jest.mock('../../src/models', () => ({
  User: { findOne: jest.fn(), create: jest.fn() }
}));

jest.mock('bcryptjs', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hashed_password')
}));

describe('authController', () => {
  let req, res;
  beforeEach(() => {
    jest.clearAllMocks();
    req = { body: {}, query: {}, logIn: jest.fn((user, cb) => cb(null)) };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('signup', () => {
    it('should sign up a user successfully', async () => {
      req.body = { username: 'testuser', email: 'test@example.com', password: 'password123' };
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({ user_id: 1, username: 'testuser', email: 'test@example.com', role: 'user' });

      await signup(req, res);

      expect(User.create).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        auth_provider: 'local'
      });
      expect(req.logIn).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Signup successful' }));
    });

    it('should return 400 if fields are missing', async () => {
      req.body = { username: 'testuser' }; // missing email and password
      await signup(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if email is already in use', async () => {
      req.body = { username: 'testuser', email: 'test@example.com', password: 'password123' };
      User.findOne.mockResolvedValue({ email: 'test@example.com' });
      await signup(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email already in use.' });
    });

    it('should return 400 if username is taken', async () => {
      req.body = { username: 'testuser', email: 'test@example.com', password: 'password123' };
      User.findOne.mockResolvedValue({ username: 'testuser' });
      await signup(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Username already taken.' });
    });

    it('should handle login error after signup', async () => {
      req.body = { username: 'testuser', email: 'test@example.com', password: 'password123' };
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({ user_id: 1 });
      req.logIn = jest.fn((user, cb) => cb(new Error('Login failed')));

      await signup(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to log in after signup.' });
    });

    it('should handle general errors', async () => {
      req.body = { username: 'testuser', email: 'test@example.com', password: 'password123' };
      User.findOne.mockRejectedValue(new Error('DB Error'));
      await signup(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('checkUserExists', () => {
    it('should return exists true if email found', async () => {
      req.query = { email: 'test@example.com' };
      User.findOne.mockResolvedValue({ email: 'test@example.com' });
      await checkUserExists(req, res);
      expect(res.json).toHaveBeenCalledWith({ exists: true, field: 'email' });
    });

    it('should return exists true if username found', async () => {
      req.query = { username: 'testuser' };
      User.findOne.mockResolvedValue({ username: 'testuser' });
      await checkUserExists(req, res);
      expect(res.json).toHaveBeenCalledWith({ exists: true, field: 'username' });
    });

    it('should return exists false if neither found', async () => {
      req.query = { username: 'testuser' };
      User.findOne.mockResolvedValue(null);
      await checkUserExists(req, res);
      expect(res.json).toHaveBeenCalledWith({ exists: false });
    });

    it('should handle errors', async () => {
      req.query = { email: 'test@example.com' };
      User.findOne.mockRejectedValue(new Error('DB Error'));
      await checkUserExists(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
