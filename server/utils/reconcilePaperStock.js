import PaperStock from '../models/PaperStock.js';
import JobCard from '../models/JobCard.js';
import PaperStockTransaction from '../models/PaperStockTransaction.js';

const normalize = (value) => String(value || '').trim().toLowerCase();

const getCoverUsage = (job) => {
  if (!job || (job.paperSource || 'Company paper') !== 'Company paper' || !job.paper || !job.paperGSM) return null;
  const qty = Number(job.coverPaperCount) > 0 ? Number(job.coverPaperCount) : Number(job.jobQty) || 0;
  if (qty <= 0) return null;
  return { paper: job.paper, qty };
};

const getInnerUsage = (job) => {
  if (!job || (job.paperSource || 'Company paper') !== 'Company paper' || !job.innerPaper || !job.innerPaperGSM) return null;
  const qty = Number(job.innerPaperCount) || 0;
  if (qty <= 0) return null;
  return { paper: job.innerPaper, qty };
};

const matchesPaperName = (stock, paperName, paperType) => {
  const target = normalize(paperName);
  if (!target) return false;
  const names = paperType === 'cover' ? [stock.coverName, stock.name] : [stock.innerName, stock.name];
  return names.some((name) => normalize(name) === target);
};

export const reconcilePaperStock = async () => {
  const stocks = await PaperStock.find();
  const jobs = await JobCard.find({ isDeleted: { $ne: true } });
  
  let discrepanciesFound = 0;

  for (const stock of stocks) {
    // 1. Calculate manual adds for cover
    const coverAdds = await PaperStockTransaction.aggregate([
      { $match: { paperStockId: stock._id, paperType: 'cover', transactionType: 'add', note: { $ne: 'Restored from job card update' } } },
      { $group: { _id: null, total: { $sum: '' } } }
    ]);
    const totalCoverAdded = coverAdds[0]?.total || 0;

    // 2. Calculate job usages for cover
    const totalCoverUsed = jobs.reduce((sum, job) => {
      const usage = getCoverUsage(job);
      if (usage && matchesPaperName(stock, usage.paper, 'cover')) return sum + usage.qty;
      return sum;
    }, 0);

    // 3. Calculate manual adds for inner
    const innerAdds = await PaperStockTransaction.aggregate([
      { $match: { paperStockId: stock._id, paperType: 'inner', transactionType: 'add', note: { $ne: 'Restored from job card update' } } },
      { $group: { _id: null, total: { $sum: '' } } }
    ]);
    const totalInnerAdded = innerAdds[0]?.total || 0;

    // 4. Calculate job usages for inner
    const totalInnerUsed = jobs.reduce((sum, job) => {
      const usage = getInnerUsage(job);
      if (usage && matchesPaperName(stock, usage.paper, 'inner')) return sum + usage.qty;
      return sum;
    }, 0);

    const trueCoverBalance = Math.max(0, totalCoverAdded - totalCoverUsed);
    const trueInnerBalance = Math.max(0, totalInnerAdded - totalInnerUsed);
    const trueTotalBalance = trueCoverBalance + trueInnerBalance;

    if (
      stock.coverQuantity !== trueCoverBalance ||
      stock.innerQuantity !== trueInnerBalance ||
      stock.quantity !== trueTotalBalance
    ) {
      stock.coverQuantity = trueCoverBalance;
      stock.innerQuantity = trueInnerBalance;
      stock.quantity = trueTotalBalance;
      await stock.save();
      discrepanciesFound++;
    }
  }

  return { message: 'Reconciliation complete', discrepanciesFound };
};
