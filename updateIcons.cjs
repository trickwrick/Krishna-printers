const fs = require('fs');
let code = fs.readFileSync('src/PaperStockManagement.jsx', 'utf8');

if (!code.includes('Eye')) {
  code = code.replace(
    'import { Layers, Plus, Search, AlertTriangle, Edit2, Trash2, CheckCircle2, Info, ArrowUpRight, RefreshCw }',
    'import { Layers, Plus, Search, AlertTriangle, Edit2, Trash2, CheckCircle2, Info, ArrowUpRight, RefreshCw, Eye }'
  );
}

const iconsHtml = `
                               <div className="flex items-center justify-center gap-4">
                                  <button
                                    onClick={() => alert('View Statements feature coming soon')}
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                    title="View Stock Statements"
                                  >
                                    <Eye size={16} />
                                  </button>
                                  {hasPermission('paperStock', 'edit') && (
                                    <button
                                      onClick={() => alert('Quick Add feature coming soon')}
                                      className="p-1.5 text-sky-500 hover:bg-sky-50 rounded-lg transition-colors"
                                      title="Quick Add Quantity"
                                    >
                                      <Plus size={16} />
                                    </button>
                                  )}
                                  {hasPermission('paperStock', 'edit') && (
                                    <button
                                      onClick={() => {
                                        setEditingId(item._id);
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
                                        });
                                        setCurrentStock({ cover: item.coverQuantity || 0, inner: item.innerQuantity || 0 });
                                        setIsAdding(true);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                      }}
                                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Edit Stock Details"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                  )}
                                  {hasPermission('paperStock', 'delete') && (
                                    <button
                                      onClick={() => handleDelete(item._id)}
                                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Delete Stock"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                               </div>
`;

// Replace the entire contents of the td that contains the actions
const startIdx = code.indexOf('<div className="flex items-center justify-center gap-2">');
let endIdx = code.indexOf('</div>', code.indexOf('<RefreshCw size={16} />')) + 6;
if(endIdx < startIdx) {
  endIdx = code.indexOf('</div>', code.indexOf('<Trash2 size={16} />')) + 6;
}

if (startIdx !== -1 && endIdx !== -1) {
    code = code.substring(0, startIdx) + iconsHtml + code.substring(endIdx);
    fs.writeFileSync('src/PaperStockManagement.jsx', code);
    console.log('UI Icons updated');
} else {
    console.log('Could not find target HTML block');
}
