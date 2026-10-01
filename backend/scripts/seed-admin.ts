import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { adminAuth } from '../src/config/firebase-admin.js';
import { env } from '../src/config/env.js';
import { User } from '../src/models/User.js';

const seedAdmin = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(env.MONGO_URI);
    console.log('Connected to MongoDB.');

    if (!adminAuth) {
      throw new Error('Firebase Admin Auth is not initialized.');
    }

    const email = 'emonpoddar01@gmail.com';
    const password = 'emon@7890';
    let firebaseUid = '';

    console.log(`Checking if admin user ${email} exists in Firebase...`);
    try {
      const userRecord = await adminAuth.getUserByEmail(email);
      firebaseUid = userRecord.uid;
      console.log('Admin user already exists in Firebase.');
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        console.log('Admin user not found in Firebase. Creating...');
        const newUser = await adminAuth.createUser({
          email,
          password,
          displayName: 'Admin'
        });
        firebaseUid = newUser.uid;
        console.log('Admin user created in Firebase.');
      } else {
        throw error;
      }
    }

    console.log('Setting custom claims for admin...');
    await adminAuth.setCustomUserClaims(firebaseUid, { role: 'ADMIN' });
    console.log('Custom claims set.');

    console.log('Checking if admin user exists in MongoDB...');
    let mongoUser = await User.findOne({ email });

    if (mongoUser) {
      console.log('Admin user already exists in MongoDB. Updating...');
      mongoUser.firebaseUid = firebaseUid;
      mongoUser.role = 'ADMIN';
      mongoUser.displayName = 'Admin';
      mongoUser.isActive = true;
      await mongoUser.save();
    } else {
      console.log('Admin user not found in MongoDB. Creating...');
      mongoUser = await User.create({
        firebaseUid,
        email,
        role: 'ADMIN',
        displayName: 'Admin',
        isActive: true
      });
    }

    console.log('Admin seed completed successfully.');
  } catch (error) {
    console.error('Error seeding admin:', error);
  } finally {
    console.log('Disconnecting from MongoDB...');
    await mongoose.disconnect();
    process.exit(0);
  }
};

seedAdmin();
