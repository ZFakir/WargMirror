const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const sequelize = require('./src/config/database');
const { sequelize: db } = require('./src/models');
const createApp = require('./src/app');

const app = createApp();
const server = http.createServer(app);
server.keepAliveTimeout = 65000; // 65 seconds
server.headersTimeout = 66000; // 66 seconds

// Setup Socket.io for live/co-op game modes
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      // In production, configure CLIENT_URL in your environment variables.
      // For multiple origins (e.g., local dev + prod), separate them with commas in your .env
      const allowedOrigins = process.env.CLIENT_URL
        ? process.env.CLIENT_URL.split(',').map(url => url.trim().replace(/\/$/, ''))
        : [];

      const normalizedOrigin = origin ? origin.trim().replace(/\/$/, '') : null;
      const isLocalDevelopment = process.env.NODE_ENV !== 'production' && normalizedOrigin && normalizedOrigin.startsWith('http://localhost');

      if (!normalizedOrigin || allowedOrigins.includes(normalizedOrigin) || isLocalDevelopment) {
        callback(null, true);
      } else {
        callback(new Error('Origin not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`A user connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Start Server & Connect to Database
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Test the database connection and sync models
    await sequelize.authenticate();
    console.log('✅ Connection to the database has been established successfully.');
    await db.sync({ alter: false });
    console.log('✅ Database models synced.');

    server.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error.message);
    console.log('Starting server anyway (without DB connection)...');

    server.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT} (No Database)`);
    });
  }
}

startServer();

// ── Self-ping to prevent Render free-tier cold starts ────────────────
// Render spins down free services after ~15 min of inactivity.
// This hits our own /ping endpoint every 14 min to keep the process
// (and the DB connection it checks) alive.
if (process.env.NODE_ENV === 'production') {
  const PING_INTERVAL_MS = 14 * 60 * 1000; // 14 minutes
  const SELF_URL =
    process.env.RENDER_EXTERNAL_URL ||   // Render injects this automatically
    `http://localhost:${PORT}`;

  setInterval(async () => {
    try {
      const res = await fetch(`${SELF_URL}/ping`);
      const body = await res.json();
      console.log(`[self-ping] ${new Date().toISOString()} → ${body.status}`);
    } catch (err) {
      console.error(`[self-ping] failed: ${err.message}`);
    }
  }, PING_INTERVAL_MS);

  console.log(
    `🏓 Self-ping enabled every ${PING_INTERVAL_MS / 60000} min → ${SELF_URL}/ping`
  );
}
// Trigger nodemon
