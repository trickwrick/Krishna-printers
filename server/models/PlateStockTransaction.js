import mongoose from 'mongoose';

const plateStockTransactionSchema = new mongoose.Schema({
  plateStockId: { type: mongoose.Schema.Types.ObjectId, ref: 'PlateStock' },
  plateName: { type: String, trim: true, required: true },
  transactionType: { type: String, enum: ['add', 'deduct'], required: true },
  quantity: { type: Number, required: true, min: 0 },
  partyName: { type: String, trim: true, default: '' },
  jobNumber: { type: String, trim: true, default: '' },
  jobCardId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobCard' },
  plateSource: { type: String, default: 'Company plate' },
  balanceAfter: { type: Number, default: 0 },
  note: { type: String, trim: true, default: '' },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

const PlateStockTransaction = mongoose.model('PlateStockTransaction', plateStockTransactionSchema);
export default PlateStockTransaction;
