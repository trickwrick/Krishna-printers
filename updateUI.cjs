const fs = require('fs');
let code = fs.readFileSync('src/PaperStockManagement.jsx', 'utf8');

if (!code.includes('RefreshCw')) {
  code = code.replace(
    'import { Layers, Plus, Search, AlertTriangle, Edit2, Trash2, CheckCircle2, Info, ArrowUpRight } from \'lucide-react\';',
    'import { Layers, Plus, Search, AlertTriangle, Edit2, Trash2, CheckCircle2, Info, ArrowUpRight, RefreshCw } from \'lucide-react\';'
  );
}

const syncFunction = `
  const handleSync = async (id) => {
    try {
      const res = await fetch(\`\${API_BASE_URL}/api/paper-stock/reconcile/\${id}\`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('Stock Reconciled Successfully');
        fetchStock();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      alert('Error reconciling stock: ' + err.message);
    }
  };
`;

if (!code.includes('handleSync')) {
    code = code.replace(
        'const handleDelete = async (id) => {',
        syncFunction + '\n\n  const handleDelete = async (id) => {'
    );
}

const syncButton = `
<button
  onClick={() => handleSync(item._id)}
  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
  title="Sync & Reconcile Stock"
>
  <RefreshCw size={16} />
</button>
`;

if (!code.includes('handleSync(item._id)')) {
    code = code.replace(
        '<Edit2 size={16} />\n                                    </button>',
        '<Edit2 size={16} />\n                                    </button>\n                                    ' + syncButton
    );
}

fs.writeFileSync('src/PaperStockManagement.jsx', code);
console.log('UI updated');
