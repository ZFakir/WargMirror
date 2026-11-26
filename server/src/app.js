const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const passport = require('./config/passport');
const { requireAuth, requireAdmin } = require('./middleware/authMiddleware');
const compressionMiddleware = require('./middleware/compression');
const argRoutes = require('./routes/argRoutes');
const userRoutes = require('./routes/userRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const authRoutes = require('./routes/authRoutes');
const commentRoutes = require('./routes/commentRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const adminRoutes = require('./routes/adminRoutes');

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

  app.set('etag', 'weak');

  const corsOriginCheck = function (origin, callback) {
    const allowedOrigins = process.env.CLIENT_URL
      ? process.env.CLIENT_URL.split(',').map((url) => url.trim().replace(/\/$/, ''))
      : [];

    const normalizedOrigin = origin ? origin.trim().replace(/\/$/, '') : null;
    const isLocalDevelopment = process.env.NODE_ENV !== 'production' && normalizedOrigin && (normalizedOrigin.startsWith('http://localhost') || normalizedOrigin.startsWith('http://127.0.0.1'));

    if (!normalizedOrigin || allowedOrigins.includes(normalizedOrigin) || isLocalDevelopment) {
      callback(null, true);
    } else {
      callback(new Error('Origin not allowed by CORS'));
    }
  };

  app.use(cors({ origin: corsOriginCheck, credentials: true }));
  app.use(compressionMiddleware);
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.set('trust proxy', 1); // Trust first proxy (Render/Heroku/Vercel)

  // Fail fast in production rather than silently signing sessions with a known constant.
  let sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET must be set in production; refusing to start with a guessable secret.');
    }
    sessionSecret = 'warg-dev-secret';
  }

  const sessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 86400000, // 24 hours
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      partitioned: process.env.NODE_ENV === 'production',
      httpOnly: true
    }
  };

  if (process.env.NODE_ENV !== 'test') {

    const MySQLStore = require('express-mysql-session')(session);
    const dbUrl = new URL(process.env.DATABASE_URL);
    const sessionStore = new MySQLStore({
      host: dbUrl.hostname,
      port: dbUrl.port || 3306,
      user: dbUrl.username,
      password: dbUrl.password,
      database: dbUrl.pathname.slice(1), // remove leading "/"
      ssl: { rejectUnauthorized: false },
      createDatabaseTable: true,
      expiration: 86400000, // 24 hours
      connectionLimit: 2,
      clearExpired: true,
      checkExpirationInterval: 15 * 60 * 1000,
      endConnectionOnClose: true
    });

    sessionStore.on('error', (error) => {
      console.error('MySQL Session Store Error (Aiven spool down?):', error);
    });

    sessionOptions.store = sessionStore;
  }

  app.use(session(sessionOptions));

  // Passport middleware
  app.use(passport.initialize());
  app.use(passport.session());

  // Basic Route
  app.get('/', (req, res) => {
    res.json({ message: 'WARG Platform Backend is running!' });
  });

  // Health check (used by deployment platforms / uptime monitors).
  // Touches the database so that a ping keeps the Aiven connection warm,
  // and so a monitor can distinguish "server up" from "db reachable".
  app.get('/health', async (req, res) => {
    let db = 'up';
    try {
      const sequelize = require('./config/database');
      await sequelize.query('SELECT 1');
    } catch (e) {
      db = 'down';
    }
    // Always 200: Render-style health checks treat non-2xx as a failed deploy.
    res.set('Cache-Control', 'no-store');
    res.status(200).json({ status: 'ok', db });
  });

  // Mount API Routes
  app.use('/auth', authRoutes);
  app.use('/api/args', argRoutes);
  app.use('/api/users', requireAuth, userRoutes);
  app.use('/api/sessions', requireAuth, sessionRoutes);
  app.use('/api/comments', commentRoutes);
  app.use('/api/feedback', feedbackRoutes);

  const aiRoutes = require('./routes/aiRoutes');
  const minigameRoutes = require('./routes/minigameRoutes');
  const badgeRoutes = require('./routes/badgeRoutes');
  const demoRoutes = require('./routes/demoRoutes');

  app.use('/api/ai', aiRoutes);
  app.use('/api/minigames', minigameRoutes);
  app.use('/api/badges', badgeRoutes);
  app.use('/api/demo', demoRoutes);

  const gameRoutes = require('./routes/gameRoutes');

  app.use('/api/game', gameRoutes);
  app.use('/api/admin', requireAuth, requireAdmin, adminRoutes);

  const staticOptions = {
    extensions: ['html', 'htm'],
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      const base = path.basename(filePath).toLowerCase();
      if (base === 'sw.js' || ext === '.html' || ext === '.htm') {
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      } else if (['.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico'].includes(ext)) {
        res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      } else if (['.css', '.js'].includes(ext)) {
        res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400');
      }
    }
  };

  // Serve static files from the client directory at the root (e.g. /login)
  app.use(express.static(path.join(__dirname, '../../client'), staticOptions));

  // Also serve them under /client for backwards compatibility (e.g. /client/login)
  app.use('/client', express.static(path.join(__dirname, '../../client'), staticOptions));

  return app;
}

module.exports = createApp;
