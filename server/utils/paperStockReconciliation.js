import PaperStock from '../models/PaperStock.js';
import PaperStockTransaction from '../models/PaperStockTransaction.js';
import JobCard from '../models/JobCard.js';

export const reconcilePaperStock = async () => {
  try {
    const allStocks = await PaperStock.find();
    let reconciledCount = 0;

    for (const stock of allStocks) {
      let expectedCover = 0;
      let expectedInner = 0;

      // 1. Calculate base additions and non-job deductions from transactions
      const transactions = await PaperStockTransaction.find({ paperStockId: stock._id });
      
      for (const tx of transactions) {
        // Skip job card transactions because we will calculate actual usage from JobCards directly
        if (tx.jobCardId) continue; 
        
        const qty = Number(tx.quantity) || 0;
        if (tx.paperType === 'cover') {
          expectedCover += (tx.transactionType === 'add' ? qty : -qty);
        } else if (tx.paperType === 'inner') {
          expectedInner += (tx.transactionType === 'add' ? qty : -qty);
        }
      }

      // 2. Subtract actual usages from all JobCards
      // This is a slow query for a huge DB, but safe for reconciliation
      const jobCards = await JobCard.find({ 
        isDeleted: false,
        $or: [
          { 'coverPaperLines.stockId': stock._id },
          { 'innerPaperLines.stockId': stock._id },
          // Also look for legacy exact matches if they weren't migrated
          { paper: stock.name },
          { innerPaper: stock.name }
        ]
      });

      for (const job of jobCards) {
        if (job.paperSource !== 'Company paper') continue;

        // Legacy cover
        if (job.paper === stock.name && Number(job.paperGSM) === stock.gsm) {
           expectedCover -= (Number(job.coverPaperCount) || 0);
        }
        // Legacy inner
        if (job.innerPaper === stock.name && Number(job.innerPaperGSM) === stock.gsm) {
           expectedInner -= (Number(job.innerPaperCount) || 0);
        }

        // New cover lines
        if (job.coverPaperLines) {
           for (const line of job.coverPaperLines) {
             if (line.stockId?.toString() === stock._id.toString()) {
               expectedCover -= (Number(line.quantity) || 0);
             }
           }
        }
        
        // New inner lines
        if (job.innerPaperLines) {
           for (const line of job.innerPaperLines) {
             if (line.stockId?.toString() === stock._id.toString()) {
               expectedInner -= (Number(line.quantity) || 0);
             }
           }
        }
      }

      // Ensure no negative values (optional business rule)
      // expectedCover = Math.max(0, expectedCover);
      // expectedInner = Math.max(0, expectedInner);

      // Check if update needed
      if (stock.coverQuantity !== expectedCover || stock.innerQuantity !== expectedInner) {
        stock.coverQuantity = expectedCover;
        stock.innerQuantity = expectedInner;
        stock.quantity = expectedCover + expectedInner;
        await stock.save();
        reconciledCount++;
        console.log(`Reconciled Stock ${stock.name}: Cover=${expectedCover}, Inner=${expectedInner}`);
      }
    }

    return { success: true, message: `Reconciled ${reconciledCount} paper stocks.` };
  } catch (error) {
    console.error('Reconciliation error:', error);
    return { success: false, error: error.message };
  }
};
