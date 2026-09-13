const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const sequelize = require('./src/config/database');
const { sequelize: db } = require('./src/models');
const createApp = require('./src/app');

const app = createApp();
const server = http.createServer(app);

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

      if (!normalizedOrigin || allowedOrigins.includes(normalizedOrigin)) {
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
