import * as admin from 'firebase-admin';
import { env } from './env.js';
import fs from 'fs';

let adminAuth: admin.auth.Auth | null = null;
let adminDb: admin.firestore.Firestore | null = null;

try {
  let credential;

  if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    let jsonStr = env.FIREBASE_SERVICE_ACCOUNT_JSON.trim();
    if (!jsonStr.startsWith('{')) {
      jsonStr = Buffer.from(jsonStr, 'base64').toString('utf8');
    }
    const serviceAccount = JSON.parse(jsonStr);
    credential = admin.credential.cert(serviceAccount);
  } else if (env.FIREBASE_SERVICE_ACCOUNT_KEY && fs.existsSync(env.FIREBASE_SERVICE_ACCOUNT_KEY)) {
    const serviceAccount = JSON.parse(fs.readFileSync(env.FIREBASE_SERVICE_ACCOUNT_KEY, 'utf8'));
    credential = admin.credential.cert(serviceAccount);
  } else {
    // Falls back to GOOGLE_APPLICATION_CREDENTIALS if set, otherwise uses default
    credential = admin.credential.applicationDefault();
  }

  admin.initializeApp({
    credential,
  });

  adminAuth = admin.auth();
  adminDb = admin.firestore();
  console.log('Firebase Admin SDK initialized successfully.');
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
}

export { adminAuth, adminDb };
