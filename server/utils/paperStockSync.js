import PaperStock from '../models/PaperStock.js';
import { logPaperStockTransaction } from './paperStockTransactions.js';

// Helper to find a paper stock document
export const findPaperStock = async (stockId, paperName, gsm, paperSource = null, partyName = null) => {
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

  if (paperSource) {
    query.paperSource = paperSource;
    if (paperSource === 'Party paper' && partyName) {
      query.partyName = partyName;
    }
  }

  let stock = await PaperStock.findOne(query);
  if (!stock && paperSource) {
    // Fallback without paperSource filter if not found
    delete query.paperSource;
    delete query.partyName;
    stock = await PaperStock.findOne(query);
  }
  return stock;
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

      const stock = await findPaperStock(stockId, paperName, gsm, jobCard.paperSource, jobCard.partyName);
      
      if (!stock) {
        console.warn(`Paper Stock not found for ${paperName} (${gsm} GSM)`);
        continue;
      }

      // We ensure stock quantity never drops below 0 (clamped to Math.max(0, ...))
      const currentQty = stock.quantity !== undefined ? Number(stock.quantity) : 0;
      const newQuantity = Math.max(0, currentQty - delta);

      const setOp = { quantity: newQuantity };
      if (type === 'cover' && stock.coverQuantity !== undefined) {
        const currentCover = Number(stock.coverQuantity) || 0;
        setOp.coverQuantity = Math.max(0, currentCover - delta);
      }
      if (type === 'inner' && stock.innerQuantity !== undefined) {
        const currentInner = Number(stock.innerQuantity) || 0;
        setOp.innerQuantity = Math.max(0, currentInner - delta);
      }

      const updatedStock = await PaperStock.findByIdAndUpdate(
        stock._id,
        { $set: setOp },
        { new: true }
      );

      const balanceRemaining = Math.max(0, type === 'cover'
        ? (updatedStock.coverQuantity ?? updatedStock.quantity)
        : (updatedStock.innerQuantity ?? updatedStock.quantity));

      await logPaperStockTransaction({
        paperStockId: updatedStock._id,
        stockName: updatedStock.name,
        paperName: type === 'cover' ? (updatedStock.coverName || updatedStock.name) : (updatedStock.innerName || updatedStock.name),
        paperType: type, // 'cover' or 'inner'
        transactionType: delta > 0 ? 'deduct' : 'add',
        quantity: Math.abs(delta),
        partyName: jobCard.partyName,
        jobNumber: jobCard.jobNumber,
        jobCardId: jobCard._id,
        paperSource: updatedStock.paperSource,
        balanceAfter: balanceRemaining,
        note: `Job Card ${delta > 0 ? 'Usage' : 'Restoration'}`
      });
    }
  };

  await processLines('cover');
  await processLines('inner');
};
