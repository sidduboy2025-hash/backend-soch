const express = require('express');
const Joi = require('joi');
const Model = require('../models/Model');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Validation schema for model upload
const modelSchema = Joi.object({
  name: Joi.string().trim().max(100).required().messages({
    'string.empty': 'Model name is required',
    'string.max': 'Model name cannot be more than 100 characters',
    'any.required': 'Model name is required'
  }),
  shortDescription: Joi.string().trim().max(200).required().messages({
    'string.empty': 'Short description is required',
    'string.max': 'Short description cannot be more than 200 characters',
    'any.required': 'Short description is required'
  }),
  longDescription: Joi.string().trim().max(2000).allow('').messages({
    'string.max': 'Long description cannot be more than 2000 characters'
  }),
  category: Joi.string().valid(
    'chatbots', 'image', 'code', 'productivity', 'voice', 
    'writing', 'research', 'agents', 'video', 'audio', 
    'data-analysis', 'language', 'design', 'automation', 
    'healthcare', 'education', 'marketing', 'finance'
  ).required().messages({
    'any.only': 'Please select a valid category',
    'any.required': 'Category is required'
  }),
  tags: Joi.array().items(
    Joi.string().trim().max(30).messages({
      'string.max': 'Each tag cannot be more than 30 characters'
    })
  ).default([]),
  provider: Joi.string().trim().max(50).required().messages({
    'string.empty': 'Provider is required',
    'string.max': 'Provider name cannot be more than 50 characters',
    'any.required': 'Provider is required'
  }),
  pricing: Joi.string().valid('free', 'freemium', 'paid').default('freemium'),
  capabilities: Joi.array().items(
    Joi.string().valid('text', 'image', 'audio', 'video', 'code', 'agent')
  ).default([]),
  isApiAvailable: Joi.boolean().default(false),
  isOpenSource: Joi.boolean().default(false),
  modelType: Joi.string().trim().max(50).allow('').messages({
    'string.max': 'Model type cannot be more than 50 characters'
  }),
  externalUrl: Joi.string().uri().allow('').messages({
    'string.uri': 'Please enter a valid URL'
  }),
  bestFor: Joi.array().items(
    Joi.string().trim().max(50).messages({
      'string.max': 'Each "best for" item cannot be more than 50 characters'
    })
  ).default([]),
  features: Joi.array().items(
    Joi.string().trim().max(100).messages({
      'string.max': 'Each feature cannot be more than 100 characters'
    })
  ).default([]),
  examplePrompts: Joi.array().items(
    Joi.string().trim().max(200).messages({
      'string.max': 'Each example prompt cannot be more than 200 characters'
    })
  ).default([])
});

// POST /api/models - Upload a new AI model (Protected)
router.post('/', authenticateToken, async (req, res) => {
  try {
    // Check if user is a pro user
    if (!req.user.isProUser) {
      return res.status(403).json({
        success: false,
        message: 'Pro subscription required to upload models. Please upgrade your subscription to continue.'
      });
    }

    // Validate input data
    const { error, value } = modelSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    // Check if model with same name already exists for this user
    const existingModel = await Model.findOne({ 
      name: value.name,
      uploadedBy: req.user._id 
    });

    if (existingModel) {
      return res.status(400).json({
        success: false,
        message: 'You have already uploaded a model with this name'
      });
    }

    // Create new model
    const model = new Model({
      ...value,
      uploadedBy: req.user._id
    });

    await model.save();

    // Add model to user's uploadedModels array
    await User.findByIdAndUpdate(
      req.user._id,
      { $push: { uploadedModels: model._id } }
    );

    res.status(201).json({
      success: true,
      message: 'Model uploaded successfully and is pending review',
      data: {
        model: {
          id: model._id,
          name: model.name,
          slug: model.slug,
          shortDescription: model.shortDescription,
          category: model.category,
          provider: model.provider,
          status: model.status,
          createdAt: model.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Model upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/models/my-models - Get user's uploaded models (Protected)
router.get('/my-models', authenticateToken, async (req, res) => {
  try {
    const models = await Model.find({ uploadedBy: req.user._id })
      .sort({ createdAt: -1 })
      .select('-uploadedBy');

    res.json({
      success: true,
      data: {
        models,
        count: models.length
      }
    });

  } catch (error) {
    console.error('Get user models error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/models - Get all approved models (Public)
router.get('/', async (req, res) => {
  try {
    const { category, pricing, page = 1, limit = 20, search, includePending } = req.query;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    // If includePending is true, show both approved and pending models, otherwise only approved
    if (includePending === 'true') {
      filter.status = { $in: ['approved', 'pending'] };
    } else {
      filter.status = 'approved';
    }
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (pricing && pricing !== 'all') {
      filter.pricing = pricing;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const models = await Model.find(filter)
      .populate('uploadedBy', 'firstName lastName')
      .sort({ featured: -1, trendingScore: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-rejectionReason');

    const totalModels = await Model.countDocuments(filter);
    const totalPages = Math.ceil(totalModels / limit);

    res.json({
      success: true,
      data: {
        models,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalModels,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get models error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/models/:id - Get a specific model by ID (Public)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if the id is a valid ObjectId
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid model ID format'
      });
    }

    const model = await Model.findOne({
      _id: id,
      status: 'approved'
    }).populate('uploadedBy', 'firstName lastName');

    if (!model) {
      return res.status(404).json({
        success: false,
        message: 'Model not found'
      });
    }

    res.json({
      success: true,
      data: { model }
    });

  } catch (error) {
    console.error('Get model error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/models/:id - Update a model (Protected - only owner)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    // Find model by ID and check ownership
    const model = await Model.findOne({
      _id: req.params.id,
      uploadedBy: req.user._id
    });

    if (!model) {
      return res.status(404).json({
        success: false,
        message: 'Model not found or you do not have permission to edit it'
      });
    }

    // Only allow editing if status is pending or rejected
    if (model.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit an approved model. Contact support if changes are needed.'
      });
    }

    // Validate update data
    const { error, value } = modelSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    // Update model
    Object.assign(model, value);
    if (model.status === 'rejected') {
      model.status = 'pending'; // Reset to pending when updating a rejected model
      model.rejectionReason = undefined;
    }

    await model.save();

    res.json({
      success: true,
      message: 'Model updated successfully',
      data: { model }
    });

  } catch (error) {
    console.error('Update model error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/models/:id - Delete a model (Protected - only owner)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const model = await Model.findOne({
      _id: req.params.id,
      uploadedBy: req.user._id
    });

    if (!model) {
      return res.status(404).json({
        success: false,
        message: 'Model not found or you do not have permission to delete it'
      });
    }

    await Model.findByIdAndDelete(req.params.id);

    // Remove model from user's uploadedModels array
    await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { uploadedModels: req.params.id } }
    );

    res.json({
      success: true,
      message: 'Model deleted successfully'
    });

  } catch (error) {
    console.error('Delete model error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ADMIN ENDPOINTS

// GET /api/models/admin/pending - Get all pending models (Admin)
router.get('/admin/pending', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const models = await Model.find({ status: 'pending' })
      .populate('uploadedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalModels = await Model.countDocuments({ status: 'pending' });
    const totalPages = Math.ceil(totalModels / limit);

    res.json({
      success: true,
      data: {
        models,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalModels,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get pending models error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/models/admin/:id/status - Update model status (Admin)
router.put('/admin/:id/status', async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: pending, approved, or rejected'
      });
    }

    if (status === 'rejected' && !rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required when rejecting a model'
      });
    }

    const model = await Model.findById(req.params.id)
      .populate('uploadedBy', 'firstName lastName email');

    if (!model) {
      return res.status(404).json({
        success: false,
        message: 'Model not found'
      });
    }

    model.status = status;
    if (status === 'rejected') {
      model.rejectionReason = rejectionReason;
    } else {
      model.rejectionReason = undefined;
    }

    await model.save();

    res.json({
      success: true,
      message: `Model ${status} successfully`,
      data: { model }
    });

  } catch (error) {
    console.error('Update model status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/models/admin/all - Get all models with any status (Admin)
router.get('/admin/all', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    const models = await Model.find(filter)
      .populate('uploadedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalModels = await Model.countDocuments(filter);
    const totalPages = Math.ceil(totalModels / limit);

    res.json({
      success: true,
      data: {
        models,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalModels,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get all models error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;