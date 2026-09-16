const normalize = (value) => String(value || '').trim().toLowerCase();

const getCoverUsage = (job) => {
  if (!job || (job.paperSource || 'Company paper') !== 'Company paper' || !job.paper || !job.paperGSM) {
    return null;
  }
  const qty = Number(job.coverPaperCount) > 0 ? Number(job.coverPaperCount) : Number(job.jobQty) || 0;
  if (qty <= 0) return null;
  return { paper: job.paper, qty };
};

const getInnerUsage = (job) => {
  if (!job || (job.paperSource || 'Company paper') !== 'Company paper' || !job.innerPaper || !job.innerPaperGSM) {
    return null;
  }
  const qty = Number(job.innerPaperCount) || 0;
  if (qty <= 0) return null;
  return { paper: job.innerPaper, qty };
};

const matchesPaperName = (stock, paperName, paperType) => {
  const target = normalize(paperName);
  if (!target) return false;
  const names = paperType === 'cover'
    ? [stock.coverName, stock.name]
    : [stock.innerName, stock.name];
  return names.some((name) => normalize(name) === target);
};

const sumCoverDeductions = (jobs, stock) => jobs.reduce((sum, job) => {
  const usage = getCoverUsage(job);
  if (!usage || !matchesPaperName(stock, usage.paper, 'cover')) return sum;
  return sum + usage.qty;
}, 0);

const sumInnerDeductions = (jobs, stock) => jobs.reduce((sum, job) => {
  const usage = getInnerUsage(job);
  if (!usage || !matchesPaperName(stock, usage.paper, 'inner')) return sum;
  return sum + usage.qty;
}, 0);

const makeId = (parts) => parts.filter(Boolean).join('-');

export const buildPaperStockHistory = (stocks = [], jobs = []) => {
  const transactions = [];

  stocks.forEach((stock) => {
    const paperSource = stock.paperSource || 'Company paper';
    const stockName = stock.name || 'Unnamed Paper';
    const createdAt = stock.createdAt || new Date().toISOString();
    const coverQty = Number(stock.coverQuantity) || 0;
    const innerQty = Number(stock.innerQuantity) || 0;
    const legacyQty = Number(stock.quantity) || 0;

    if (coverQty > 0 || innerQty > 0) {
      if (coverQty > 0) {
        const totalDeducted = sumCoverDeductions(jobs, stock);
        transactions.push({
          _id: makeId(['add-cover', stock._id]),
          stockName,
          paperName: stock.coverName || stockName,
          paperType: 'cover',
          transactionType: 'add',
          quantity: coverQty + totalDeducted,
          paperSource,
          balanceAfter: coverQty + totalDeducted,
          note: 'Opening stock (imported)',
          createdAt,
        });
      }

      if (innerQty > 0) {
        const totalDeducted = sumInnerDeductions(jobs, stock);
        transactions.push({
          _id: makeId(['add-inner', stock._id]),
          stockName,
          paperName: stock.innerName || stockName,
          paperType: 'inner',
          transactionType: 'add',
          quantity: innerQty + totalDeducted,
          paperSource,
          balanceAfter: innerQty + totalDeducted,
          note: 'Opening stock (imported)',
          createdAt,
        });
      }
    } else if (legacyQty > 0) {
      const totalDeducted = sumCoverDeductions(jobs, stock) + sumInnerDeductions(jobs, stock);
      transactions.push({
        _id: makeId(['add-legacy', stock._id]),
        stockName,
        paperName: stockName,
        paperType: 'cover',
        transactionType: 'add',
        quantity: legacyQty + totalDeducted,
        paperSource,
        balanceAfter: legacyQty + totalDeducted,
        note: 'Opening stock (imported)',
        createdAt,
      });
    }
  });

  jobs.forEach((job) => {
    if ((job.paperSource || 'Company paper') !== 'Company paper') return;

    const cover = getCoverUsage(job);
    if (cover) {
      transactions.push({
        _id: makeId(['deduct-cover', job._id]),
        stockName: cover.paper,
        paperName: cover.paper,
        paperType: 'cover',
        transactionType: 'deduct',
        quantity: cover.qty,
        partyName: job.partyName || job.companyName || '',
        jobNumber: job.jobNumber || '',
        paperSource: 'Company paper',
        balanceAfter: 0,
        note: 'Job card usage (imported)',
        createdAt: job.createdAt || job.updatedAt || new Date().toISOString(),
      });
    }

    const inner = getInnerUsage(job);
    if (inner) {
      transactions.push({
        _id: makeId(['deduct-inner', job._id]),
        stockName: inner.paper,
        paperName: inner.paper,
        paperType: 'inner',
        transactionType: 'deduct',
        quantity: inner.qty,
        partyName: job.partyName || job.companyName || '',
        jobNumber: job.jobNumber || '',
        paperSource: 'Company paper',
        balanceAfter: 0,
        note: 'Job card usage (imported)',
        createdAt: job.createdAt || job.updatedAt || new Date().toISOString(),
      });
    }
  });

  // Sort chronologically (oldest first) to calculate running balances
  transactions.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Calculate running balances per paper Name & Type combination
  const runningBalances = {};
  transactions.forEach((tx) => {
    const key = `${tx.paperName}-${tx.paperType}`;
    if (runningBalances[key] === undefined) {
      runningBalances[key] = 0;
    }
    
    if (tx.transactionType === 'add') {
      runningBalances[key] += tx.quantity;
    } else {
      runningBalances[key] -= tx.quantity;
    }
    
    tx.balanceAfter = runningBalances[key];
  });

  // Return sorted reverse-chronologically (newest first) for the UI
  return transactions.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};
