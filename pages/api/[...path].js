import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

import jobCardRoutes from '../../server/routes/jobCardRoutes.js';
import invoiceRoutes from '../../server/routes/invoiceRoutes.js';
import challanRoutes from '../../server/routes/challanRoutes.js';
import paymentRoutes from '../../server/routes/paymentRoutes.js';
import authRoutes from '../../server/routes/authRoutes.js';
import settingRoutes from '../../server/routes/settingRoutes.js';
import notificationRoutes from '../../server/routes/notificationRoutes.js';
import paperStockRoutes from '../../server/routes/paperStockRoutes.js';
import statementRoutes from '../../server/routes/statementRoutes.js';
import estimateRoutes from '../../server/routes/estimateRoutes.js';
import itemRoutes from '../../server/routes/itemRoutes.js';
import staffRoutes from '../../server/routes/staffRoutes.js';
import roleRoutes from '../../server/routes/roleRoutes.js';
import { seedStaffAndRoles } from '../../server/utils/seedStaff.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..', '..');

const loadEnvFile = (filePath) => {
  if (process.env.MONGO_URI || !fs.existsSync(filePath)) return;
  dotenv.config({ path: filePath, override: false });
};

loadEnvFile(path.join(rootDir, '.env'));
loadEnvFile(path.join(rootDir, 'server', '.env'));

let dbPromise;
let hasSeeded = false;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;

  if (!dbPromise) {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing in Vercel Environment Variables.');
    }

    dbPromise = mongoose
      .connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
      })
      .then(async () => {
        if (!hasSeeded) {
          hasSeeded = true;
          await seedStaffAndRoles();
        }
      })
      .catch((error) => {
        dbPromise = undefined;
        throw error;
      });
  }

  await dbPromise;
};

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Vercel API Mongo Error:', error);
    res.status(500).json({
      error: 'Database connection failed',
      message: error.message,
    });
  }
});

app.use('/api/jobcard', jobCardRoutes);
app.use('/api/invoice', invoiceRoutes);
app.use('/api/challan', challanRoutes);
app.use('/api/payment-type', paymentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/paper-stock', paperStockRoutes);
app.use('/api/statements', statementRoutes);
app.use('/api/estimate', estimateRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/roles', roleRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'Active',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    message: 'CRM API running on Vercel',
  });
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

export default function handler(req, res) {
  if (!req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }

  return app(req, res);
}
