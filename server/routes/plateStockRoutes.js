import express from 'express';
const router = express.Router();
import PlateStock from '../models/PlateStock.js';
import PlateStockTransaction from '../models/PlateStockTransaction.js';

// GET /api/plate-stock/transactions - Stock add/deduct history
router.get('/transactions', async (req, res) => {
  try {
    const transactions = await PlateStockTransaction.find().sort({ createdAt: 1 }).lean();
    
    const runningMap = {};
    const withBalances = transactions.map(tx => {
      const key = String(tx.plateStockId || tx.plateName || 'default');
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
        balanceAfter: runningMap[key]
      };
    });

    withBalances.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(withBalances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/plate-stock/transactions/:id - Revert/Delete transaction
router.delete('/transactions/:id', async (req, res) => {
  try {
    const tx = await PlateStockTransaction.findById(req.params.id);
    if (!tx) return res.status(404).json({ error: "Transaction not found" });

    if (tx.plateStockId) {
      const stock = await PlateStock.findById(tx.plateStockId);
      if (stock) {
        const qty = Number(tx.quantity) || 0;
        const delta = tx.transactionType === 'add' ? -qty : qty;
        stock.quantity = Math.max(0, (stock.quantity || 0) + delta);
        await stock.save();
      }
    }

    await PlateStockTransaction.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Plate transaction reverted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/plate-stock - Get all stock items
router.get('/', async (req, res) => {
  try {
    const stock = await PlateStock.find().sort({ plateName: 1 });
    res.json(stock);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/plate-stock - Add new stock item
router.post('/', async (req, res) => {
  try {
    const { plateName, supplier, size, quantity, lowStockThreshold, plateSource, description } = req.body;
    
    if (!plateName) {
      return res.status(400).json({ error: "Plate name is required." });
    }

    const resolvedName = plateName.trim();

    // Check if item with same name and plateSource already exists
    const existing = await PlateStock.findOne({ plateName: resolvedName, plateSource: plateSource || 'Company plate' });
    if (existing) {
      return res.status(400).json({ error: "Plate with this name and Source already exists. Please update the existing entry." });
    }

    const newItem = new PlateStock({
      plateName: resolvedName,
      supplier: (supplier || '').trim(),
      size: (size || '').trim(),
      quantity: Number(quantity) || 0,
      lowStockThreshold: Number(lowStockThreshold) || 50,
      plateSource: plateSource || 'Company plate',
      description: (description || '').trim()
    });

    const saved = await newItem.save();

    if (saved.quantity > 0) {
      await PlateStockTransaction.create({
        plateStockId: saved._id,
        plateName: saved.plateName,
        transactionType: 'add',
        quantity: saved.quantity,
        plateSource: saved.plateSource,
        balanceAfter: saved.quantity,
        note: 'Initial plate stock feed'
      });
    }

    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/plate-stock/:id - Update stock item
router.put('/:id', async (req, res) => {
  try {
    const { plateName, supplier, size, quantity, lowStockThreshold, plateSource, description } = req.body;
    
    const updateData = {};
    if (plateName !== undefined) updateData.plateName = plateName.trim();
    if (supplier !== undefined) updateData.supplier = supplier.trim();
    if (size !== undefined) updateData.size = size.trim();
    if (quantity !== undefined) updateData.quantity = Number(quantity);
    if (lowStockThreshold !== undefined) updateData.lowStockThreshold = Number(lowStockThreshold);
    if (plateSource !== undefined) updateData.plateSource = plateSource;
    if (description !== undefined) updateData.description = description.trim();

    const oldItem = await PlateStock.findById(req.params.id);
    if (!oldItem) return res.status(404).json({ error: "Plate stock not found" });

    const updatedItem = await PlateStock.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (updatedItem.quantity !== oldItem.quantity) {
      const diff = updatedItem.quantity - oldItem.quantity;
      await PlateStockTransaction.create({
        plateStockId: updatedItem._id,
        plateName: updatedItem.plateName,
        transactionType: diff > 0 ? 'add' : 'deduct',
        quantity: Math.abs(diff),
        plateSource: updatedItem.plateSource,
        balanceAfter: updatedItem.quantity,
        note: 'Stock updated manually'
      });
    }
    
    if (!updatedItem) return res.status(404).json({ error: "Plate stock not found" });
    res.json(updatedItem);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/plate-stock/:id - Delete stock item
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await PlateStock.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Plate stock not found" });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
