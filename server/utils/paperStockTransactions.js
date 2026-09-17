import PaperStockTransaction from '../models/PaperStockTransaction.js';

export const logPaperStockTransaction = async ({
  paperStockId,
  stockName,
  paperName,
  paperType,
  transactionType,
  quantity,
  partyName = '',
  jobNumber = '',
  jobCardId,
  challanNo = '',
  invoiceNo = '',
  paperSource = 'Company paper',
  balanceAfter = 0,
  note = '',
  createdAt,
}) => {
  const qty = Number(quantity) || 0;
  if (!qty) return;

  await PaperStockTransaction.create({
    paperStockId,
    stockName,
    paperName,
    paperType,
    transactionType,
    quantity: qty,
    partyName,
    jobNumber,
    jobCardId: jobCardId || undefined,
    challanNo,
    invoiceNo,
    paperSource,
    balanceAfter,
    note,
    createdAt: createdAt || Date.now(),
  });
};
