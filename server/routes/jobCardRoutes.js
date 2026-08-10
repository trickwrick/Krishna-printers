import express from 'express';
import mongoose from 'mongoose';
const router = express.Router();
import JobCard from '../models/JobCard.js';
import Notification from '../models/Notification.js';
import PaperStock from '../models/PaperStock.js';
import { logPaperStockTransaction } from '../utils/paperStockTransactions.js';

const computePlateUseCount = async (plateSize, editingId) => {
  if (!plateSize) return undefined;

  const normalizedSize = String(plateSize).trim();
  const existingCount = await JobCard.countDocuments({ plateSize: normalizedSize });

  if (!editingId) return existingCount + 1;

  const editingCard = await JobCard.findById(editingId).select('plateSize');
  if (String(editingCard?.plateSize || '').trim() === normalizedSize) return existingCount;

  return existingCount + 1;
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getCoverUsage = (job) => {
  if (!job || job.paperSource !== 'Company paper' || !job.paper || !job.paperGSM) return null;
  const qty = Number(job.coverPaperCount) > 0 ? Number(job.coverPaperCount) : Number(job.jobQty) || 0;
  if (qty <= 0) return null;
  return { paper: job.paper, paperGSM: String(job.paperGSM), qty };
};

const getInnerUsage = (job) => {
  if (!job || job.paperSource !== 'Company paper' || !job.innerPaper || !job.innerPaperGSM) return null;
  const qty = Number(job.innerPaperCount) || 0;
  if (qty <= 0) return null;
  return { paper: job.innerPaper, paperGSM: String(job.innerPaperGSM), qty };
};

const findCoverStock = async (paper) => {
  if (!paper) return null;
  return PaperStock.findOne({
    $or: [
      { coverName: { $regex: new RegExp(`^${escapeRegex(paper)}$`, 'i') } },
      { name: { $regex: new RegExp(`^${escapeRegex(paper)}$`, 'i') } }
    ],
    paperSource: 'Company paper'
  });
};

const findInnerStock = async (paper) => {
  if (!paper) return null;
  return PaperStock.findOne({
    $or: [
      { innerName: { $regex: new RegExp(`^${escapeRegex(paper)}$`, 'i') } },
      { name: { $regex: new RegExp(`^${escapeRegex(paper)}$`, 'i') } }
    ],
    paperSource: 'Company paper'
  });
};

const applyCoverDelta = async (paper, paperGSM, delta, meta = {}) => {
  if (!paper || !paperGSM || !delta) return;
  const stockItem = await findCoverStock(paper);
  if (!stockItem) return;

  const gsm = Number(paperGSM);
  let balanceAfter = 0;

  if (stockItem.coverGSM === gsm) {
    stockItem.coverQuantity = Math.max(0, (stockItem.coverQuantity || 0) - delta);
    stockItem.quantity = Math.max(0, (stockItem.quantity || 0) - delta);
    balanceAfter = stockItem.coverQuantity;
    await stockItem.save();
    console.log(`📦 Cover stock adjusted: ${paper} (${paperGSM} GSM) delta ${delta}, remaining ${stockItem.coverQuantity}`);
  } else if (stockItem.gsm === gsm) {
    stockItem.quantity = Math.max(0, (stockItem.quantity || 0) - delta);
    balanceAfter = stockItem.quantity;
    await stockItem.save();
    console.log(`📦 Cover stock adjusted (legacy): ${paper} (${paperGSM} GSM) delta ${delta}, remaining ${stockItem.quantity}`);
  } else {
    return;
  }

  await logPaperStockTransaction({
    paperStockId: stockItem._id,
    stockName: stockItem.name,
    paperName: paper,
    paperType: 'cover',
    transactionType: delta > 0 ? 'deduct' : 'add',
    quantity: Math.abs(delta),
    partyName: meta.partyName || '',
    jobNumber: meta.jobNumber || '',
    jobCardId: meta.jobCardId,
    paperSource: stockItem.paperSource || 'Company paper',
    balanceAfter,
    note: meta.note || (delta > 0 ? 'Deducted for job card' : 'Restored from job card update'),
  });
};

const applyInnerDelta = async (paper, paperGSM, delta, meta = {}) => {
  if (!paper || !paperGSM || !delta) return;
  const stockItem = await findInnerStock(paper);
  if (!stockItem) return;

  const gsm = Number(paperGSM);
  let balanceAfter = 0;

  if (stockItem.innerGSM === gsm) {
    stockItem.innerQuantity = Math.max(0, (stockItem.innerQuantity || 0) - delta);
    balanceAfter = stockItem.innerQuantity;
    await stockItem.save();
    console.log(`📦 Inner stock adjusted: ${paper} (${paperGSM} GSM) delta ${delta}, remaining ${stockItem.innerQuantity}`);
  } else if (stockItem.gsm === gsm) {
    stockItem.quantity = Math.max(0, (stockItem.quantity || 0) - delta);
    balanceAfter = stockItem.quantity;
    await stockItem.save();
    console.log(`📦 Inner stock adjusted (legacy): ${paper} (${paperGSM} GSM) delta ${delta}, remaining ${stockItem.quantity}`);
  } else {
    return;
  }

  await logPaperStockTransaction({
    paperStockId: stockItem._id,
    stockName: stockItem.name,
    paperName: paper,
    paperType: 'inner',
    transactionType: delta > 0 ? 'deduct' : 'add',
    quantity: Math.abs(delta),
    partyName: meta.partyName || '',
    jobNumber: meta.jobNumber || '',
    jobCardId: meta.jobCardId,
    paperSource: stockItem.paperSource || 'Company paper',
    balanceAfter,
    note: meta.note || (delta > 0 ? 'Deducted for job card' : 'Restored from job card update'),
  });
};

const syncStockFromJobChange = async (previousJob, newBody) => {
  const paperSource = newBody.paperSource || 'Company paper';
  if (paperSource !== 'Company paper') return;

  const oldCover = getCoverUsage(previousJob);
  const newCover = getCoverUsage({ ...newBody, paperSource });
  const oldInner = getInnerUsage(previousJob);
  const newInner = getInnerUsage({ ...newBody, paperSource });

  if (oldCover) {
    await applyCoverDelta(oldCover.paper, oldCover.paperGSM, -oldCover.qty, {
      partyName: previousJob?.partyName || previousJob?.companyName || '',
      jobNumber: previousJob?.jobNumber || '',
      jobCardId: previousJob?._id,
      note: 'Restored from job card update',
    });
  }
  if (oldInner) {
    await applyInnerDelta(oldInner.paper, oldInner.paperGSM, -oldInner.qty, {
      partyName: previousJob?.partyName || previousJob?.companyName || '',
      jobNumber: previousJob?.jobNumber || '',
      jobCardId: previousJob?._id,
      note: 'Restored from job card update',
    });
  }
  if (newCover) {
    await applyCoverDelta(newCover.paper, newCover.paperGSM, newCover.qty, {
      partyName: newBody.partyName || newBody.companyName || '',
      jobNumber: newBody.jobNumber || '',
      jobCardId: newBody._id,
      note: 'Deducted for job card',
    });
  }
  if (newInner) {
    await applyInnerDelta(newInner.paper, newInner.paperGSM, newInner.qty, {
      partyName: newBody.partyName || newBody.companyName || '',
      jobNumber: newBody.jobNumber || '',
      jobCardId: newBody._id,
      note: 'Deducted for job card',
    });
  }
};

// POST /api/jobcard - Save or Update Job Card
router.post('/', async (req, res) => {
  try {
    const { partyName, userName } = req.body;
    let { jobNumber } = req.body;

    // Auto-alias if needed
    if (partyName && !req.body.companyName) {
      req.body.companyName = partyName;
    }

    // Check if updating existing job card
    let jobCard;
    let isUpdate = false;
    let _id = req.body._id;
    if (_id && !mongoose.Types.ObjectId.isValid(_id)) {
      delete req.body._id;
      _id = null;
    }
    let previousJob = null;

    if (_id) {
      previousJob = await JobCard.findById(_id);
    }

    if (req.body.plateSize) {
      req.body.plateSize = String(req.body.plateSize).trim();
      req.body.plateUseCount = await computePlateUseCount(req.body.plateSize, _id);
    }

    if (_id) {
      // UPDATE by _id (most reliable)
      let updatePayload = { ...req.body, updatedAt: new Date() };
      
      // Determine what changed for timeline
      const timelineEvents = [];
      if (previousJob) {
        if (req.body.jobAttachment?.dataUrl && req.body.jobAttachment?.dataUrl !== previousJob.jobAttachment?.dataUrl) {
           timelineEvents.push({ action: 'Image Upload', details: `Uploaded ${req.body.jobAttachment.name || 'attachment'}`, userName: userName || 'System' });
        }
        if (req.body.paperSource === 'Company paper' && (req.body.coverPaperCount !== previousJob.coverPaperCount || req.body.innerPaperCount !== previousJob.innerPaperCount)) {
           timelineEvents.push({ action: 'Paper Updated', details: 'Updated paper stock allocation', userName: userName || 'System' });
        }
      }

      if (timelineEvents.length > 0) {
         updatePayload.$push = { timeline: { $each: timelineEvents } };
      }

      jobCard = await JobCard.findByIdAndUpdate(
        _id,
        updatePayload,
        { new: true }
      );
      if (jobCard) isUpdate = true;
    }

    if (!isUpdate && jobNumber) {
      const existingJob = await JobCard.findOne({ jobNumber });
      if (existingJob) {
        // UPDATE by jobNumber (fallback)
        isUpdate = true;
        previousJob = previousJob || existingJob;
        
        let updatePayload = { ...req.body, updatedAt: new Date() };
        const timelineEvents = [];
        if (req.body.jobAttachment?.dataUrl && req.body.jobAttachment?.dataUrl !== previousJob.jobAttachment?.dataUrl) {
           timelineEvents.push({ action: 'Image Upload', details: `Uploaded ${req.body.jobAttachment.name || 'attachment'}`, userName: userName || 'System' });
        }
        if (req.body.paperSource === 'Company paper' && (req.body.coverPaperCount !== previousJob.coverPaperCount || req.body.innerPaperCount !== previousJob.innerPaperCount)) {
           timelineEvents.push({ action: 'Paper Updated', details: 'Updated paper stock allocation', userName: userName || 'System' });
        }
        if (timelineEvents.length > 0) {
           updatePayload.$push = { timeline: { $each: timelineEvents } };
        }

        jobCard = await JobCard.findOneAndUpdate(
          { jobNumber },
          updatePayload,
          { new: true }
        );
      } else {
        // NEW job card with provided jobNumber
        const newJobPayload = { ...req.body };
        if (req.body.jobAttachment?.dataUrl) {
           newJobPayload.timeline = [{ action: 'Image Upload', details: `Uploaded ${req.body.jobAttachment.name || 'attachment'}`, userName: userName || 'System' }];
        }
        jobCard = new JobCard(newJobPayload);
        await jobCard.save();
      }
    } else if (!isUpdate) {
      // AUTO-GENERATE jobNumber
      const lastJob = await JobCard.findOne().sort({ createdAt: -1 }).select('jobNumber');
      let nextNum = 1;
      if (lastJob && lastJob.jobNumber) {
        const lastNum = parseInt(lastJob.jobNumber.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
      }
      const generatedJobNumber = `JOBKP-${String(nextNum).padStart(4, '0')}`;
      req.body.jobNumber = generatedJobNumber;
      
      const newJobPayload = { ...req.body };
      if (req.body.jobAttachment?.dataUrl) {
         newJobPayload.timeline = [{ action: 'Image Upload', details: `Uploaded ${req.body.jobAttachment.name || 'attachment'}`, userName: userName || 'System' }];
      }
      jobCard = new JobCard(newJobPayload);
      await jobCard.save();
    }


    // --- AUTO STOCK DEDUCTION LOGIC ---
    try {
      await syncStockFromJobChange(previousJob, {
        ...req.body,
        _id: jobCard?._id || req.body._id,
        jobNumber: jobCard?.jobNumber || req.body.jobNumber,
      });
    } catch (stockErr) {
      console.error("⚠️ Stock deduction failed:", stockErr.message);
      // We don't fail the whole job creation just because stock update failed
    }
    // ----------------------------------

    // Create Notification
    try {
      const notifMessage = isUpdate
        ? `Job Card updated: #${jobCard.jobNumber} for ${jobCard.partyName}`
        : `New Job Card created: #${jobCard.jobNumber} for ${jobCard.partyName}`;

      const newNotif = new Notification({
        type: isUpdate ? 'JOB_UPDATED' : 'JOB_CREATED',
        message: notifMessage
      });
      await newNotif.save();
    } catch (notifErr) {
      console.error("Failed to create notification:", notifErr.message);
    }

    console.log(`☁️ Job Card Saved to MongoDB: ${jobCard.jobNumber}`);
    res.status(201).json(jobCard);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Job Number already exists" });
    }
    console.error(`❌ Save Error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobcard/plate-used-count?plateSize=560*670&editingId=optional
router.get('/plate-used-count', async (req, res) => {
  try {
    const { plateSize, editingId } = req.query;
    if (!plateSize) return res.json({ plateUseCount: '' });

    const plateUseCount = await computePlateUseCount(String(plateSize).trim(), editingId);
    res.json({ plateUseCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobcard - Fetch all Job Cards (Active Only)
router.get('/', async (req, res) => {
  try {
    const jobCards = await JobCard.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 });
    res.json(jobCards);
  } catch (err) {
    console.error(`❌ Fetch Error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobcard/deleted/all - Fetch all deleted Job Cards
router.get('/deleted/all', async (req, res) => {
  try {
    const jobCards = await JobCard.find({ isDeleted: true }).sort({ deletedAt: -1 });
    res.json(jobCards);
  } catch (err) {
    console.error(`❌ Fetch Deleted Error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobcard/:id - Fetch single Job Card
router.get('/:id', async (req, res) => {
  try {
    const jobCard = await JobCard.findById(req.params.id);
    if (!jobCard) return res.status(404).json({ error: "Job Card not found" });
    res.json(jobCard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/jobcard/:id - Soft delete
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let result = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      result = await JobCard.findByIdAndUpdate(id, {
        isDeleted: true,
        deletedAt: new Date()
      });
    }
    if (!result) {
      result = await JobCard.findOneAndUpdate(
        { $or: [{ _id: id }, { jobNumber: id }] },
        { isDeleted: true, deletedAt: new Date() },
        { new: true }
      );
    }
    if (!result) return res.status(404).json({ message: "Job Card not found" });
    res.json({ message: "Job Card moved to recycle bin" });
  } catch (err) {
    console.error(`❌ Delete Error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/jobcard/:id/restore - Restore soft-deleted job card
router.put('/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;
    let result = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      result = await JobCard.findByIdAndUpdate(id, {
        isDeleted: false,
        deletedAt: null
      });
    }
    if (!result) {
      result = await JobCard.findOneAndUpdate(
        { $or: [{ _id: id }, { jobNumber: id }] },
        { isDeleted: false, deletedAt: null },
        { new: true }
      );
    }
    if (!result) return res.status(404).json({ message: "Job Card not found" });
    res.json({ message: "Job Card restored successfully" });
  } catch (err) {
    console.error(`❌ Restore Error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/jobcard/:id/price - Update only the price/totalAmount
router.patch('/:id/price', async (req, res) => {
  try {
    const { totalAmount } = req.body;
    const jobCard = await JobCard.findByIdAndUpdate(
      req.params.id,
      { totalAmount, updatedAt: new Date() },
      { new: true }
    );

    if (!jobCard) return res.status(404).json({ error: "Job Card not found" });

    // Create Notification
    try {
      const newNotif = new Notification({
        type: 'PRICE_UPDATED',
        message: `Price updated for Job #${jobCard.jobNumber}: ₹${totalAmount}`
      });
      await newNotif.save();
    } catch (nErr) {
      console.error("Notif Error:", nErr.message);
    }

    res.json(jobCard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.post('/sync-tally-direct', async (req, res) => {
  try {
    const jobCardData = req.body;
    if (!jobCardData || !jobCardData.partyName) {
      return res.status(400).json({ error: "Invalid Job Card data" });
    }

    const result = await syncJobCardToTally(jobCardData);

    res.json({ message: "Successfully synced to Tally Prime", details: result });
  } catch (err) {
    console.error(`❌ Tally Sync Error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});


// PATCH /api/jobcard/:id/status - Update job card status only
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, userName } = req.body;
    const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }
    const updated = await JobCard.findByIdAndUpdate(
      req.params.id,
      { 
        status, 
        updatedAt: new Date(),
        $push: {
          timeline: {
            action: 'Status Update',
            details: `Status changed to ${status}`,
            userName: userName || 'System'
          }
        }
      },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Job card not found' });
    res.json({ success: true, status: updated.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

