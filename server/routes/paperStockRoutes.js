import express from 'express';
const router = express.Router();
import PaperStock from '../models/PaperStock.js';
import PaperStockTransaction from '../models/PaperStockTransaction.js';
import { logPaperStockTransaction } from '../utils/paperStockTransactions.js';
import { reconcilePaperStock } from '../utils/paperStockReconciliation.js';
import { backfillPaperStockTransactionsIfEmpty } from '../utils/backfillPaperStockTransactions.js';

// GET /api/paper-stock/transactions - Stock add/deduct history
router.get('/transactions', async (req, res) => {
  try {
    await backfillPaperStockTransactionsIfEmpty();
    const transactions = await PaperStockTransaction.find().sort({ createdAt: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/paper-stock/usage - Record paper usage from Job Card
router.post('/usage', async (req, res) => {
  try {
    const { jobCardId, jobNumber, paperName, paperSource, quantity, userName } = req.body;
    
    if (!paperName) {
      return res.status(400).json({ error: "Paper name is required" });
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: "Invalid quantity" });
    }

    const searchRegex = new RegExp(`^${paperName.trim()}$`, 'i');
    const stock = await PaperStock.findOne({ 
      $or: [{ coverName: searchRegex }, { name: searchRegex }],
      paperSource: paperSource || 'Company paper' 
    });

    if (!stock) {
      return res.status(404).json({ error: `Paper stock '${paperName}' not found.` });
    }

    stock.coverQuantity = Math.max(0, (stock.coverQuantity || 0) - qty);
    await stock.save();

    await logPaperStockTransaction({
      paperStockId: stock._id,
      stockName: stock.name,
      paperName: stock.coverName || stock.name,
      paperType: 'cover',
      transactionType: 'deduct',
      quantity: qty,
      partyName: stock.coverPartyName || stock.partyName,
      jobNumber,
      jobCardId,
      paperSource: stock.paperSource,
      balanceAfter: stock.coverQuantity,
      note: `Used in Job #${jobNumber} by ${userName}`
    });

    res.json({ success: true, balanceAfter: stock.coverQuantity });
  } catch (err) {
    console.error("Paper usage error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/paper-stock - Get all stock items
router.get('/', async (req, res) => {
  try {
    const stock = await PaperStock.find().sort({ name: 1, gsm: 1 });
    res.json(stock);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/paper-stock - Add new stock item
router.post('/', async (req, res) => {
  try {
    const { name, coverPartyName, coverName, coverSupplier, innerPartyName, innerName, innerSupplier, gsm, quantity, coverGSM, coverQuantity, coverPaperSize, innerGSM, innerQuantity, innerPaperSize, unit, description, lowStockThreshold, paperSource } = req.body;
    
    const resolvedCoverName = (coverName || '').trim();
    const resolvedInnerName = (innerName || '').trim();
    const resolvedName = name?.trim()
      || [resolvedCoverName, resolvedInnerName].filter((value, index, arr) => value && arr.indexOf(value) === index).join(' / ')
      || 'Unnamed Paper';

    // Check if item with same name and paperSource already exists
    const existing = await PaperStock.findOne({ name: resolvedName, paperSource: paperSource || 'Company paper' });
    if (existing) {
      return res.status(400).json({ error: "Paper with this name and Source already exists. Please update the existing entry." });
    }

    const newItem = new PaperStock({
      name: resolvedName,
      coverPartyName: (coverPartyName || '').trim(),
      coverName: resolvedCoverName || resolvedName,
      coverSupplier: (coverSupplier || '').trim(),
      innerPartyName: (innerPartyName || '').trim(),
      innerName: resolvedInnerName || resolvedName,
      innerSupplier: (innerSupplier || '').trim(),
      gsm,
      quantity,
      coverGSM,
      coverQuantity,
      coverPaperSize,
      innerGSM,
      innerQuantity,
      innerPaperSize,
      unit,
      description,
      lowStockThreshold,
      paperSource: paperSource || 'Company paper'
    });

    await newItem.save();

    if (Number(coverQuantity) > 0) {
      await logPaperStockTransaction({
        paperStockId: newItem._id,
        stockName: resolvedName,
        paperName: resolvedCoverName || resolvedName,
        paperType: 'cover',
        transactionType: 'add',
        quantity: Number(coverQuantity),
        paperSource: paperSource || 'Company paper',
        balanceAfter: Number(coverQuantity),
        note: 'Initial cover stock added',
      });
    }

    if (Number(innerQuantity) > 0) {
      await logPaperStockTransaction({
        paperStockId: newItem._id,
        stockName: resolvedName,
        paperName: resolvedInnerName || resolvedName,
        paperType: 'inner',
        transactionType: 'add',
        quantity: Number(innerQuantity),
        paperSource: paperSource || 'Company paper',
        balanceAfter: Number(innerQuantity),
        note: 'Initial inner stock added',
      });
    }

    res.status(201).json(newItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/paper-stock/:id - Update stock item
router.put('/:id', async (req, res) => {
  try {
    const { name, coverPartyName, coverName, coverSupplier, innerPartyName, innerName, innerSupplier, gsm, quantity, coverGSM, coverQuantity, coverPaperSize, innerGSM, innerQuantity, innerPaperSize, unit, description, lowStockThreshold, paperSource, isQuickAdd, challanNo, invoiceNo, createdAt } = req.body;
    const resolvedCoverName = (coverName || '').trim();
    const resolvedInnerName = (innerName || '').trim();
    const resolvedName = name?.trim()
      || [resolvedCoverName, resolvedInnerName].filter((value, index, arr) => value && arr.indexOf(value) === index).join(' / ')
      || 'Unnamed Paper';

    const existing = await PaperStock.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Item not found" });

    const updated = await PaperStock.findByIdAndUpdate(
      req.params.id,
      {
        name: resolvedName,
        coverPartyName: (coverPartyName || '').trim(),
        coverName: resolvedCoverName || resolvedName,
        coverSupplier: (coverSupplier || '').trim(),
        innerPartyName: (innerPartyName || '').trim(),
        innerName: resolvedInnerName || resolvedName,
        innerSupplier: (innerSupplier || '').trim(),
        gsm, quantity, coverGSM, coverQuantity, coverPaperSize, innerGSM, innerQuantity, innerPaperSize, unit, description, lowStockThreshold, paperSource, updatedAt: Date.now()
      },
      { new: true }
    );

    const coverAdded = Number(coverQuantity) - Number(existing.coverQuantity || 0);
    const innerAdded = Number(innerQuantity) - Number(existing.innerQuantity || 0);

    if (coverAdded > 0) {
      await logPaperStockTransaction({
        paperStockId: updated._id,
        stockName: resolvedName,
        paperName: resolvedCoverName || resolvedName,
        paperType: 'cover',
        transactionType: 'add',
        quantity: coverAdded,
        paperSource: paperSource || existing.paperSource || 'Company paper',
        balanceAfter: Number(updated.coverQuantity || 0),
        note: isQuickAdd ? 'Quick Add' : 'Cover stock added',
          challanNo: challanNo || '',
          invoiceNo: invoiceNo || '',
          createdAt: isQuickAdd && createdAt ? new Date(createdAt) : Date.now(),
      });
    }

    if (innerAdded > 0) {
      await logPaperStockTransaction({
        paperStockId: updated._id,
        stockName: resolvedName,
        paperName: resolvedInnerName || resolvedName,
        paperType: 'inner',
        transactionType: 'add',
        quantity: innerAdded,
        paperSource: paperSource || existing.paperSource || 'Company paper',
        balanceAfter: Number(updated.innerQuantity || 0),
        note: isQuickAdd ? 'Quick Add' : 'Inner stock added',
          challanNo: challanNo || '',
          invoiceNo: invoiceNo || '',
          createdAt: isQuickAdd && createdAt ? new Date(createdAt) : Date.now(),
      });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/paper-stock/:id - Delete stock item
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await PaperStock.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Item not found" });
    res.json({ message: "Item deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Reconcile single stock
router.post('/reconcile/:id', async (req, res) => {
  try {
    const result = await reconcilePaperStock(req.params.id);
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
