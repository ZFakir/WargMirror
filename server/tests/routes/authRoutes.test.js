const request = require('supertest');
const express = require('express');
const passport = require('passport');

// Mock authController before importing the router
jest.mock('../../src/controllers/authController', () => ({
  signup: (req, res) => res.status(201).json({ message: 'Signup success' }),
  checkUserExists: (req, res) => res.status(200).json({ exists: false })
}));

const authRoutes = require('../../src/routes/authRoutes');

const app = express();
app.use(express.json());

// Mock passport authenticate
jest.spyOn(passport, 'authenticate').mockImplementation((strategy, callback) => {
  return (req, res, next) => {
    if (strategy === 'google') {
      if (req.query.error === 'true') {
        return callback(new Error('Google error'), null, null)(req, res, next);
      }
      if (req.query.deny === 'true') {
        return callback(null, false, null)(req, res, next);
      }
      return callback(null, { user_id: 1, username: 'test' }, null)(req, res, next);
    }
    if (strategy === 'local') {
      if (req.body.error === 'true') {
        return callback(new Error('Local error'), null, null)(req, res, next);
      }
      if (req.body.fail === 'true') {
        return callback(null, false, { message: 'Auth failed' })(req, res, next);
      }
      return callback(null, { user_id: 1, username: 'test' }, null)(req, res, next);
    }
    next();
  };
});

app.use((req, res, next) => {
  req.logIn = (user, done) => {
    if (req.query.loginError === 'true' || req.body.loginError === 'true') {
      return done(new Error('Login error'));
    }
    done();
  };
  req.isAuthenticated = () => req.headers.auth === 'true';
  req.user = { user_id: 1, username: 'test', email: 'test@example.com', role: 'player' };
  req.logout = (cb) => {
    if (req.headers.logouterror === 'true') {
      return cb(new Error('Logout error'));
    }
    cb();
  };
  req.session = {
    destroy: (cb) => cb()
  };
  next();
});

app.use('/auth', authRoutes);

describe('Auth Routes', () => {
  describe('GET /auth/google/callback', () => {
    it('should redirect to login with server_error if passport returns error', async () => {
      const res = await request(app).get('/auth/google/callback?error=true');
      expect(res.status).toBe(302);
      expect(res.header.location).toContain('login.html?error=server_error');
    });

    it('should redirect to login with auth_failed if passport returns no user', async () => {
      const res = await request(app).get('/auth/google/callback?deny=true');
      expect(res.status).toBe(302);
      expect(res.header.location).toContain('login.html?error=auth_failed');
    });

    it('should redirect to login with session_error if logIn fails', async () => {
      const res = await request(app).get('/auth/google/callback?loginError=true');
      expect(res.status).toBe(302);
      expect(res.header.location).toContain('login.html?error=session_error');
    });

    it('should redirect to home on successful login', async () => {
      const res = await request(app).get('/auth/google/callback');
      expect(res.status).toBe(302);
      expect(res.header.location).toContain('home.html');
    });
  });

  describe('POST /auth/login', () => {
    it('should return 500 on server error', async () => {
      const res = await request(app).post('/auth/login').send({ error: 'true' });
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Server error during authentication');
    });

    it('should return 401 on auth failure', async () => {
      const res = await request(app).post('/auth/login').send({ fail: 'true' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Auth failed');
    });

    it('should return 500 on session error', async () => {
      const res = await request(app).post('/auth/login').send({ loginError: 'true' });
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Session error');
    });

    it('should return 200 on successful login', async () => {
      const res = await request(app).post('/auth/login').send({});
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Login successful');
    });
  });

  describe('GET /auth/me', () => {
    it('should return user info if authenticated', async () => {
      const res = await request(app).get('/auth/me').set('auth', 'true');
      expect(res.status).toBe(200);
      expect(res.body.user_id).toBe(1);
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/auth/me').set('auth', 'false');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /auth/logout', () => {
    it('should redirect to login after logout', async () => {
      const res = await request(app).get('/auth/logout');
      expect(res.status).toBe(302);
      expect(res.header.location).toContain('login.html');
    });

    it('should return 500 if logout fails', async () => {
      const res = await request(app).get('/auth/logout').set('logouterror', 'true');
      expect(res.status).toBe(500);
    });
  });
});
