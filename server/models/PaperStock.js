import mongoose from 'mongoose';

const paperStockSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  coverPartyName: {
    type: String,
    trim: true
  },
  coverName: {
    type: String,
    trim: true
  },
  coverSupplier: {
    type: String,
    trim: true
  },
  innerPartyName: {
    type: String,
    trim: true
  },
  innerName: {
    type: String,
    trim: true
  },
  innerSupplier: {
    type: String,
    trim: true
  },
  gsm: { 
    type: Number
  },
  quantity: { 
    type: Number, 
    default: 0 
  },
  coverGSM: { 
    type: Number 
  },
  coverQuantity: { 
    type: Number, 
    default: 0 
  },
  coverPaperSize: {
    type: String,
    trim: true
  },
  innerGSM: { 
    type: Number 
  },
  innerQuantity: { 
    type: Number, 
    default: 0 
  },
  innerPaperSize: {
    type: String,
    trim: true
  },
  unit: { 
    type: String, 
    default: 'Sheets' 
  },
  description: { 
    type: String,
    trim: true
  },
  lowStockThreshold: {
    type: Number,
    default: 100
  },
  paperSource: {
    type: String,
    enum: ['Company paper', 'Party paper'],
    default: 'Company paper'
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

const PaperStock = mongoose.model('PaperStock', paperStockSchema);
export default PaperStock;
