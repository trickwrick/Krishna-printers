import PaperStock from '../models/PaperStock.js';
import { logPaperStockTransaction } from './paperStockTransactions.js';

// Helper to find a paper stock document
export const findPaperStock = async (stockId, paperName, gsm) => {
  if (stockId) {
    const stock = await PaperStock.findById(stockId);
    if (stock) return stock;
  }
  if (!paperName) return null;

  const escapedName = String(paperName).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^${escapedName}$`, 'i');
  
  const query = {
    $or: [
      { name: regex },
      { coverName: regex },
      { innerName: regex }
    ]
  };

  if (gsm) {
    query.$or = query.$or.map(cond => ({
      ...cond,
      $or: [
        { gsm: Number(gsm) },
        { coverGSM: Number(gsm) },
        { innerGSM: Number(gsm) }
      ]
    }));
  }

  return await PaperStock.findOne(query);
};

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

    const oldMap = {};
    oldLines.forEach(line => {
      const key = line.stockId ? line.stockId.toString() : `${line.paperName}_${line.gsm}`;
      oldMap[key] = (oldMap[key] || 0) + (Number(line.quantity) || 0);
    });

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

    const allKeys = new Set([...Object.keys(oldMap), ...Object.keys(newMap)]);

    for (const key of allKeys) {
      const oldQty = oldMap[key] || 0;
      const newLine = newMap[key];
      const newQty = newLine ? newLine.quantity : 0;
      const delta = newQty - oldQty;

      if (delta === 0) continue;

      const stockId = newLine?.stockId || (key.includes('_') ? null : key);
      const paperName = newLine?.paperName || (key.includes('_') ? key.split('_')[0] : '');
      const gsm = newLine?.gsm || (key.includes('_') ? key.split('_')[1] : null);

      const stock = await findPaperStock(stockId, paperName, gsm);
      
      if (!stock) {
        console.warn(`Paper Stock not found for ${paperName} (${gsm} GSM)`);
        continue;
      }

      // We now strictly use the main 'quantity' field since inner/cover concepts are merged.
      // We also decrement coverQuantity/innerQuantity if they exist, to ensure UI is in sync.
      const updateOp = {};
      updateOp['quantity'] = -delta;
      if (stock.coverQuantity !== undefined) updateOp['coverQuantity'] = -delta;
      if (stock.innerQuantity !== undefined) updateOp['innerQuantity'] = -delta;

      const updatedStock = await PaperStock.findByIdAndUpdate(
        stock._id,
        { $inc: updateOp },
        { new: true }
      );

      await logPaperStockTransaction({
        paperStockId: updatedStock._id,
        stockName: updatedStock.name,
        paperName: updatedStock.name,
        paperType: 'paper', // Simplified type
        transactionType: delta > 0 ? 'deduct' : 'add',
        quantity: Math.abs(delta),
        partyName: jobCard.partyName,
        jobNumber: jobCard.jobNumber,
        jobCardId: jobCard._id,
        paperSource: updatedStock.paperSource,
        balanceAfter: updatedStock.quantity, // Rely on total quantity
        note: `Job Card ${delta > 0 ? 'Usage' : 'Restoration'}`
      });
    }
  };

  await processLines('cover');
  await processLines('inner');
};
