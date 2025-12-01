const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
// Initialize Firebase Admin SDK (will read env vars for credentials)
require('./services/firebaseAdmin');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection middleware for protected routes
const checkDatabaseConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database connection is not ready. Please try again in a moment.',
      error: 'Database not connected'
    });
  }
  next();
};

// Import routes
const authRoutes = require('./routes/auth');
const modelRoutes = require('./routes/models');

// MongoDB Connection
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sochai-backend';

// Connection options for Render free services (slow response times)
const mongoOptions = {
  serverSelectionTimeoutMS: 100000, // 100 seconds
  socketTimeoutMS: 100000, // 100 seconds
  connectTimeoutMS: 100000, // 100 seconds
  bufferCommands: false,
  maxPoolSize: 10,
  minPoolSize: 5
};

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'SochAI Backend API is running!' });
});

// Authentication routes (protected with database connection check)
app.use('/api/auth', checkDatabaseConnection, authRoutes);

// Model routes (protected with database connection check)
app.use('/api/models', checkDatabaseConnection, modelRoutes);

// Simple POST API that returns "Hello World"
app.post('/api/hello', (req, res) => {
  res.json({ 
    message: 'Hello World',
    timestamp: new Date().toISOString(),
    method: 'POST'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await mongoose.connect(mongoURI, mongoOptions);
    console.log('Connected to MongoDB successfully');
    
    // Start server only after database connection is established
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`API endpoints:`);
      console.log(`- GET  /api/health`);
      console.log(`- POST /api/hello`);
      console.log(`- POST /api/auth/signup`);
      console.log(`- POST /api/auth/login`);
      console.log(`- POST /api/models (protected)`);
      console.log(`- GET  /api/models`);
      console.log(`- GET  /api/models/my-models (protected)`);
      console.log(`- GET  /api/models/:id`);
      console.log(`- PUT  /api/models/:id (protected)`);
      console.log(`- DELETE /api/models/:id (protected)`);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1); // Exit the process if database connection fails
  }
};

// Start the server
startServer();

module.exports = app;