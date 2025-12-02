const express = require('express');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const User = require('../models/User');

const router = express.Router();

// JWT Secret - In production, this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// Validation schemas
const signupSchema = Joi.object({
  firstName: Joi.string().trim().max(50).required().messages({
    'string.empty': 'First name is required',
    'string.max': 'First name cannot be more than 50 characters',
    'any.required': 'First name is required'
  }),
  lastName: Joi.string().trim().max(50).required().messages({
    'string.empty': 'Last name is required',
    'string.max': 'Last name cannot be more than 50 characters',
    'any.required': 'Last name is required'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'string.empty': 'Email is required',
    'any.required': 'Email is required'
  }),
  mobileNumber: Joi.string().pattern(/^[6-9]\d{9}$/).required().messages({
    'string.pattern.base': 'Please enter a valid 10-digit mobile number starting with 6-9',
    'string.empty': 'Mobile number is required',
    'any.required': 'Mobile number is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'string.empty': 'Password is required',
    'any.required': 'Password is required'
  })
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'string.empty': 'Email is required',
    'any.required': 'Email is required'
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required',
    'any.required': 'Password is required'
  })
});

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    // Validate input data
    const { error, value } = signupSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { firstName, lastName, email, mobileNumber, password } = value;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: email.toLowerCase() },
        { mobileNumber }
      ]
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'User with this mobile number already exists'
        });
      }
    }

    // Create new user
    const user = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      mobileNumber,
      password
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          mobileNumber: user.mobileNumber,
          createdAt: user.createdAt,
          subscriptionType: user.subscriptionType,
          subscriptionStatus: user.subscriptionStatus,
          isProUser: user.isProUser
        },
        token
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    
    // Handle specific MongoDB errors
    if (error.name === 'MongooseError' && error.message.includes('bufferCommands')) {
      return res.status(503).json({
        success: false,
        message: 'Database connection not ready. Please try again in a moment.',
        error: 'Database connection issue'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    // Validate input data
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { email, password } = value;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          mobileNumber: user.mobileNumber,
          createdAt: user.createdAt,
          subscriptionType: user.subscriptionType,
          subscriptionStatus: user.subscriptionStatus,
          isProUser: user.isProUser
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    
    // Handle specific MongoDB errors
    if (error.name === 'MongooseError' && error.message.includes('bufferCommands')) {
      return res.status(503).json({
        success: false,
        message: 'Database connection not ready. Please try again in a moment.',
        error: 'Database connection issue'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update user subscription status (Admin only for testing)
router.put('/admin/update-subscription/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { subscriptionType, isProUser } = req.body;
    
    // Validation schema for subscription update
    const subscriptionUpdateSchema = Joi.object({
      subscriptionType: Joi.string().valid('free', 'pro', 'enterprise').required(),
      isProUser: Joi.boolean().required()
    });
    
    const { error } = subscriptionUpdateSchema.validate({ subscriptionType, isProUser });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update subscription details
    user.subscriptionType = subscriptionType;
    user.isProUser = isProUser;
    
    if (subscriptionType !== 'free') {
      user.subscriptionStatus = 'active';
    }
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'User subscription updated successfully',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          subscriptionType: user.subscriptionType,
          isProUser: user.isProUser,
          subscriptionStatus: user.subscriptionStatus
        }
      }
    });
    
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all users (Admin only for testing)
router.get('/admin/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: {
        users
      }
    });
    
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;