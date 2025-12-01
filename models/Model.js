const mongoose = require('mongoose');

const modelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Model name is required'],
    trim: true,
    maxlength: [100, 'Model name cannot be more than 100 characters']
  },
  slug: {
    type: String,
    unique: true,
    trim: true,
    lowercase: true
  },
  shortDescription: {
    type: String,
    required: [true, 'Short description is required'],
    trim: true,
    maxlength: [200, 'Short description cannot be more than 200 characters']
  },
  longDescription: {
    type: String,
    trim: true,
    maxlength: [2000, 'Long description cannot be more than 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'chatbots', 'image', 'code', 'productivity', 'voice', 
      'writing', 'research', 'agents', 'video', 'audio', 
      'data-analysis', 'language', 'design', 'automation', 
      'healthcare', 'education', 'marketing', 'finance'
    ]
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Each tag cannot be more than 30 characters']
  }],
  provider: {
    type: String,
    required: [true, 'Provider is required'],
    trim: true,
    maxlength: [50, 'Provider name cannot be more than 50 characters']
  },
  pricing: {
    type: String,
    enum: ['free', 'freemium', 'paid'],
    default: 'freemium'
  },
  rating: {
    type: Number,
    default: 0,
    min: [0, 'Rating cannot be negative'],
    max: [5, 'Rating cannot be more than 5']
  },
  reviewsCount: {
    type: Number,
    default: 0,
    min: [0, 'Reviews count cannot be negative']
  },
  installsCount: {
    type: Number,
    default: 0,
    min: [0, 'Installs count cannot be negative']
  },
  capabilities: [{
    type: String,
    enum: ['text', 'image', 'audio', 'video', 'code', 'agent']
  }],
  isApiAvailable: {
    type: Boolean,
    default: false
  },
  isOpenSource: {
    type: Boolean,
    default: false
  },
  modelType: {
    type: String,
    trim: true,
    maxlength: [50, 'Model type cannot be more than 50 characters']
  },
  externalUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Please enter a valid URL starting with http:// or https://'
    }
  },
  iconUrl: {
    type: String,
    trim: true
  },
  screenshots: [{
    type: String,
    trim: true
  }],
  featured: {
    type: Boolean,
    default: false
  },
  trendingScore: {
    type: Number,
    default: 0,
    min: [0, 'Trending score cannot be negative'],
    max: [100, 'Trending score cannot be more than 100']
  },
  bestFor: [{
    type: String,
    trim: true,
    maxlength: [50, 'Best for item cannot be more than 50 characters']
  }],
  features: [{
    type: String,
    trim: true,
    maxlength: [100, 'Each feature cannot be more than 100 characters']
  }],
  examplePrompts: [{
    type: String,
    trim: true,
    maxlength: [200, 'Each example prompt cannot be more than 200 characters']
  }],
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  rejectionReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Generate slug from name before saving
modelSchema.pre('save', async function(next) {
  if (this.isModified('name') || !this.slug) {
    let baseSlug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    let slug = baseSlug;
    let counter = 1;
    
    // Check for existing slugs and append counter if needed
    while (true) {
      const existingModel = await this.constructor.findOne({ 
        slug: slug, 
        _id: { $ne: this._id } 
      });
      
      if (!existingModel) {
        break;
      }
      
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    this.slug = slug;
  }
  next();
});

// Index for better query performance
modelSchema.index({ category: 1, status: 1 });
modelSchema.index({ uploadedBy: 1 });
modelSchema.index({ featured: -1, trendingScore: -1 });

module.exports = mongoose.model('Model', modelSchema);