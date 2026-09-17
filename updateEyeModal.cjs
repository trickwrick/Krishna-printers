const fs = require('fs');
let code = fs.readFileSync('src/PaperStockManagement.jsx', 'utf8');

if (!code.includes('const [stockHistory, setStockHistory] = useState([]);')) {
  code = code.replace(
    'const [viewingStock, setViewingStock] = useState(null);',
    'const [viewingStock, setViewingStock] = useState(null);\n    const [stockHistory, setStockHistory] = useState([]);\n    const [loadingHistory, setLoadingHistory] = useState(false);'
  );
}

const fetchHistoryLogic = \
  useEffect(() => {
    if (viewingStock) {
      setLoadingHistory(true);
      fetch(\\\\\\/api/paper-stock/transactions\\\)
        .then(res => res.json())
        .then(data => {
          const filtered = data.filter(t => t.stockId === viewingStock._id && t.transactionType === 'add');
          setStockHistory(filtered);
          setLoadingHistory(false);
        })
        .catch(err => {
          console.error(err);
          setLoadingHistory(false);
        });
    } else {
      setStockHistory([]);
    }
  }, [viewingStock]);
\;

if (!code.includes('setLoadingHistory(true)')) {
    code = code.replace(
        'const fetchStock = async () => {',
        fetchHistoryLogic + '\n\n  const fetchStock = async () => {'
    );
}

const newModal = \
      {viewingStock && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-start p-6 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Stock Add History</h3>
                <p className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wider">{viewingStock.coverName || viewingStock.innerName}</p>
              </div>
              <button 
                onClick={() => setViewingStock(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="overflow-auto flex-1 p-0">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Party Name</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Paper Name</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Challan No.</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice No.</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Qty Added</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loadingHistory ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center text-slate-400 font-bold animate-pulse uppercase tracking-widest">
                        Loading History...
                      </td>
                    </tr>
                  ) : stockHistory.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center text-slate-400 font-medium italic">
                        No add history found for this stock.
                      </td>
                    </tr>
                  ) : (
                    stockHistory.map((item, idx) => {
                      const d = new Date(item.createdAt);
                      return (
                        <tr key={item._id || idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-sm font-bold text-slate-700">{d.toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-500">{d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-sky-50 text-sky-700 text-[10px] font-black uppercase rounded-md tracking-wider">
                              {item.paperType || 'PAPER'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-700">{item.partyName || '—'}</td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-600">{item.paperName || '—'}</td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-700">{item.challanNo || '—'}</td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-700">{item.invoiceNo || '—'}</td>
                          <td className="px-6 py-4 text-sm font-black text-emerald-600 text-right">
                            +{item.quantity?.toLocaleString()} Sheets
                          </td>
                          <td className="px-6 py-4 text-center">
                             <button className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                               <Trash2 size={16} />
                             </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}
\;

const startIdx = code.indexOf('{viewingStock && (');
const endIdx = code.indexOf('</div>', code.indexOf('</button>', code.indexOf('Close', startIdx))) + 6 + 6 + 6; // To cover the nested divs
// A safer replace:
const targetBlockStart = code.indexOf('{viewingStock && (');
const nextBlockStart = code.lastIndexOf('</div>'); // The closing div of PaperStockManagement

if (targetBlockStart !== -1) {
    code = code.substring(0, targetBlockStart) + newModal + '\\n      ' + code.substring(nextBlockStart);
    fs.writeFileSync('src/PaperStockManagement.jsx', code);
    console.log('View modal updated');
} else {
    console.log('Failed to find modal block');
}
