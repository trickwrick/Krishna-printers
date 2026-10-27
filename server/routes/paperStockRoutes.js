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
    const transactions = await PaperStockTransaction.find().populate('paperStockId').sort({ createdAt: 1 }).lean();
    
    // Calculate running balance chronologically per stock/paper item
    const runningMap = {};
    const withBalances = transactions.map(tx => {
      const stock = tx.paperStockId;
      const paperSize = tx.paperSize || (stock ? (tx.paperType === 'inner' ? (stock.innerPaperSize || stock.coverPaperSize) : (stock.coverPaperSize || stock.innerPaperSize)) : '');
      const gsm = tx.gsm || (stock ? (tx.paperType === 'inner' ? (stock.innerGSM || stock.gsm) : (stock.coverGSM || stock.gsm)) : undefined);
      const supplier = tx.supplier || (stock ? (tx.paperType === 'inner' ? stock.innerSupplier : stock.coverSupplier) : '');
      
      // Group by stock ID + paperType (or stock/paper name + type) to keep cover & inner independent
      const stockIdentifier = stock?._id ? String(stock._id) : String(tx.stockName || tx.paperName || 'default').trim().toLowerCase();
      const typeIdentifier = tx.paperType || 'cover';
      const key = `${stockIdentifier}_${typeIdentifier}`;

      if (runningMap[key] === undefined) {
        runningMap[key] = 0;
      }
      if (tx.transactionType === 'add') {
        runningMap[key] += (Number(tx.quantity) || 0);
      } else {
        runningMap[key] = Math.max(0, runningMap[key] - (Number(tx.quantity) || 0));
      }

      return {
        ...tx,
        paperStockId: stock?._id || tx.paperStockId,
        paperSize,
        gsm,
        supplier,
        // Use dynamically calculated running balance or fallback to logged balanceAfter
        balanceAfter: runningMap[key] !== undefined ? runningMap[key] : (tx.balanceAfter || 0)
      };
    });

    // Return newest first for UI display
    withBalances.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(withBalances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/paper-stock/transactions/:id - Revert/Undo a transaction
router.delete('/transactions/:id', async (req, res) => {
  try {
    const tx = await PaperStockTransaction.findById(req.params.id);
    if (!tx) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Revert stock quantity if linked to a PaperStock
    if (tx.paperStockId) {
      const stock = await PaperStock.findById(tx.paperStockId);
      if (stock) {
        const qty = Number(tx.quantity) || 0;
        // If it was an 'add', reverting means subtracting it; if it was 'deduct', reverting means adding it back
        const delta = tx.transactionType === 'add' ? -qty : qty;
        
        if (tx.paperType === 'inner') {
          stock.innerQuantity = Math.max(0, (stock.innerQuantity || 0) + delta);
        } else {
          stock.coverQuantity = Math.max(0, (stock.coverQuantity || 0) + delta);
        }
        stock.quantity = (stock.coverQuantity || 0) + (stock.innerQuantity || 0);
        await stock.save();
      }
    }

    await PaperStockTransaction.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Transaction reverted successfully" });
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

    // If paper is marked as 'Custom' or 'None', it doesn't need to deduct from inventory
    if (paperName.trim().toLowerCase() === 'custom' || paperName.trim().toLowerCase() === 'none') {
      return res.json({ success: true, custom: true, balanceAfter: null });
    }

    const searchRegex = new RegExp(`^${paperName.trim()}$`, 'i');
    const stock = await PaperStock.findOne({ 
      $or: [{ coverName: searchRegex }, { innerName: searchRegex }, { name: searchRegex }],
      paperSource: paperSource || 'Company paper' 
    });

    if (!stock) {
      // Return success gracefully so that Job Card paper usage tracking still updates
      return res.json({ success: true, notTracked: true, balanceAfter: null });
    }

    const requestedType = req.body.paperType; // 'cover' or 'inner'
    const isInner = requestedType === 'inner' || (
      stock.innerName && stock.innerName.trim().toLowerCase() === paperName.trim().toLowerCase() &&
      (!stock.coverName || stock.coverName.trim().toLowerCase() !== paperName.trim().toLowerCase())
    );

    let balanceRemaining = 0;
    const paperType = isInner ? 'inner' : 'cover';

    if (isInner) {
      stock.innerQuantity = Math.max(0, (stock.innerQuantity || 0) - qty);
      balanceRemaining = stock.innerQuantity;
    } else {
      stock.coverQuantity = Math.max(0, (stock.coverQuantity || 0) - qty);
      balanceRemaining = stock.coverQuantity;
    }
    stock.quantity = (stock.coverQuantity || 0) + (stock.innerQuantity || 0);
    await stock.save();

    await logPaperStockTransaction({
      paperStockId: stock._id,
      stockName: stock.name,
      paperName: isInner ? (stock.innerName || stock.name) : (stock.coverName || stock.name),
      paperType,
      transactionType: 'deduct',
      quantity: qty,
      partyName: isInner ? (stock.innerPartyName || stock.partyName) : (stock.coverPartyName || stock.partyName),
      jobNumber,
      jobCardId,
      paperSource: stock.paperSource,
      balanceAfter: balanceRemaining,
      note: `Used in Job #${jobNumber} by ${userName}`
    });

    res.json({ success: true, balanceAfter: balanceRemaining });
  } catch (err) {
    console.error("Paper usage error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/paper-stock - Get all stock items (newest / most recently updated first)
router.get('/', async (req, res) => {
  try {
    const stock = await PaperStock.find().sort({ updatedAt: -1, createdAt: -1, _id: -1 }).lean();
    
    // Fallback: If stock doc doesn't have challanNo, find the latest add transaction for it
    const stockWithChallan = await Promise.all(
      stock.map(async (item) => {
        if (item.challanNo) return item;
        const tx = await PaperStockTransaction.findOne({
          $or: [
            { paperStockId: item._id },
            { stockName: item.name },
            { paperName: item.coverName || item.name }
          ],
          challanNo: { $exists: true, $ne: '' }
        }).sort({ createdAt: -1 });

        return {
          ...item,
          challanNo: tx?.challanNo || ''
        };
      })
    );

    res.json(stockWithChallan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/paper-stock - Add new stock item
router.post('/', async (req, res) => {
  try {
    const { name, coverPartyName, coverName, coverSupplier, innerPartyName, innerName, innerSupplier, gsm, quantity, coverGSM, coverQuantity, coverPaperSize, innerGSM, innerQuantity, innerPaperSize, unit, description, lowStockThreshold, paperSource, challanNo } = req.body;
    
    const resolvedCoverName = (coverName || '').trim();
    const resolvedInnerName = (innerName || '').trim();
    const resolvedName = name?.trim()
      || [resolvedCoverName, resolvedInnerName].filter((value, index, arr) => value && arr.indexOf(value) === index).join(' / ')
      || 'Unnamed Paper';



    const resolvedCoverParty = (coverPartyName || '').trim();
    const resolvedInnerParty = (innerPartyName || '').trim();

    const calculatedQty = (Number(coverQuantity) || 0) + (Number(innerQuantity) || 0);
    const resolvedQty = calculatedQty > 0 ? calculatedQty : (Number(quantity) || 0);

    // Prevent duplicate entries created by rapid double-clicks (within 15 seconds)
    const recentDuplicate = await PaperStock.findOne({
      name: resolvedName,
      challanNo: (req.body.challanNo || '').trim(),
      paperSource: paperSource || 'Company paper',
      createdAt: { $gte: new Date(Date.now() - 15000) }
    });

    if (recentDuplicate) {
      return res.status(200).json(recentDuplicate);
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
      quantity: resolvedQty,
      coverGSM,
      coverQuantity,
      coverPaperSize,
      innerGSM,
      innerQuantity,
      innerPaperSize,
      challanNo: (req.body.challanNo || '').trim(),
      coverChallanNo: (req.body.challanNo || '').trim(),
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
        partyName: resolvedCoverParty,
        challanNo: req.body.challanNo || '',
        invoiceNo: req.body.invoiceNo || '',
        paperSource: paperSource || 'Company paper',
        paperSize: coverPaperSize || '',
        gsm: coverGSM || gsm,
        supplier: coverSupplier || '',
        balanceAfter: Number(coverQuantity),
        note: req.body.note || 'Initial stock added',
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
        partyName: resolvedInnerParty,
        challanNo: req.body.challanNo || '',
        invoiceNo: req.body.invoiceNo || '',
        paperSource: paperSource || 'Company paper',
        paperSize: innerPaperSize || '',
        gsm: innerGSM || gsm,
        supplier: innerSupplier || '',
        balanceAfter: Number(innerQuantity),
        note: req.body.note || 'Initial inner stock added',
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

    const calculatedQty = (Number(coverQuantity) || 0) + (Number(innerQuantity) || 0);
    const resolvedQty = calculatedQty > 0 ? calculatedQty : (Number(quantity) || 0);

    const updated = await PaperStock.findByIdAndUpdate(
      req.params.id,
      {
        name: resolvedName,
        coverPartyName: (coverPartyName || '').trim(),
        coverName: resolvedCoverName || resolvedName,
        coverSupplier: (coverSupplier || '').trim(),
        innerPartyName: (innerPartyName || '').trim(),
        innerName: resolvedInnerName || resolvedName,
        gsm, quantity: resolvedQty, coverGSM, coverQuantity, coverPaperSize, innerGSM, innerQuantity, innerPaperSize, unit, description, lowStockThreshold, paperSource,
        ...(challanNo ? { challanNo: String(challanNo).trim() } : {}),
        updatedAt: Date.now()
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
        partyName: updated.coverPartyName || existing.coverPartyName || '',
        paperSource: paperSource || existing.paperSource || 'Company paper',
        paperSize: updated.coverPaperSize || existing.coverPaperSize || '',
        gsm: updated.coverGSM || existing.coverGSM || updated.gsm || existing.gsm,
        supplier: updated.coverSupplier || existing.coverSupplier || '',
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
        partyName: updated.innerPartyName || existing.innerPartyName || '',
        paperSource: paperSource || existing.paperSource || 'Company paper',
        paperSize: updated.innerPaperSize || existing.innerPaperSize || '',
        gsm: updated.innerGSM || existing.innerGSM || updated.gsm || existing.gsm,
        supplier: updated.innerSupplier || existing.innerSupplier || '',
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
