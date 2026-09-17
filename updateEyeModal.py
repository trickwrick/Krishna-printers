import sys

with open('src/PaperStockManagement.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the useEffect logic for fetching transactions
old_fetch = """        fetch(`${API_BASE_URL}/api/paper-stock/transactions`)
          .then(res => res.json())
          .then(data => {
            const filtered = data.filter(t => t.stockId === viewingStock._id && t.transactionType === 'add');
            setStockHistory(filtered);"""

new_fetch = """        fetch(`${API_BASE_URL}/api/paper-stock/transactions`)
          .then(res => res.json())
          .then(data => {
            const filtered = data.filter(t => (t.paperStockId === viewingStock._id || t.stockId === viewingStock._id));
            setStockHistory(filtered);"""

content = content.replace(old_fetch, new_fetch)

# Fix the table header and rows
old_table_header = """                  <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-100">
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
                  </thead>"""

new_table_header = """                  <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Time</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Action</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Details</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ref / Used In</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Qty</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Balance</th>
                    </tr>
                  </thead>"""

content = content.replace(old_table_header, new_table_header)

old_table_body = """                  <tbody className="divide-y divide-slate-50">
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
                  </tbody>"""

new_table_body = """                  <tbody className="divide-y divide-slate-50">
                    {loadingHistory ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-bold animate-pulse uppercase tracking-widest">
                          Loading History...
                        </td>
                      </tr>
                    ) : stockHistory.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-medium italic">
                          No history found for this stock.
                        </td>
                      </tr>
                    ) : (
                      stockHistory.map((item, idx) => {
                        const d = new Date(item.createdAt);
                        const isAdd = item.transactionType === 'add';
                        return (
                          <tr key={item._id || idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="text-sm font-bold text-slate-700">{d.toLocaleDateString()}</div>
                              <div className="text-[10px] font-bold text-slate-400">{d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-2 py-1 text-[10px] font-black uppercase rounded-md tracking-wider ${isAdd ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {isAdd ? 'ADD' : 'DEDUCT'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-bold text-slate-700">{item.note || (isAdd ? 'Stock Added' : 'Stock Used')}</div>
                              {item.paperName && <div className="text-[10px] font-bold text-slate-400 mt-0.5">{item.paperName} {item.partyName ? `(${item.partyName})` : ''}</div>}
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-bold text-slate-700">
                                {isAdd ? (
                                  [item.challanNo ? `Challan: ${item.challanNo}` : '', item.invoiceNo ? `Invoice: ${item.invoiceNo}` : ''].filter(Boolean).join(' | ') || '—'
                                ) : (
                                  item.jobNumber ? `Job: ${item.jobNumber}` : '—'
                                )}
                              </div>
                            </td>
                            <td className={`px-6 py-4 text-sm font-black text-right ${isAdd ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {isAdd ? '+' : '-'}{item.quantity?.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-sm font-black text-slate-600 text-right">
                              {item.balanceAfter?.toLocaleString() || '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>"""

content = content.replace(old_table_body, new_table_body)

old_title = '<h3 className="text-xl font-black text-slate-800 tracking-tight">Stock Add History</h3>'
new_title = '<h3 className="text-xl font-black text-slate-800 tracking-tight">Stock History (Add/Deduct)</h3>'
content = content.replace(old_title, new_title)

with open('src/PaperStockManagement.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Eye modal updated")
