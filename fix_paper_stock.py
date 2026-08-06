import re
file_path = r"c:\Users\new user\Desktop\Krishna printers\src\PaperStockManagement.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the Cover/Inner rendering in the stock listing
old_render_1 = """                                     {(item.coverGSM !== undefined || item.gsm) ? (
                                       <span className="bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-100">
                                         Cover: {item.coverPartyName ? `${item.coverPartyName} · ` : ''}{item.coverName || item.name || '--'}{item.coverSupplier ? ` · Supplier: ${item.coverSupplier}` : ''} · {item.coverGSM !== undefined ? item.coverGSM : item.gsm} GSM{item.coverPaperSize ? ` · ${item.coverPaperSize}` : ''}
                                       </span>
                                     ) : (
                                       <span className="bg-gray-50 text-gray-400 px-2 py-0.5 rounded border border-gray-200">Cover: --</span>
                                     )}
                                     {item.innerGSM ? (
                                       <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                                         Inner: {item.innerPartyName ? `${item.innerPartyName} · ` : ''}{item.innerName || item.name || '--'}{item.innerSupplier ? ` · Supplier: ${item.innerSupplier}` : ''} · {item.innerGSM} GSM{item.innerPaperSize ? ` · ${item.innerPaperSize}` : ''}
                                       </span>
                                     ) : null}"""

new_render_1 = """                                     {(item.coverGSM !== undefined || item.gsm) ? (
                                       <span className="bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-100">
                                         {item.coverPartyName ? `${item.coverPartyName} · ` : ''}{item.coverName || item.name || '--'}{item.coverSupplier ? ` · Supplier: ${item.coverSupplier}` : ''} · {item.coverGSM !== undefined ? item.coverGSM : item.gsm} GSM{item.coverPaperSize ? ` · ${item.coverPaperSize}` : ''}
                                       </span>
                                     ) : (
                                       <span className="bg-gray-50 text-gray-400 px-2 py-0.5 rounded border border-gray-200">--</span>
                                     )}"""

content = content.replace(old_render_1, new_render_1)

# Also fix the Paper Name & GSM rendering above it:
old_render_name = """                                     {(item.coverName || item.name) === (item.innerName || item.name)
                                       ? (item.coverName || item.name)
                                       : `${item.coverName || item.name || '--'} / ${item.innerName || '--'}`}"""
new_render_name = """                                     {item.coverName || item.name || '--'}"""
content = content.replace(old_render_name, new_render_name)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("done")
