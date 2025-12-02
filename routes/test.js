const express = require('express');
const User = require('../models/User');
const Model = require('../models/Model');

const router = express.Router();

// POST /api/test/seed - Create sample data for testing
router.post('/seed', async (req, res) => {
  try {
    // Create sample users
    const sampleUsers = [
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        mobileNumber: '9123456789',
        password: 'password123',
        subscriptionType: 'free',
        isProUser: false
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        mobileNumber: '9876543210',
        password: 'password123',
        subscriptionType: 'pro',
        isProUser: true
      },
      {
        firstName: 'Bob',
        lastName: 'Wilson',
        email: 'bob@example.com',
        mobileNumber: '8555555555',
        password: 'password123',
        subscriptionType: 'enterprise',
        isProUser: true
      }
    ];

    // Clear existing users (for testing)
    await User.deleteMany({});
    
    // Create new users
    const createdUsers = await User.create(sampleUsers);
    console.log('Created users:', createdUsers);

    // Create sample models
    const sampleModels = [
      {
        name: 'GPT-4 Enhanced',
        shortDescription: 'Advanced language model for complex conversations',
        longDescription: 'A powerful AI model that can handle complex reasoning tasks',
        category: 'chatbots',
        provider: 'OpenAI',
        pricing: 'paid',
        uploadedBy: createdUsers[1]._id, // Jane (pro user)
        status: 'pending',
        tags: ['language', 'chatbot', 'AI'],
        capabilities: ['text'],
        isApiAvailable: true,
        isOpenSource: false
      },
      {
        name: 'Vision Pro',
        shortDescription: 'State-of-the-art image recognition model',
        longDescription: 'Advanced computer vision model for image analysis',
        category: 'image',
        provider: 'Google',
        pricing: 'freemium',
        uploadedBy: createdUsers[2]._id, // Bob (pro user)
        status: 'approved',
        tags: ['vision', 'image', 'recognition'],
        capabilities: ['image'],
        isApiAvailable: true,
        isOpenSource: true
      }
    ];

    // Clear existing models (for testing)
    await Model.deleteMany({});
    
    // Create new models
    const createdModels = await Model.create(sampleModels);
    console.log('Created models:', createdModels);

    res.json({
      success: true,
      message: 'Sample data created successfully',
      data: {
        users: createdUsers.length,
        models: createdModels.length
      }
    });

  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create sample data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;