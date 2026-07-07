import React, { useState, useEffect } from 'react';
import { Globe, Save, Upload, Plus, X, Phone, Mail, MapPin } from 'lucide-react';

const DEFAULT_SITE_TITLE = 'Krishna Printers';

const SiteSettings = () => {
  const [formData, setFormData] = useState({
    siteTitle: '',
    adminEmail: '',
    adminMobile: '',
    supportEmail: '',
    supportMobile: '',
    address: ''
  });

  const [images, setImages] = useState({
    logo: null,
    whiteLogo: null,
    favicon: null
  });

  const [message, setMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load data on component mount
  useEffect(() => {
    const saved = localStorage.getItem('siteSettings');
    if (saved) {
      const data = JSON.parse(saved);
      setFormData({
        siteTitle: DEFAULT_SITE_TITLE,
        adminEmail: data.adminEmail || '',
        adminMobile: data.adminMobile || '',
        supportEmail: data.supportEmail || '',
        supportMobile: data.supportMobile || '',
        address: data.address || ''
      });
      setImages({
        logo: data.logo || null,
        whiteLogo: data.whiteLogo || null,
        favicon: data.favicon || null
      });
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only JPG, PNG and GIF are allowed');
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB
      alert('File size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImages(prev => ({ ...prev, [type]: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSaving(true);

    const fullSettings = {
      ...formData,
      ...images,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem('siteSettings', JSON.stringify(fullSettings));

    // Update dynamically
    document.title = fullSettings.siteTitle || DEFAULT_SITE_TITLE;

    // Update favicon tag
    if (fullSettings.favicon) {
      const link = document.querySelector("link[rel~='icon']");
      if (link) {
        link.href = fullSettings.favicon;
      }
    }

    // Trigger global update in App.jsx
    window.dispatchEvent(new Event('siteSettingsUpdated'));

    setMessage({ type: 'success', text: 'Settings updated successfully!' });
    setIsSaving(false);

    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="mx-auto mt-8 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="bg-blue-600 w-1.5 h-6 rounded-full" />
            Site Settings
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1 font-medium font-medium">Configure your website profile and branding</p>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
          }`}>
          <div className="w-2 h-2 rounded-full bg-current" />
          <span className="font-bold text-sm tracking-wide">{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Branding Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-blue-600 rounded-full" />
            Branding & Assets
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Logo Upload */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Site Logo</label>
              <div className="relative group aspect-video bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center transition-all hover:border-blue-400 overflow-hidden">
                {images.logo ? (
                  <>
                    <img src={images.logo} className="w-full h-full object-contain p-4" alt="Logo preview" />
                    <button
                      type="button"
                      onClick={() => setImages(prev => ({ ...prev, logo: null }))}
                      className="absolute top-2 right-2 bg-red-100 text-red-600 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center">
                    <Upload className="text-gray-400 group-hover:text-blue-500 mb-2 transition-colors" />
                    <span className="text-xs text-gray-500 font-medium">Upload Logo</span>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'logo')} />
                  </label>
                )}
              </div>
            </div>

            {/* White Logo Upload */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">White Logo</label>
              <div className="relative group aspect-video bg-gray-800 border-2 border-dashed border-gray-600 rounded-2xl flex flex-col items-center justify-center transition-all hover:border-blue-400 overflow-hidden">
                {images.whiteLogo ? (
                  <>
                    <img src={images.whiteLogo} className="w-full h-full object-contain p-4" alt="White logo preview" />
                    <button
                      type="button"
                      onClick={() => setImages(prev => ({ ...prev, whiteLogo: null }))}
                      className="absolute top-2 right-2 bg-red-100 text-red-600 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center">
                    <Upload className="text-gray-400 group-hover:text-blue-500 mb-2 transition-colors" />
                    <span className="text-xs text-gray-300 font-medium">Upload White Logo</span>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'whiteLogo')} />
                  </label>
                )}
              </div>
            </div>

            {/* Favicon Upload */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Favicon</label>
              <div className="relative group aspect-square h-full max-h-[140px] bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center transition-all hover:border-blue-400 overflow-hidden mx-auto">
                {images.favicon ? (
                  <>
                    <img src={images.favicon} className="w-16 h-16 object-contain" alt="Favicon preview" />
                    <button
                      type="button"
                      onClick={() => setImages(prev => ({ ...prev, favicon: null }))}
                      className="absolute top-2 right-2 bg-red-100 text-red-600 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center">
                    <div className="bg-white p-2 rounded-lg shadow-sm mb-2">
                      <Plus size={20} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <span className="text-xs text-gray-500 font-medium">Favicon</span>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'favicon')} />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* General Info Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-8">
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-blue-600 rounded-full" />
            General Information
          </h2>

          <div className="space-y-6 max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Globe size={14} className="text-gray-400" /> Site Title
                </label>
                <input
                  type="text"
                  name="siteTitle"
                  value={formData.siteTitle}
                  onChange={handleInputChange}
                  placeholder="e.g. Krishna Printers"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Mail size={14} className="text-gray-400" /> Administration Email
                </label>
                <input
                  type="email"
                  name="adminEmail"
                  value={formData.adminEmail}
                  onChange={handleInputChange}
                  placeholder="admin@example.com"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Phone size={14} className="text-gray-400" /> Admin Mobile
                </label>
                <input
                  type="text"
                  name="adminMobile"
                  value={formData.adminMobile}
                  onChange={handleInputChange}
                  placeholder="+91 XXXXX XXXXX"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Mail size={14} className="text-gray-400" /> Support Email
                </label>
                <input
                  type="email"
                  name="supportEmail"
                  value={formData.supportEmail}
                  onChange={handleInputChange}
                  placeholder="support@example.com"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Phone size={14} className="text-gray-400" /> Support Mobile
                </label>
                <input
                  type="text"
                  name="supportMobile"
                  value={formData.supportMobile}
                  onChange={handleInputChange}
                  placeholder="+91 XXXXX XXXXX"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <MapPin size={14} className="text-gray-400" /> Office Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter full office address"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                />
              </div>
            </div>
            <div className="pt-8 border-t border-gray-50 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-xl font-bold transition-all shadow-xl shadow-blue-100 hover:scale-[1.02] active:scale-95 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <Save size={20} /> {isSaving ? 'Updating...' : 'Update Settings'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SiteSettings;
