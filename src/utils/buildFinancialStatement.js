export const getInvoiceBalance = (inv) =>
  Math.max(0, (Number(inv?.totalAmount) || 0) - (Number(inv?.paidAmount) || 0));

export const formatStatementDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatStatementDateTime = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const getMonthOptions = (count = 24) => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < count; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    options.push({ value, label });
  }
  return options;
};

export const getDefaultMonthValue = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const getPeriodBounds = (periodFilter, selectedMonth, dateRange) => {
  if (periodFilter === 'all') return null;

  if (periodFilter === 'month') {
    const [year, month] = String(selectedMonth || '').split('-').map(Number);
    if (!year || !month) return null;
    return {
      start: new Date(year, month - 1, 1, 0, 0, 0, 0),
      end: new Date(year, month, 0, 23, 59, 59, 999),
    };
  }

  if (periodFilter === 'range' && dateRange?.start && dateRange?.end) {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  return null;
};

export const isDateInPeriod = (dateValue, periodFilter, selectedMonth, dateRange) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;

  const bounds = getPeriodBounds(periodFilter, selectedMonth, dateRange);
  if (!bounds) return true;
  return date >= bounds.start && date <= bounds.end;
};

export const getPeriodLabel = (periodFilter, selectedMonth, dateRange) => {
  if (periodFilter === 'all') return 'All Transactions';
  if (periodFilter === 'month') {
    const [year, month] = String(selectedMonth || '').split('-').map(Number);
    if (!year || !month) return 'Selected Month';
    const d = new Date(year, month - 1, 1);
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }
  if (periodFilter === 'range' && dateRange?.start && dateRange?.end) {
    return `${formatStatementDate(dateRange.start)} to ${formatStatementDate(dateRange.end)}`;
  }
  return 'Custom Date Range';
};

export const buildLedgerEntries = (invoices = [], payments = []) => {
  const invoiceByNumber = Object.fromEntries(
    (invoices || []).map((inv) => [inv.invoiceNumber, inv])
  );

  const debits = (invoices || []).map((inv) => {
    const balance = getInvoiceBalance(inv);
    return {
      id: `inv-${inv._id}`,
      date: new Date(inv.date || inv.createdAt),
      type: 'debit',
      refNo: inv.invoiceNumber || '—',
      particulars: inv.partyName || 'Party',
      withdrawal: Number(inv.totalAmount) || 0,
      deposit: 0,
      partyName: inv.partyName || '',
      invoiceNumber: inv.invoiceNumber || '',
      status: balance <= 0 ? 'complete' : 'pending',
    };
  });

  const credits = (payments || []).map((pay) => {
    const linked = invoiceByNumber[pay.invoiceNumber];
    const balance = linked ? getInvoiceBalance(linked) : 0;
    const note = pay.notes ? ` — ${pay.notes}` : '';
    return {
      id: `pay-${pay._id}`,
      date: new Date(pay.date || pay.createdAt),
      type: 'credit',
      refNo: pay.invoiceNumber || '—',
      particulars: pay.partyName || 'Party',
      withdrawal: 0,
      deposit: Number(pay.amount) || 0,
      partyName: pay.partyName || '',
      invoiceNumber: pay.invoiceNumber || '',
      status: linked ? (balance <= 0 ? 'complete' : 'pending') : 'complete',
    };
  });

  return [...debits, ...credits].sort((a, b) => a.date - b.date);
};

export const enrichLedgerWithBalance = (entries = []) => {
  let balance = 0;
  return entries.map((entry) => {
    if (entry.type === 'debit') balance += entry.withdrawal;
    else balance = Math.max(0, balance - entry.deposit);
    return { ...entry, balanceAfter: balance };
  });
};

export const getOpeningBalance = (allEntries, periodFilter, selectedMonth, dateRange) => {
  const bounds = getPeriodBounds(periodFilter, selectedMonth, dateRange);
  if (!bounds) return 0;

  let balance = 0;
  allEntries.forEach((entry) => {
    if (entry.date >= bounds.start) return;
    if (entry.type === 'debit') balance += entry.withdrawal;
    else balance = Math.max(0, balance - entry.deposit);
  });
  return balance;
};

const applyPeriodBalance = (entries, openingBalance) => {
  let running = openingBalance;
  return entries.map((entry) => {
    if (entry.type === 'debit') running += entry.withdrawal;
    else running = Math.max(0, running - entry.deposit);
    return { ...entry, balanceAfter: running };
  });
};

export const buildFinancialStatement = ({
  invoices = [],
  payments = [],
  periodFilter = 'all',
  selectedMonth = '',
  dateRange = { start: '', end: '' },
  statusFilter = 'all',
  searchQuery = '',
}) => {
  const allEntries = enrichLedgerWithBalance(buildLedgerEntries(invoices, payments));
  const openingBalance = getOpeningBalance(allEntries, periodFilter, selectedMonth, dateRange);
  const query = searchQuery.trim().toLowerCase();

  const filtered = allEntries.filter((entry) => {
    if (!isDateInPeriod(entry.date, periodFilter, selectedMonth, dateRange)) return false;
    if (statusFilter === 'complete' && entry.status !== 'complete') return false;
    if (statusFilter === 'pending' && entry.status !== 'pending') return false;
    if (!query) return true;
    return (
      entry.particulars.toLowerCase().includes(query) ||
      entry.refNo.toLowerCase().includes(query) ||
      entry.partyName.toLowerCase().includes(query) ||
      entry.invoiceNumber.toLowerCase().includes(query)
    );
  });

  const filteredAsc = [...filtered].sort((a, b) => a.date - b.date);
  const periodEntries = applyPeriodBalance(filteredAsc, openingBalance);
  const displayEntries = [...periodEntries].sort((a, b) => b.date - a.date);

  const totalWithdrawal = filtered.reduce((sum, e) => sum + e.withdrawal, 0);
  const totalDeposit = filtered.reduce((sum, e) => sum + e.deposit, 0);
  const closingBalance =
    periodEntries.length > 0
      ? periodEntries.at(-1)?.balanceAfter ?? openingBalance
      : openingBalance;

  const completeCount = allEntries.filter((e) => e.status === 'complete').length;
  const pendingCount = allEntries.filter((e) => e.status === 'pending').length;

  return {
    allEntries,
    displayEntries,
    openingBalance,
    closingBalance,
    totalWithdrawal,
    totalDeposit,
    completeCount,
    pendingCount,
  };
};
