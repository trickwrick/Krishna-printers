import PaperStock from '../models/PaperStock.js';
import { logPaperStockTransaction } from './paperStockTransactions.js';

// Helper to find a paper stock document
export const findPaperStock = async (stockId, paperName, gsm) => {
  if (stockId) {
    const stock = await PaperStock.findById(stockId);
    if (stock) return stock;
  }
  if (!paperName) return null;

  // Fallback regex match
  const match = await PaperStock.findOne({
    name: new RegExp('^' + String(paperName).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'),
    gsm: gsm ? Number(gsm) : undefined
  });
  return match;
};

// Sync logic for updating stock and logging transactions
export const syncPaperStockWithJob = async (jobCard, oldJobCard = null) => {
  const getLines = (job, type) => {
    if (!job) return [];
    if (type === 'cover' && job.coverPaperLines) return job.coverPaperLines;
    if (type === 'inner' && job.innerPaperLines) return job.innerPaperLines;
    return [];
  };

  const processLines = async (type) => {
    const newLines = getLines(jobCard, type);
    const oldLines = getLines(oldJobCard, type);

    // Build a map of old lines by a unique key (stockId or paperName+gsm)
    const oldMap = {};
    oldLines.forEach(line => {
      const key = line.stockId ? line.stockId.toString() : `${line.paperName}_${line.gsm}`;
      oldMap[key] = (oldMap[key] || 0) + (Number(line.quantity) || 0);
    });

    // Build a map of new lines
    const newMap = {};
    newLines.forEach(line => {
      const key = line.stockId ? line.stockId.toString() : `${line.paperName}_${line.gsm}`;
      newMap[key] = {
        quantity: (newMap[key]?.quantity || 0) + (Number(line.quantity) || 0),
        stockId: line.stockId,
        paperName: line.paperName,
        gsm: line.gsm
      };
    });

    // Calculate deltas
    const allKeys = new Set([...Object.keys(oldMap), ...Object.keys(newMap)]);

    for (const key of allKeys) {
      const oldQty = oldMap[key] || 0;
      const newLine = newMap[key];
      const newQty = newLine ? newLine.quantity : 0;
      const delta = newQty - oldQty;

      if (delta === 0) continue;

      // We need to find the stock
      const stockId = newLine?.stockId || (key.includes('_') ? null : key);
      const paperName = newLine?.paperName || (key.includes('_') ? key.split('_')[0] : '');
      const gsm = newLine?.gsm || (key.includes('_') ? key.split('_')[1] : null);

      const stock = await findPaperStock(stockId, paperName, gsm);
      
      if (!stock) {
        console.warn(`Paper Stock not found for ${paperName} (${gsm} GSM)`);
        continue;
      }

      // Determine fields
      const qtyField = type === 'cover' ? 'coverQuantity' : 'innerQuantity';
      
      // Update stock
      const updateOp = {};
      updateOp[qtyField] = -delta;
      updateOp['quantity'] = -delta; // Total quantity decreases by delta

      const updatedStock = await PaperStock.findByIdAndUpdate(
        stock._id,
        { $inc: updateOp },
        { new: true }
      );

      // Log transaction
      await logPaperStockTransaction({
        paperStockId: updatedStock._id,
        stockName: updatedStock.name,
        paperName: updatedStock.name,
        paperType: type,
        transactionType: delta > 0 ? 'deduct' : 'add', // If we need more, we deduct from stock
        quantity: Math.abs(delta),
        partyName: jobCard.partyName,
        jobNumber: jobCard.jobNumber,
        jobCardId: jobCard._id,
        paperSource: updatedStock.paperSource,
        balanceAfter: updatedStock[qtyField],
        note: `Job Card ${delta > 0 ? 'Usage' : 'Restoration'} (${type})`
      });
    }
  };

  await processLines('cover');
  await processLines('inner');
};
