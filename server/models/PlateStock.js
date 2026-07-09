import mongoose from 'mongoose';

const plateStockSchema = new mongoose.Schema({
  plateName: { 
    type: String, 
    required: true,
    trim: true
  },
  supplier: {
    type: String,
    trim: true
  },
  size: {
    type: String,
    trim: true
  },
  quantity: { 
    type: Number, 
    default: 0 
  },
  lowStockThreshold: {
    type: Number,
    default: 50
  },
  plateSource: {
    type: String,
    enum: ['Company plate', 'Party plate'],
    default: 'Company plate'
  },
  description: { 
    type: String,
    trim: true
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

const PlateStock = mongoose.model('PlateStock', plateStockSchema);
export default PlateStock;
