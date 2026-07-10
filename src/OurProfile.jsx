import React, { useState, useEffect } from 'react';
import { User, Save, Upload, X, Phone, Mail, FileText } from 'lucide-react';
import { API_BASE_URL } from './utils/apiBase';

const OurProfile = () => {
  const [formData, setFormData] = useState({
    description: '',
    mobile: '',
    gmailId: ''
  });

  const [images, setImages] = useState({
    profileImage: null
  });

  const [message, setMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load data on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/settings`);
        if (response.ok) {
          const data = await response.json();
          setFormData({
            description: data.description || '',
            mobile: data.mobile || '',
            gmailId: data.gmailId || ''
          });
          setImages({
            profileImage: data.profileImage || null
          });
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSettings();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only JPG, PNG, GIF, and WebP are allowed');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const fullSettings = {
      ...formData,
      ...images,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fullSettings)
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to update profile.' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading profile...</div>;
  }

  return (
    <div className="mx-auto mt-8 pb-12 animate-in fade-in duration-500 max-w-4xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="bg-blue-600 w-1.5 h-6 rounded-full" />
            Our Profile
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1 font-medium">Manage your profile details</p>
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <User size={18} className="text-blue-600" />
            Profile Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Profile Image</label>
              <div className="relative group aspect-square h-40 w-40 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center transition-all hover:border-blue-400 overflow-hidden">
                {images.profileImage ? (
                  <>
                    <img src={images.profileImage} className="w-full h-full object-cover" alt="Profile" />
                    <button
                      type="button"
                      onClick={() => setImages(prev => ({ ...prev, profileImage: null }))}
                      className="absolute top-2 right-2 bg-red-100 text-red-600 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center">
                    <Upload className="text-gray-400 group-hover:text-blue-500 mb-2 transition-colors" />
                    <span className="text-xs text-gray-500 font-medium">Upload Image</span>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'profileImage')} />
                  </label>
                )}
              </div>
            </div>
            <div className="md:col-span-2 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <FileText size={14} className="text-gray-400" /> Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Tell us about yourself or your company"
                  rows="4"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium resize-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Phone size={14} className="text-gray-400" /> Mobile
              </label>
              <input
                type="text"
                name="mobile"
                value={formData.mobile}
                onChange={handleInputChange}
                placeholder="+91 XXXXX XXXXX"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Mail size={14} className="text-gray-400" /> Gmail ID
              </label>
              <input
                type="email"
                name="gmailId"
                value={formData.gmailId}
                onChange={handleInputChange}
                placeholder="your.email@gmail.com"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
              />
            </div>
          </div>

          <div className="pt-8 mt-8 border-t border-gray-50 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-xl font-bold transition-all shadow-xl shadow-blue-100 hover:scale-[1.02] active:scale-95 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <Save size={20} /> {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default OurProfile;
