const express = require('express');
const cors = require('cors');
const session = require('express-session');
require('dotenv').config();

const passport = require('./config/passport');
const argRoutes = require('./routes/argRoutes');
const userRoutes = require('./routes/userRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const authRoutes = require('./routes/authRoutes');
const commentRoutes = require('./routes/commentRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');

/**
 * Builds and returns a configured Express app WITHOUT starting an HTTP
 * listener or Socket.io. Kept separate from server.js so that tests
 * (Supertest) can import just the request-handling layer.
 *
 * Session storage: in production/development this uses MySQLStore (backed
 * by DATABASE_URL) so sessions survive restarts. In tests (NODE_ENV=test)
 * it falls back to express-session's in-memory store, since integration
 * tests don't need persistent sessions and it avoids requiring a session
 * table / extra MySQL connection pool per test run.
 */
function createApp() {
  const app = express();

  const corsOriginCheck = function (origin, callback) {
    const allowedOrigins = process.env.CLIENT_URL
      ? process.env.CLIENT_URL.split(',').map((url) => url.trim().replace(/\/$/, ''))
      : [];

    const normalizedOrigin = origin ? origin.trim().replace(/\/$/, '') : null;
    const isLocalDevelopment = process.env.NODE_ENV !== 'production' && normalizedOrigin && normalizedOrigin.startsWith('http://localhost');

    if (!normalizedOrigin || allowedOrigins.includes(normalizedOrigin) || isLocalDevelopment) {
      callback(null, true);
    } else {
      callback(new Error('Origin not allowed by CORS'));
    }
  };

  app.use(cors({ origin: corsOriginCheck, credentials: true }));
  app.use(express.json());

  app.set('trust proxy', 1); // Trust first proxy (Render/Heroku/Vercel)

  const sessionOptions = {
    secret: process.env.SESSION_SECRET || 'warg-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 86400000, // 24 hours
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      httpOnly: true
    }
  };

  if (process.env.NODE_ENV !== 'test') {
    // eslint-disable-next-line global-require
    const MySQLStore = require('express-mysql-session')(session);
    const dbUrl = new URL(process.env.DATABASE_URL);
    sessionOptions.store = new MySQLStore({
      host: dbUrl.hostname,
      port: dbUrl.port || 3306,
      user: dbUrl.username,
      password: dbUrl.password,
      database: dbUrl.pathname.slice(1), // remove leading "/"
      ssl: { rejectUnauthorized: false },
      createDatabaseTable: true,
      expiration: 86400000 // 24 hours
    });
  }

  app.use(session(sessionOptions));

  // Passport middleware
  app.use(passport.initialize());
  app.use(passport.session());

  // Basic Route
  app.get('/', (req, res) => {
    res.json({ message: 'WARG Platform Backend is running!' });
  });

  // Mount API Routes
  app.use('/auth', authRoutes);
  app.use('/api/args', argRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/sessions', sessionRoutes);
  app.use('/api/comments', commentRoutes);
  app.use('/api/feedback', feedbackRoutes);

  const gameRoutes = require('./routes/gameRoutes');
  const requireAuth = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ error: 'Unauthorized' });
  };
  app.use('/api/game', requireAuth, gameRoutes);

  const path = require('path');
  app.use('/client', express.static(path.join(__dirname, '../../client')));

  return app;
}

module.exports = createApp;
