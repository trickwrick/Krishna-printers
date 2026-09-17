const fs = require('fs');
let code = fs.readFileSync('src/PaperStockManagement.jsx', 'utf8');

if (!code.includes('addingStockToItem')) {
  code = code.replace(
    'const [viewingStock, setViewingStock] = useState(null);',
    'const [viewingStock, setViewingStock] = useState(null);\n  const [addingStockToItem, setAddingStockToItem] = useState(null);\n  const [addStockForm, setAddStockForm] = useState({ coverQuantity: \\'\\', innerQuantity: \\'\\', challanNo: \\'\\', invoiceNo: \\'\\', date: new Date().toISOString().split(\\'T\\')[0] });'
  );
}

// Modify Plus icon click to open this modal
code = code.replace(
  'onRowAdd={() => handleDuplicate(item)}',
  'onRowAdd={() => { setAddingStockToItem(item); setAddStockForm({ coverQuantity: \\'\\', innerQuantity: \\'\\', challanNo: \\'\\', invoiceNo: \\'\\', date: new Date().toISOString().split(\\'T\\')[0] }); }}'
);

const addModalLogic = \
  const handleQuickAddSubmit = async (e) => {
    e.preventDefault();
    if (!addingStockToItem) return;
    
    if (!addStockForm.coverQuantity && !addStockForm.innerQuantity) {
      alert('Please enter quantity to add');
      return;
    }

    try {
      const res = await fetch(\\\\\\/api/paper-stock/\\\\\\, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...addingStockToItem,
          coverQuantity: (Number(addingStockToItem.coverQuantity) || 0) + (Number(addStockForm.coverQuantity) || 0),
          innerQuantity: (Number(addingStockToItem.innerQuantity) || 0) + (Number(addStockForm.innerQuantity) || 0),
          challanNo: addStockForm.challanNo,
          invoiceNo: addStockForm.invoiceNo,
          createdAt: addStockForm.date, // passing this down to transaction logic if possible
          isQuickAdd: true // flag to tell backend to use these extra fields
        }),
      });
      if (res.ok) {
        setAddingStockToItem(null);
        fetchStock();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add stock');
      }
    } catch (err) {
      alert('Error adding stock: ' + err.message);
    }
  };

      {addingStockToItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start p-6 border-b border-sky-50 bg-sky-50/30">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Add Stock</h3>
                <p className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wider">{addingStockToItem.coverName || addingStockToItem.innerName}</p>
              </div>
              <button onClick={() => setAddingStockToItem(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleQuickAddSubmit} className="p-6 space-y-6">
              {addingStockToItem.coverName && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b border-slate-100 pb-2">Paper Name & GSM</h4>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-black text-sky-700">Cover</span>
                    <span className="font-medium text-slate-600">
                      {[addingStockToItem.coverPartyName, addingStockToItem.coverName, addingStockToItem.coverGSM ? addingStockToItem.coverGSM + ' GSM' : '', addingStockToItem.coverPaperSize].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <div>
                      <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Remaining Stock</h4>
                      <p className="font-black text-slate-800">Cover: {(addingStockToItem.coverQuantity || 0).toLocaleString()} Sheets</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Last Updated</h4>
                      <p className="font-bold text-slate-800">{new Date(addingStockToItem.updatedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div>
                     <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 mt-4">Add Cover Sheets</label>
                     <input type="number" placeholder="e.g. 5000" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-semibold outline-none transition-all" value={addStockForm.coverQuantity} onChange={e => setAddStockForm({...addStockForm, coverQuantity: e.target.value})} />
                  </div>
                </div>
              )}

              {addingStockToItem.innerName && (
                <div className="space-y-4 border-t border-slate-100 pt-4">
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b border-slate-100 pb-2">Paper Name & GSM (Inner)</h4>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-black text-sky-700">Inner</span>
                    <span className="font-medium text-slate-600">
                      {[addingStockToItem.innerPartyName, addingStockToItem.innerName, addingStockToItem.innerGSM ? addingStockToItem.innerGSM + ' GSM' : '', addingStockToItem.innerPaperSize].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <div>
                      <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Remaining Stock</h4>
                      <p className="font-black text-slate-800">Inner: {(addingStockToItem.innerQuantity || 0).toLocaleString()} Sheets</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Last Updated</h4>
                      <p className="font-bold text-slate-800">{new Date(addingStockToItem.updatedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div>
                     <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 mt-4">Add Inner Sheets</label>
                     <input type="number" placeholder="e.g. 5000" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-semibold outline-none transition-all" value={addStockForm.innerQuantity} onChange={e => setAddStockForm({...addStockForm, innerQuantity: e.target.value})} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Challan No.</label>
                  <input type="text" placeholder="Optional" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:border-sky-500" value={addStockForm.challanNo} onChange={e => setAddStockForm({...addStockForm, challanNo: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Invoice No.</label>
                  <input type="text" placeholder="Optional" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:border-sky-500" value={addStockForm.invoiceNo} onChange={e => setAddStockForm({...addStockForm, invoiceNo: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Date</label>
                  <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:border-sky-500" value={addStockForm.date} onChange={e => setAddStockForm({...addStockForm, date: e.target.value})} />
                </div>
              </div>

              <button type="submit" className="w-full bg-[#0284c7] hover:bg-[#0369a1] text-white py-4 rounded-xl font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                <Plus size={18} /> Add To Stock
              </button>
            </form>
          </div>
        </div>
      )}
\;

const lastDivIdx = code.lastIndexOf('</div>');
if (lastDivIdx !== -1 && !code.includes('handleQuickAddSubmit')) {
  code = code.substring(0, lastDivIdx) + addModalLogic + '\\n' + code.substring(lastDivIdx);
}

fs.writeFileSync('src/PaperStockManagement.jsx', code);
console.log('Add Modal integrated');
