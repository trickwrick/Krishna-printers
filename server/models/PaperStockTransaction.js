import mongoose from 'mongoose';

const paperStockTransactionSchema = new mongoose.Schema({
  paperStockId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaperStock' },
  stockName: { type: String, trim: true },
  paperName: { type: String, trim: true },
  paperType: { type: String, enum: ['cover', 'inner'], required: true },
  transactionType: { type: String, enum: ['add', 'deduct'], required: true },
  quantity: { type: Number, required: true, min: 0 },
  partyName: { type: String, trim: true, default: '' },
  jobNumber: { type: String, trim: true, default: '' },
  jobCardId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobCard' },
  challanNo: { type: String, trim: true, default: '' },
  invoiceNo: { type: String, trim: true, default: '' },
  paperSource: { type: String, default: 'Company paper' },
  balanceAfter: { type: Number, default: 0 },
  note: { type: String, trim: true, default: '' },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

const PaperStockTransaction = mongoose.model('PaperStockTransaction', paperStockTransactionSchema);
export default PaperStockTransaction;
