/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import fs from 'fs';

function getCredential() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    try {
      let str = serviceAccountJson.trim();
      if (!str.startsWith('{')) {
        str = Buffer.from(str, 'base64').toString('utf8');
      }
      return cert(JSON.parse(str));
    } catch (e) {
      console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', e);
    }
  }

  const serviceAccountKeyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKeyPath && fs.existsSync(serviceAccountKeyPath)) {
    try {
      const fileContent = JSON.parse(fs.readFileSync(serviceAccountKeyPath, 'utf8'));
      return cert(fileContent);
    } catch (e) {
      console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY file:', e);
    }
  }

  return undefined;
}

const credential = getCredential();

// Initialize firebase-admin instance once
const app = !getApps().length
  ? initializeApp({
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      ...(credential ? { credential } : {}),
    })
  : getApp();

export const adminAuth = getAuth(app);
export const adminApp = app;
export default app;
