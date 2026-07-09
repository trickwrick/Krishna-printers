import express from 'express';
const router = express.Router();
import PlateStock from '../models/PlateStock.js';
import PlateStockTransaction from '../models/PlateStockTransaction.js';

// GET /api/plate-stock/transactions - Stock add/deduct history
router.get('/transactions', async (req, res) => {
  try {
    const transactions = await PlateStockTransaction.find().sort({ createdAt: -1 });
    res.json(transactions);
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
