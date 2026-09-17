const fs = require('fs');
let code = fs.readFileSync('src/PaperStockManagement.jsx', 'utf8');

if (!code.includes('Eye')) {
  code = code.replace(
    'import { Layers, Plus, Search, AlertTriangle, Edit2, Trash2, CheckCircle2, Info, ArrowUpRight, RefreshCw }',
    'import { Layers, Plus, Search, AlertTriangle, Edit2, Trash2, CheckCircle2, Info, ArrowUpRight, RefreshCw, Eye }'
  );
  if (!code.includes('Eye')) {
    code = code.replace(
      'import { Layers, Plus, Search, AlertTriangle, Edit2, Trash2, CheckCircle2, Info, ArrowUpRight }',
      'import { Layers, Plus, Search, AlertTriangle, Edit2, Trash2, CheckCircle2, Info, ArrowUpRight, Eye }'
    );
  }
}

const iconsHtml = \
                               <div className="flex justify-center gap-2">
                                  <button
                                    onClick={() => alert('View Statements feature coming soon')}
                                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                    title="View Stock Statements"
                                  >
                                    <Eye size={16} />
                                  </button>
                                  {hasPermission('paperStock', 'edit') && (
                                    <button
                                      onClick={() => alert('Quick Add feature coming soon')}
                                      className="p-2 text-sky-500 hover:bg-sky-50 rounded-lg transition-all"
                                      title="Quick Add Quantity"
                                    >
                                      <Plus size={16} />
                                    </button>
                                  )}
                                  {hasPermission('paperStock', 'edit') && (
                                    <button 
                                      onClick={() => handleEdit(item)}
                                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                      title="Edit Stock Details"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                  )}
                                  {hasPermission('paperStock', 'delete') && (
                                    <button 
                                      onClick={() => handleDelete(item._id)}
                                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                      title="Delete Stock"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                               </div>
\;

const startIdx = code.indexOf('<div className="flex justify-center gap-2">');
const endIdx = code.indexOf('</div>', code.indexOf('<Trash2 size={16} />', startIdx)) + 6;

if (startIdx !== -1 && endIdx !== -1) {
    code = code.substring(0, startIdx) + iconsHtml + code.substring(endIdx);
    fs.writeFileSync('src/PaperStockManagement.jsx', code);
    console.log('Icons updated successfully');
} else {
    console.log('Failed to find replace block');
}
