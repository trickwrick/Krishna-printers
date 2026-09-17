const fs = require('fs');
let code = fs.readFileSync('src/PaperStockStatements.jsx', 'utf8');

const reconcileFunc = 
  const handleReconcile = async () => {
    try {
      const res = await fetch(\\\\/api/paper-stock/reconcile\\\, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(\\\Reconciliation complete. \ discrepancies were found and fixed.\\\);
        loadTransactions();
      } else {
        alert('Reconciliation failed: ' + data.error);
      }
    } catch (error) {
      console.error('Error reconciling:', error);
      alert('Error connecting to server.');
    }
  };
;

code = code.replace(
  'const loadTransactions = async () => {',
  reconcileFunc + '\n  const loadTransactions = async () => {'
);

const buttonHtml = 
          <button 
            onClick={handleReconcile}
            className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-indigo-100 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Reconcile Stock
          </button>
        </div>
;

code = code.replace(
  '</div>\n        </div>\n  \n        <div className="grid grid-cols-1 md:grid-cols-2',
  buttonHtml + '  \n        <div className="grid grid-cols-1 md:grid-cols-2'
);

code = code.replace(
  'import { ArrowLeft, Search, History, ArrowDownToLine, ArrowUpFromLine, Trash2 } from \'lucide-react\';',
  'import { ArrowLeft, Search, History, ArrowDownToLine, ArrowUpFromLine, Trash2, RefreshCw } from \'lucide-react\';'
);

fs.writeFileSync('src/PaperStockStatements.jsx', code);
console.log('Added reconcile button');
