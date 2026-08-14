const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
require('dotenv').config();

const sequelize = require('./src/config/database');
const passport = require('./src/config/passport');
const { sequelize: db } = require('./src/models');
const argRoutes = require('./src/routes/argRoutes');
const userRoutes = require('./src/routes/userRoutes');
const sessionRoutes = require('./src/routes/sessionRoutes');
const authRoutes = require('./src/routes/authRoutes');
const app = express();
const server = http.createServer(app);

// Setup Socket.io for live/co-op game modes
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for now. In production, restrict this to your frontend URL
    methods: ['GET', 'POST']
  }
});

// Build MySQL session store from DATABASE_URL
const dbUrl = new URL(process.env.DATABASE_URL);
const sessionStoreOptions = new MySQLStore({
  host: dbUrl.hostname,
  port: dbUrl.port || 3306,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1), // remove leading "/"
  ssl: { rejectUnauthorized: false },
  createDatabaseTable: true,
  expiration: 86400000 // 24 hours
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));
app.use(express.json());

// Session middleware (must come before passport)
app.use(session({
  secret: process.env.SESSION_SECRET || 'warg-dev-secret',
  store: sessionStoreOptions,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 86400000, // 24 hours
    secure: false,    // Set to true in production with HTTPS
    httpOnly: true
  }
}));

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
