const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
// Initialize Firebase Admin SDK (will read env vars for credentials)
require('./services/firebaseAdmin');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Configure CORS - allow frontend(s) defined in env vars or default to localhost + the production frontend
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'https://www.sochai.store',
  'https://sochai.store',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:2000'
];



// CORS middleware - must be the very first middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  console.log(`[${new Date().toISOString()}] CORS: ${req.method} ${req.path} from origin: ${origin}`);
  
  // Always set CORS headers - be very explicit
  res.setHeader('Access-Control-Allow-Origin', origin || 'https://www.sochai.store');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Handle preflight requests immediately and explicitly
  if (req.method === 'OPTIONS') {
    console.log(`[${new Date().toISOString()}] CORS: Preflight request for ${req.path} - responding with 200`);
    res.status(200).send('OK');
    return;
  }
  
  next();
});

// Also apply express CORS as backup
app.use(cors({
  origin: function (origin, callback) {
    console.log('Express CORS: Processing origin:', origin);
    // Allow all origins for debugging
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Ensure we allow popups to be checked for window.closed in cross-origin cases
// If your hosting provider already sets Cross-Origin-Opener-Policy, this may
// be overridden at the platform level. For best compatibility with OAuth popups
// (Google Sign-in popup), use `same-origin-allow-popups` where appropriate.
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  // Do not set `Cross-Origin-Embedder-Policy` unless necessary; it can cause
  // resource loading issues and stricter cross-origin restrictions.
  next();
});
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
const categoriesRoutes = require('./routes/categories');
const testRoutes = require('./routes/test');
const paymentsRoutes = require('./routes/payments');

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

// Global OPTIONS handler for any missed preflight requests
app.options('*', (req, res) => {
  console.log(`[${new Date().toISOString()}] Global OPTIONS handler for: ${req.path}`);
  res.header('Access-Control-Allow-Origin', req.headers.origin || 'https://www.sochai.store');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).send('OK');
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'SochAI Backend API is running!' });
});

// Authentication routes (protected with database connection check)
app.use('/api/auth', checkDatabaseConnection, authRoutes);

// Model routes (protected with database connection check)
app.use('/api/models', checkDatabaseConnection, modelRoutes);

// Categories (public endpoint - but depends on database for counts)
app.use('/api/categories', checkDatabaseConnection, categoriesRoutes);

// Test routes (for development only)
app.use('/api/test', checkDatabaseConnection, testRoutes);

// Payments (Razorpay) routes
app.use('/api/payments', checkDatabaseConnection, paymentsRoutes);

// Simple POST API that returns "Hello World"
app.post('/api/hello', (req, res) => {
  res.json({ 
    message: 'Hello World',
    timestamp: new Date().toISOString(),
    method: 'POST'
  });
});

// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  console.log('CORS test endpoint hit from origin:', req.headers.origin);
  res.json({
    message: 'CORS test successful',
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
    method: req.method,
    headers: req.headers
  });
});

// Simple OPTIONS handler for testing
app.options('/api/cors-test', (req, res) => {
  console.log('OPTIONS request for cors-test from:', req.headers.origin);
  res.status(200).end();
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
      console.log(`- GET  /api/categories`);
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