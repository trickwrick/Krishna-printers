const fs = require('fs');
let code = fs.readFileSync('src/PaperStockManagement.jsx', 'utf8');

if (!code.includes('ActionButtons')) {
    code = code.replace(
        'import { Layers, Plus, Search, AlertTriangle, Edit2, Trash2, CheckCircle2, Info, ArrowUpRight, RefreshCw, Eye, X } from \'lucide-react\';',
        'import { Layers, Plus, Search, AlertTriangle, Edit2, Trash2, CheckCircle2, Info, ArrowUpRight, RefreshCw, Eye, X } from \'lucide-react\';\nimport ActionButtons from \'./ActionButtons\';'
    );
}

const duplicateLogic = `
  const handleDuplicate = (item) => {
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
  };
`;

if (!code.includes('handleDuplicate')) {
    code = code.replace(
        'const handleEdit = (item) => {',
        duplicateLogic + '\n\n  const handleEdit = (item) => {'
    );
}

const actionsComponent = `
                              <ActionButtons
                                recordId={item._id}
                                onRowView={() => setViewingStock(item)}
                                onRowAdd={() => handleDuplicate(item)}
                                onRowEdit={() => handleEdit(item)}
                                onRowDelete={() => handleDelete(item._id)}
                                canEdit={hasPermission('paperStock', 'edit')}
                                canDelete={hasPermission('paperStock', 'delete')}
                              />
`;

const startIdx = code.indexOf('<div className="flex justify-center gap-2">');
const endIdx = code.indexOf('</div>', code.indexOf('<Trash2 size={16} />', startIdx)) + 6;

if (startIdx !== -1 && endIdx !== -1) {
    code = code.substring(0, startIdx) + actionsComponent + code.substring(endIdx);
    fs.writeFileSync('src/PaperStockManagement.jsx', code);
    console.log('ActionButtons implemented');
} else {
    console.log('Failed to find replace block');
}
