import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema({
  siteTitle: { type: String, default: 'Krishna Printers CRM' },
  adminEmail: { type: String },
  adminMobile: { type: String },
  supportEmail: { type: String },
  supportMobile: { type: String },
  address: { type: String },
  logo: { type: String }, // Store as string (URL or Base64)
  whiteLogo: { type: String },
  favicon: { type: String },
  profileImage: { type: String },
  description: { type: String },
  mobile: { type: String },
  gmailId: { type: String },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Setting = mongoose.model('Setting', settingSchema);
export default Setting;
