const fs = require('fs');
let code = fs.readFileSync('src/PaperStockManagement.jsx', 'utf8');

if (!code.includes('const [viewingStock, setViewingStock] = useState(null);')) {
  code = code.replace(
    'const [isAdding, setIsAdding] = useState(false);',
    'const [isAdding, setIsAdding] = useState(false);\n    const [viewingStock, setViewingStock] = useState(null);'
  );
}

const duplicateLogic = `
                                    <button
                                      onClick={() => {
                                        setEditingId(null);
                                        setFormData({
                                          coverPartyName: item.coverPartyName || '',
                                          coverName: item.coverName || '',
                                          coverSupplier: item.coverSupplier || '',
                                          innerPartyName: item.innerPartyName || '',
                                          innerName: item.innerName || '',
                                          innerSupplier: item.innerSupplier || '',
                                          gsm: item.gsm || '',
                                          coverGSM: item.coverGSM || '',
                                          innerGSM: item.innerGSM || '',
                                          coverPaperSize: item.coverPaperSize || '',
                                          innerPaperSize: item.innerPaperSize || '',
                                          description: item.description || '',
                                          paperSource: item.paperSource || 'Company paper',
                                          coverQuantity: '',
                                          innerQuantity: ''
                                        });
                                        setCurrentStock({ cover: 0, inner: 0 });
                                        setIsAdding(true);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                      }}
                                      className="p-2 text-sky-500 hover:bg-sky-50 rounded-lg transition-all"
                                      title="Duplicate / Add New"
                                    >
                                      <Plus size={16} />
                                    </button>
`;

const eyeLogic = `
                                  <button
                                    onClick={() => setViewingStock(item)}
                                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                    title="View Stock Details"
                                  >
                                    <Eye size={16} />
                                  </button>
`;

// Replace dummy eye logic
code = code.replace(
  /<button[\s\n]*onClick=\{\(\) => alert\('View Statements feature coming soon'\)\}[\s\S]*?<Eye size=\{16\} \/>[\s\n]*<\/button>/g,
  eyeLogic
);

// Replace dummy plus logic
code = code.replace(
  /<button[\s\n]*onClick=\{\(\) => alert\('Quick Add feature coming soon'\)\}[\s\S]*?<Plus size=\{16\} \/>[\s\n]*<\/button>/g,
  duplicateLogic
);

// Add view modal before final closing div
const viewModal = `
      {viewingStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Info className="text-emerald-500" size={24} />
                  Stock Details
                </h3>
                <p className="text-sm text-gray-500 mt-1">{viewingStock.paperSource}</p>
              </div>
              <button 
                onClick={() => setViewingStock(null)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
               {viewingStock.coverName && (
                 <div className="flex justify-between border-b border-gray-100 pb-3">
                    <span className="text-gray-500 font-bold text-sm">Cover Paper</span>
                    <span className="text-gray-900 font-medium">{viewingStock.coverName} {viewingStock.coverGSM ? \`(\${viewingStock.coverGSM} GSM)\` : ''}</span>
                 </div>
               )}
               {viewingStock.innerName && (
                 <div className="flex justify-between border-b border-gray-100 pb-3">
                    <span className="text-gray-500 font-bold text-sm">Inner Paper</span>
                    <span className="text-gray-900 font-medium">{viewingStock.innerName} {viewingStock.innerGSM ? \`(\${viewingStock.innerGSM} GSM)\` : ''}</span>
                 </div>
               )}
               <div className="flex justify-between border-b border-gray-100 pb-3">
                  <span className="text-gray-500 font-bold text-sm">Total Quantity</span>
                  <span className="text-gray-900 font-black text-lg">{(viewingStock.quantity || 0).toLocaleString()}</span>
               </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setViewingStock(null)}
                className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg font-bold hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
`;

if (!code.includes('viewingStock &&')) {
   const lastDivIdx = code.lastIndexOf('</div>');
   code = code.substring(0, lastDivIdx) + viewModal + code.substring(lastDivIdx);
}

if (!code.includes('import { X } from') && !code.includes('X } from')) {
   code = code.replace(
      'import { Layers, Plus, Search, AlertTriangle, Edit2, Trash2, CheckCircle2, Info, ArrowUpRight, RefreshCw, Eye } from \'lucide-react\';',
      'import { Layers, Plus, Search, AlertTriangle, Edit2, Trash2, CheckCircle2, Info, ArrowUpRight, RefreshCw, Eye, X } from \'lucide-react\';'
   );
}

fs.writeFileSync('src/PaperStockManagement.jsx', code);
console.log('UI Icons updated with logic');
