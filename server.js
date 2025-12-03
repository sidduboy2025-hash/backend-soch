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

// More permissive CORS for Google Auth issues
const corsOptions = {
  origin: function (origin, callback) {
    // If no origin (e.g., server-to-server or same-origin), allow
    if (!origin) {
      console.log('CORS: No origin header, allowing request');
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      console.log('CORS: Allowed origin:', origin);
      return callback(null, true);
    }
    
    // For development and debugging, log and allow all origins temporarily
    console.log('CORS: Allowing origin for debugging:', origin);
    return callback(null, true);
    
    // Uncomment this for production security:
    // console.log('CORS: Blocked origin:', origin);
    // return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Content-Length', 'X-Kuma-Revision'],
  preflightContinue: false,
  optionsSuccessStatus: 200
};

// Apply CORS before any other middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  } else {
    // Temporarily allow all origins for debugging
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('CORS: Handling preflight request from:', origin);
    res.status(200).end();
    return;
  }
  
  next();
});

// Apply the cors middleware as well for additional safety
app.use(cors(corsOptions));

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
  res.json({
    message: 'CORS test successful',
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
    allowedOrigins: [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'https://www.sochai.store',
      'http://localhost:3000',
      'http://localhost:5173'
    ]
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