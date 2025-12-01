# SochAI Backend

A simple Node.js backend API with MongoDB integration.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up MongoDB:
   - Make sure MongoDB is running locally on port 27017
   - Or update the `MONGODB_URI` in `.env` file with your MongoDB connection string

3. Configure environment variables:
   - Update `.env` file with your configuration

4. Start the server:
   ```bash
   # Development mode (with nodemon)
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### General Endpoints
- `GET /` - Basic API status
- `GET /api/health` - Health check endpoint
- `POST /api/hello` - Returns "Hello World" message

### Authentication Endpoints
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User authentication

### AI Models Endpoints
- `POST /api/models` - Upload a new AI model (Protected)
- `GET /api/models` - Get all approved models (Public)
- `GET /api/models/my-models` - Get user's uploaded models (Protected)
- `GET /api/models/:id` - Get a specific model by ID or slug (Public)
- `PUT /api/models/:id` - Update a model (Protected - owner only)
- `DELETE /api/models/:id` - Delete a model (Protected - owner only)

## API Documentation

### User Signup

**Endpoint:** `POST /api/auth/signup`

**Request Body:**
```json
{
  "firstName": "string (required, max 50 chars)",
  "lastName": "string (required, max 50 chars)",
  "email": "string (required, valid email)",
  "mobileNumber": "string (required, 10-digit number starting with 6-9)",
  "password": "string (required, min 6 chars)"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "id": "user_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "mobileNumber": "9876543210",
      "createdAt": "2025-11-30T..."
    },
    "token": "jwt_token_here"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Validation error",
  "errors": ["Error messages array"]
}
```

### User Login

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "string (required, valid email)",
  "password": "string (required)"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "mobileNumber": "9876543210",
      "createdAt": "2025-11-30T..."
    },
    "token": "jwt_token_here"
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

### Upload AI Model

**Endpoint:** `POST /api/models`
**Authentication:** Required (JWT Token)

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "string (required, max 100 chars)",
  "shortDescription": "string (required, max 200 chars)",
  "longDescription": "string (optional, max 2000 chars)",
  "category": "string (required, valid category)",
  "provider": "string (required, max 50 chars)",
  "pricing": "free|freemium|paid (default: freemium)",
  "modelType": "string (optional, max 50 chars)",
  "externalUrl": "string (optional, valid URL)",
  "isApiAvailable": "boolean (default: false)",
  "isOpenSource": "boolean (default: false)",
  "tags": "array of strings (optional)",
  "capabilities": "array (optional: text,image,audio,video,code,agent)",
  "bestFor": "array of strings (optional)",
  "features": "array of strings (optional)",
  "examplePrompts": "array of strings (optional)"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Model uploaded successfully and is pending review",
  "data": {
    "model": {
      "id": "model_id",
      "name": "GPT-4 Turbo Enhanced",
      "slug": "gpt-4-turbo-enhanced",
      "shortDescription": "Advanced language model...",
      "category": "chatbots",
      "provider": "OpenAI",
      "status": "pending",
      "createdAt": "2025-11-30T..."
    }
  }
}
```

### Get All Models

**Endpoint:** `GET /api/models`
**Authentication:** Not required

**Query Parameters:**
- `category` - Filter by category (optional)
- `pricing` - Filter by pricing model (optional)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `search` - Search in name, description, tags (optional)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "models": [
      {
        "id": "model_id",
        "name": "Model Name",
        "shortDescription": "Description...",
        "category": "chatbots",
        "provider": "Provider Name",
        "rating": 4.5,
        "reviewsCount": 150,
        "uploadedBy": {
          "firstName": "John",
          "lastName": "Doe"
        },
        "createdAt": "2025-11-30T..."
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalModels": 95,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Get User's Models

**Endpoint:** `GET /api/models/my-models`
**Authentication:** Required (JWT Token)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "models": [
      {
        "id": "model_id",
        "name": "My Model",
        "status": "pending",
        "category": "chatbots",
        "createdAt": "2025-11-30T..."
      }
    ],
    "count": 3
  }
}
```

## cURL Examples

### Authentication APIs

#### Test Health Endpoint
```bash
curl -X GET http://localhost:1000/api/health \
  -H "Content-Type: application/json"
```

## Firebase (Optional)

This backend repo supports initializing the Firebase Admin SDK for server-side Firebase operations (verify ID tokens, access Firestore, etc.). Follow either of the options below:

1) Recommended (CI/CaaS / production): Create a service account JSON file in the Firebase Console, then base64 encode it and set it in the `FIREBASE_SERVICE_ACCOUNT_BASE64` env var.
   - Example (local dev only):
     ```bash
     # on macOS / Linux
     cat serviceAccount.json | base64 | pbcopy
     # Paste into your environment variable management (or create `.env`) as FIREBASE_SERVICE_ACCOUNT_BASE64
     ```

2) Local dev (not recommended for production): Set `GOOGLE_APPLICATION_CREDENTIALS` to the path of the JSON service account file.

The sample `services/firebaseAdmin.js` is auto required at server start — it reads these env vars and initializes admin accordingly.

### Using Firebase tokens to protect an endpoint

You can optionally use Firebase Auth ID tokens to protect endpoints. The `middleware/firebaseAuth.js` middleware verifies the Firebase ID token and sets `req.firebaseUser`.

Example usage in a route (in place of the JWT-based `authenticateToken` middleware):

```js
const { verifyFirebaseIdToken } = require('./middleware/firebaseAuth');

app.get('/api/protected-firebase', verifyFirebaseIdToken, (req, res) => {
  res.json({ success: true, uid: req.firebaseUser.uid, claims: req.firebaseUser });
});
```



#### User Signup
```bash
curl -X POST http://localhost:1000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "mobileNumber": "9876543210",
    "password": "password123"
  }'
```

#### User Login
```bash
curl -X POST http://localhost:1000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "password123"
  }'
```

### AI Models APIs

#### Upload a New AI Model (Protected)
```bash
curl -X POST http://localhost:1000/api/models \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "GPT-4 Turbo Enhanced",
    "shortDescription": "Advanced language model with enhanced reasoning capabilities",
    "longDescription": "This model provides state-of-the-art performance for complex reasoning tasks, code generation, and creative writing with improved accuracy and speed.",
    "category": "chatbots",
    "provider": "OpenAI",
    "pricing": "paid",
    "modelType": "Large Language Model",
    "externalUrl": "https://openai.com/gpt-4-turbo",
    "isApiAvailable": true,
    "isOpenSource": false,
    "tags": ["language-model", "reasoning", "code-generation"],
    "capabilities": ["text", "code"],
    "bestFor": ["Developers", "Researchers", "Content Creators"],
    "features": [
      "128K context length",
      "Multimodal capabilities",
      "JSON mode support",
      "Function calling"
    ],
    "examplePrompts": [
      "Explain quantum computing in simple terms",
      "Write a Python function to sort a list",
      "Create a marketing strategy for a startup"
    ]
  }'
```

#### Get All Approved Models (Public)
```bash
curl -X GET "http://localhost:1000/api/models?category=chatbots&page=1&limit=10" \
  -H "Content-Type: application/json"
```

#### Get User's Uploaded Models (Protected)
```bash
curl -X GET http://localhost:1000/api/models/my-models \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Get Specific Model by ID/Slug (Public)
```bash
curl -X GET http://localhost:1000/api/models/gpt-4-turbo-enhanced \
  -H "Content-Type: application/json"
```

#### Update a Model (Protected)
```bash
curl -X PUT http://localhost:1000/api/models/MODEL_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Updated Model Name",
    "shortDescription": "Updated description",
    "pricing": "freemium"
  }'
```

#### Delete a Model (Protected)
```bash
curl -X DELETE http://localhost:1000/api/models/MODEL_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Test Hello Endpoint
```bash
curl -X POST http://localhost:1000/api/hello \
  -H "Content-Type: application/json"
```

## Validation Rules

### Signup Validation
- **firstName**: Required, max 50 characters
- **lastName**: Required, max 50 characters
- **email**: Required, must be valid email format
- **mobileNumber**: Required, 10-digit number starting with 6-9
- **password**: Required, minimum 6 characters

### Login Validation
- **email**: Required, must be valid email format
- **password**: Required

### Model Upload Validation
- **name**: Required, max 100 characters, unique per user
- **shortDescription**: Required, max 200 characters
- **longDescription**: Optional, max 2000 characters
- **category**: Required, must be valid category from predefined list
- **provider**: Required, max 50 characters
- **pricing**: Optional, must be 'free', 'freemium', or 'paid'
- **externalUrl**: Optional, must be valid URL if provided
- **tags**: Optional array, each tag max 30 characters
- **capabilities**: Optional array from: text, image, audio, video, code, agent
- **bestFor**: Optional array, each item max 50 characters
- **features**: Optional array, each feature max 100 characters
- **examplePrompts**: Optional array, each prompt max 200 characters

### Valid Categories
- chatbots, image, code, productivity, voice, writing, research, agents
- video, audio, data-analysis, language, design, automation
- healthcare, education, marketing, finance

## Authentication

For protected endpoints, include the JWT token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

You get the JWT token from successful login/signup responses.

## Model Status System

When you upload a model, it goes through a review process:

- **pending**: Newly uploaded, awaiting review
- **approved**: Reviewed and approved, visible to public
- **rejected**: Rejected during review, only visible to owner

You can only edit models with 'pending' or 'rejected' status. Approved models require contacting support for changes.

## Error Handling

The API returns consistent error responses:

- **400 Bad Request**: Validation errors, duplicate entries
- **401 Unauthorized**: Invalid/missing authentication token
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server errors

All error responses include:
```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Array of specific errors"] // Optional
}
```

## Database Relations

- Each **User** can upload multiple **Models**
- Each **Model** belongs to one **User** (uploadedBy field)
- User's `uploadedModels` array contains references to their models
- Models are automatically assigned slugs based on their names
- Only approved models are visible in public API endpoints# sochai-siddu-backend
# backend-soch
# backend-soch
