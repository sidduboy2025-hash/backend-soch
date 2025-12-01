/*
Backend Firebase Admin initialization.

This file sets up firebase-admin using either of the following approaches (in order of preference):
1) FIREBASE_SERVICE_ACCOUNT env var — should contain BASE64-encoded JSON of the service account key.
   - This is helpful for platform env var injection (e.g., Render, Heroku, Vercel Serverless) where writing files isn't ideal.
2) GOOGLE_APPLICATION_CREDENTIALS env var — path to a JSON service account file on disk.

Add either approach to your environment and the code will initialize the admin SDK accordingly.

Usage:
const { admin } = require('./services/firebaseAdmin');

*/

const admin = require('firebase-admin');

function initFirebaseAdmin() {
  if (admin.apps && admin.apps.length > 0) {
    // Already initialized
    return admin;
  }

  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || process.env.FIREBASE_SERVICE_ACCOUNT;

  if (serviceAccountBase64) {
    try {
      const jsonStr = Buffer.from(serviceAccountBase64, 'base64').toString('utf8');
      const serviceAccount = JSON.parse(jsonStr);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      console.log('Firebase Admin initialized using FIREBASE_SERVICE_ACCOUNT_BASE64 / FIREBASE_SERVICE_ACCOUNT');
      return admin;
    } catch (err) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64:', err);
      throw err;
    }
  }

  // Fallback to GOOGLE_APPLICATION_CREDENTIALS that points to JSON file path.
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });

    console.log('Firebase Admin initialized using GOOGLE_APPLICATION_CREDENTIALS');
    return admin;
  }

  // If no credentials found, initialize default (limited) app — this will likely fail for admin operations but avoids crash in dev if desired.
  try {
    admin.initializeApp();
    console.warn('Firebase Admin initialized with default credentials (this may be limited)');
    return admin;
  } catch (err) {
    console.error('Unable to initialize Firebase Admin — please provide service account credentials');
    throw err;
  }
}

module.exports = initFirebaseAdmin();
