import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import JobCard from './models/JobCard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnvPath = path.join(__dirname, '..', '.env');
const serverEnvPath = path.join(__dirname, '.env');

if (fs.existsSync(rootEnvPath)) dotenv.config({ path: rootEnvPath, override: false });
if (fs.existsSync(serverEnvPath)) dotenv.config({ path: serverEnvPath, override: false });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const jobs = await JobCard.find({ isDeleted: { $ne: true } }).sort({ createdAt: 1 });
  console.log('Total jobs found:', jobs.length);
  
  let seq = 1;
  for (const job of jobs) {
    const newNumber = 'JOBKP-' + String(seq).padStart(4, '0');
    if (job.jobNumber !== newNumber) {
      job.jobNumber = newNumber;
      await job.save();
    }
    seq++;
  }
  
  console.log('All jobs re-sequenced successfully!');
  await mongoose.disconnect();
}

run().catch(console.error);
