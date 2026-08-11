import mongoose from 'mongoose';

const jobCardSchema = new mongoose.Schema({
  partyName: { type: String, required: true },
  companyName: { type: String }, // redundant alias for backward compatibility
  address: { type: String },
  contactNo: { type: String },
  emailId: { type: String },
  gstNo: { type: String, default: '' },
  jobName: { type: String },
  jobNumber: { type: String },
  jobQty: { type: String, default: "0" },
  jobAttachment: {
    name: { type: String, default: '' },
    type: { type: String, default: '' },
    size: { type: Number, default: 0 },
    dataUrl: { type: String, default: '' },
  },
  jobDate: { type: Date, default: Date.now },
  useShipAddress: { type: Boolean, default: false },
  shipPartyName: { type: String, default: '' },
  shipAddress: { type: String, default: '' },
  shipContactNo: { type: String, default: '' },
  shipEmailId: { type: String, default: '' },
  shipGstNo: { type: String, default: '' },
  paperType: { type: String }, // Company Paper / Paper Party

  // Printing Details (Renamed to Type of Work)
  pageSize: { type: String },
  pageCount: { type: String },
  compose: { type: String, default: 'No' },
  design: { type: String, default: 'No' },
  coverPaperCount: { type: Number, default: 0 },
  coverPaperDetails: { type: String },
  innerPaper: { type: String },
  innerPaperCount: { type: Number, default: 0 },
  innerPaperGSM: { type: String },
  innerPaperDetails: { type: String },
  paperSource: { type: String, default: 'Company paper' },
  dieCuttingType: { type: String, enum: ['', 'Old', 'New', 'Testing'], default: '' },
  digitalPrintout: { type: String, enum: ['', 'Yes', 'No'], default: '' },
  digitalPrintoutRemark: { type: String, default: '' },
  plateType: { type: String, default: 'New' },
  plateQty: { type: String, default: "0" },
  printingQty: { type: String, default: "0" },
  lamination: { type: String },
  laminationSide: { type: String },
  laminationSize: { type: String },
  bindingCenterPin: { type: Boolean, default: false },
  bindingSilai: { type: Boolean, default: false },
  bindingSidePin: { type: Boolean, default: false },
  bindingFolding: { type: Boolean, default: false },
  bindingPerforation: { type: Boolean, default: false },
  bindingNumbring: { type: Boolean, default: false },
  bindingRegister: { type: Boolean, default: false },
  bindingGlue: { type: Boolean, default: false },
  bindingKachhi: { type: Boolean, default: false },
  bindingPukki: { type: Boolean, default: false },
  controlPrint: { type: String },
  paper: { type: String },
  printingUC: { type: String },
  printingType: { type: String }, // Color selection
  printingPrice: { type: Number, default: 0 },
  bindingNo: { type: String },
  bindingNote: { type: String },
  filePath: { type: String },
  plateSize: { type: String },
  plateUseCount: { type: String },
  plateNo: { type: String },
  platePrice: { type: Number, default: 0 },
  dripOffPlateType: { type: String },
  dripOffJobSize: { type: String },
  dripOffQty: { type: String },

  // Job Summary
  plateFrom: { type: String },
  paperFrom: { type: String },
  paperSize: { type: String },
  cuttingSize: { type: String },
  paperGSM: { type: String },
  printSheet: { type: String }, // Single / Double
  folding: { type: String },
  jobColor: [Number], // [1, 2, 3, 4]
  jobCounter: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  completionDays: { type: Number },
  notes: { type: String },
  status: { 
    type: String, 
    enum: ['pending', 'in-progress', 'completed', 'cancelled'], 
    default: 'pending' 
  },
  
  timeline: [{
    action: { type: String, required: true },
    details: { type: String },
    userName: { type: String, default: 'System' },
    timestamp: { type: Date, default: Date.now }
  }],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

const JobCard = mongoose.model('JobCard', jobCardSchema);
export default JobCard;
