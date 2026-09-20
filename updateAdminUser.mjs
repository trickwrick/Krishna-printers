import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
const envPath = path.join(__dirname, 'server', '.env');
const rootEnvPath = path.join(__dirname, '.env');
if (fs.existsSync(rootEnvPath)) dotenv.config({ path: rootEnvPath });
else if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) { console.error('MONGO_URI not found in .env'); process.exit(1); }

import User from './server/models/User.js';

async function updateAdmin() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected!\n');

  // Update existing admin or create new one if it doesn't exist
  // We'll just run a blanket update on anyone with role 'Admin' or email 'admin@gmail.com'
  const result = await User.updateMany(
    { $or: [{ email: 'admin@gmail.com' }, { roleName: 'Admin' }] },
    { $set: { email: 'krishna.printers@gmail.com', password: 'KP#Trickwrick@2026' } }
  );

  console.log(`Updated ${result.modifiedCount} admin users.`);
  
  if (result.modifiedCount === 0) {
      console.log('No existing admin found, relying on seed script.');
  }

  console.log('\n=== DONE! ===');
  await mongoose.disconnect();
  process.exit(0);
}

updateAdmin().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
