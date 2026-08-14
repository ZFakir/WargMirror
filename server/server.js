const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const sequelize = require('./src/config/database');
const { sequelize: db } = require('./src/models');
const argRoutes = require('./src/routes/argRoutes');
const userRoutes = require('./src/routes/userRoutes');
const sessionRoutes = require('./src/routes/sessionRoutes');
const app = express();
const server = http.createServer(app);

// Setup Socket.io for live/co-op game modes
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for now. In production, restrict this to your frontend URL
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Basic Route
app.get('/', (req, res) => {
  res.json({ message: 'WARG Platform Backend is running!' });
});

// Mount API Routes
app.use('/api/args', argRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sessions', sessionRoutes);

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
