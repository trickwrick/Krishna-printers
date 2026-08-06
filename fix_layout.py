import re
file_path = r"c:\Users\new user\Desktop\Krishna printers\src\PaperStockManagement.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the layout
old_layout = """              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cover Paper Section */}
                <div className="bg-sky-50/30 p-5 rounded-2xl border border-sky-100/50 space-y-4">
                  <h3 className="text-xs font-black text-sky-700 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-sky-500 rounded-full" />
                    Paper Details
                  </h3>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 pl-1 tracking-widest">Party Name</label>"""

new_layout = """              <div className="w-full mb-6">
                <div className="bg-sky-50/30 p-5 sm:p-6 rounded-2xl border border-sky-100/50">
                  <h3 className="text-xs font-black text-sky-700 uppercase tracking-wider flex items-center gap-2 mb-6">
                    <span className="w-1.5 h-3 bg-sky-500 rounded-full" />
                    Paper Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 pl-1 tracking-widest">Party Name</label>"""

content = content.replace(old_layout, new_layout)

old_low_stock = """                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 pl-1 tracking-widest">Low Stock Alert (Value)</label>
                  <input 
                    type="number" required
                    placeholder="Alert when below..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold"
                    value={formData.lowStockThreshold}
                    onChange={(e) => setFormData({...formData, lowStockThreshold: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 pl-1 tracking-widest">Description / Best Use</label>"""

new_low_stock = """                  </div>
                  <div className="mt-5 pt-5 border-t border-sky-100/50">
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 pl-1 tracking-widest">Low Stock Alert (Value)</label>
                    <input 
                      type="number" required
                      placeholder="Alert when below..."
                      className="w-full max-w-sm px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold"
                      value={formData.lowStockThreshold}
                      onChange={(e) => setFormData({...formData, lowStockThreshold: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 pl-1 tracking-widest">Description / Best Use</label>"""

content = content.replace(old_low_stock, new_low_stock)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("done")
