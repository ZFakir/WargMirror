const { signup, checkUserExists, updateAccount, deleteAccount, forgotPassword, resetPassword } = require('../../src/controllers/authController');
const { User } = require('../../src/models');
const bcrypt = require('bcryptjs');

jest.mock('../../src/models', () => ({
  User: { findOne: jest.fn(), create: jest.fn(), update: jest.fn(), destroy: jest.fn() }
}));

jest.mock('bcryptjs', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn()
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

  describe('updateAccount', () => {
    it('should update account successfully', async () => {
      req.isAuthenticated = jest.fn().mockReturnValue(true);
      req.user = { user_id: 1, email: 'old@example.com', auth_provider: 'local', password_hash: 'old_hash' };
      req.body = { email: 'new@example.com', password: 'newpassword', current_password: 'oldpassword' };
      
      bcrypt.compare.mockResolvedValue(true);
      User.findOne.mockResolvedValue(null);
      User.update.mockResolvedValue([1]);
      
      await updateAccount(req, res);
      
      expect(bcrypt.compare).toHaveBeenCalledWith('oldpassword', 'old_hash');
      expect(User.update).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Account updated successfully' });
    });

    it('should return 401 if current password is wrong', async () => {
      req.isAuthenticated = jest.fn().mockReturnValue(true);
      req.user = { user_id: 1, email: 'old@example.com', auth_provider: 'local', password_hash: 'old_hash' };
      req.body = { password: 'newpassword', current_password: 'wrongpassword' };

      bcrypt.compare.mockResolvedValue(false);

      await updateAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Current password is incorrect.' });
      expect(User.update).not.toHaveBeenCalled();
    });

    it('should return 401 if not authenticated', async () => {
      req.isAuthenticated = jest.fn().mockReturnValue(false);
      await updateAccount(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 if google account', async () => {
      req.isAuthenticated = jest.fn().mockReturnValue(true);
      req.user = { auth_provider: 'google' };
      await updateAccount(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if email already in use', async () => {
      req.isAuthenticated = jest.fn().mockReturnValue(true);
      req.user = { user_id: 1, email: 'old@example.com', auth_provider: 'local' };
      req.body = { email: 'new@example.com' };
      
      User.findOne.mockResolvedValue({ user_id: 2 });
      
      await updateAccount(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle errors', async () => {
      req.isAuthenticated = jest.fn().mockReturnValue(true);
      req.user = { user_id: 1, auth_provider: 'local' };
      req.body = { email: 'new@example.com' };
      
      User.findOne.mockRejectedValue(new Error('DB'));
      await updateAccount(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('forgotPassword', () => {
    it('should return 400 if email is missing', async () => {
      req.body = {};
      await forgotPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should generate a token and generic response for a local account', async () => {
      req.body = { email: 'user@example.com' };
      User.findOne.mockResolvedValue({ user_id: 1, email: 'user@example.com', auth_provider: 'local' });
      User.update.mockResolvedValue([1]);

      await forgotPassword(req, res);

      expect(User.update).toHaveBeenCalledWith(
        expect.objectContaining({
          password_reset_token: expect.any(String),
          password_reset_expires: expect.any(Date)
        }),
        { where: { user_id: 1 } }
      );
      expect(res.json).toHaveBeenCalledWith({ message: 'If that email is registered, a reset link has been created.' });
    });

    it('should return the same generic response for an unknown email (no enumeration)', async () => {
      req.body = { email: 'nobody@example.com' };
      User.findOne.mockResolvedValue(null);

      await forgotPassword(req, res);

      expect(User.update).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'If that email is registered, a reset link has been created.' });
    });

    it('should not issue a token for Google accounts', async () => {
      req.body = { email: 'google@example.com' };
      User.findOne.mockResolvedValue({ user_id: 2, email: 'google@example.com', auth_provider: 'google' });

      await forgotPassword(req, res);

      expect(User.update).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'If that email is registered, a reset link has been created.' });
    });

    it('should handle errors', async () => {
      req.body = { email: 'user@example.com' };
      User.findOne.mockRejectedValue(new Error('DB'));
      await forgotPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('resetPassword', () => {
    it('should return 400 if token or password is missing', async () => {
      req.body = { token: 'abc' };
      await resetPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if password is too short', async () => {
      req.body = { token: 'abc', password: '123' };
      await resetPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Password must be at least 6 characters.' });
    });

    it('should return 400 for an invalid or expired token', async () => {
      req.body = { token: 'expired-token', password: 'newpassword' };
      User.findOne.mockResolvedValue(null);

      await resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired reset token.' });
    });

    it('should reset the password and clear the token on success', async () => {
      req.body = { token: 'valid-token', password: 'newpassword' };
      User.findOne.mockResolvedValue({ user_id: 1 });
      User.update.mockResolvedValue([1]);

      await resetPassword(req, res);

      expect(User.update).toHaveBeenCalledWith(
        expect.objectContaining({
          password_hash: 'hashed_password',
          password_reset_token: null,
          password_reset_expires: null
        }),
        { where: { user_id: 1 } }
      );
      expect(res.json).toHaveBeenCalledWith({ message: 'Password reset successful. You can now log in.' });
    });

    it('should handle errors', async () => {
      req.body = { token: 'valid-token', password: 'newpassword' };
      User.findOne.mockRejectedValue(new Error('DB'));
      await resetPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteAccount', () => {
    it('should delete account and logout', async () => {
      req.isAuthenticated = jest.fn().mockReturnValue(true);
      req.user = { user_id: 1 };
      req.logout = jest.fn((cb) => cb(null));
      User.destroy.mockResolvedValue(1);
      
      await deleteAccount(req, res);
      
      expect(User.destroy).toHaveBeenCalledWith({ where: { user_id: 1 } });
      expect(req.logout).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Account deleted successfully' });
    });

    it('should return 401 if not authenticated', async () => {
      req.isAuthenticated = jest.fn().mockReturnValue(false);
      await deleteAccount(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should handle logout errors gracefully', async () => {
      req.isAuthenticated = jest.fn().mockReturnValue(true);
      req.user = { user_id: 1 };
      req.logout = jest.fn((cb) => cb(new Error('Logout Error')));
      
      await deleteAccount(req, res);
      expect(res.json).toHaveBeenCalledWith({ message: 'Account deleted successfully' });
    });

    it('should handle general errors', async () => {
      req.isAuthenticated = jest.fn().mockReturnValue(true);
      req.user = { user_id: 1 };
      User.destroy.mockRejectedValue(new Error('DB'));
      
      await deleteAccount(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
