import re
import os

def update_job_card_form():
    file_path = r'c:\Users\new user\Desktop\Krishna printers\src\JobCardForm.jsx'
    if not os.path.exists(file_path):
        return
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    content = content.replace('<h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 pl-1">Cover Paper Details</h4>', '')
    content = content.replace('<label className="text-xs font-bold text-gray-500 mb-1">Cover paper gsm</label>', '<label className="text-xs font-bold text-gray-500 mb-1">Paper GSM</label>')
    content = content.replace('<label className="text-xs font-bold text-gray-500 mb-1">Cover paper count</label>', '<label className="text-xs font-bold text-gray-500 mb-1">Paper count</label>')
    content = content.replace('<label className="text-xs font-bold text-gray-500 mb-1">Cover paper Details</label>', '<label className="text-xs font-bold text-gray-500 mb-1">Paper Details</label>')

    start_inner = content.find('            {/* Inner Paper Section */}')
    end_inner = content.find('          {/* Section 5: Die Cutting */}')
    if start_inner != -1 and end_inner != -1:
        content = content[:start_inner] + '          </div>\n\n' + content[end_inner:]

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

def update_paper_stock_management():
    file_path = r'c:\Users\new user\Desktop\Krishna printers\src\PaperStockManagement.jsx'
    if not os.path.exists(file_path):
        return
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    old_heading = '<h3 className="text-xs font-black text-sky-700 uppercase tracking-wider flex items-center gap-2">\n                    <span className="w-1.5 h-3 bg-sky-500 rounded-full" />\n                    Cover Paper\n                  </h3>'
    new_heading = '<h3 className="text-xs font-black text-sky-700 uppercase tracking-wider flex items-center gap-2">\n                    <span className="w-1.5 h-3 bg-sky-500 rounded-full" />\n                    Paper Details\n                  </h3>'
    content = content.replace(old_heading, new_heading)
    
    content = content.replace('Cover GSM', 'Paper GSM')
    content = content.replace('Cover Initial Sheet Count', 'Initial Sheet Count')
    content = content.replace('Add More Cover Sheets', 'Add More Sheets')
    content = content.replace('Cover Paper Size', 'Paper Size')

    start_inner = content.find('                {/* Inner Paper Section */}')
    end_inner = content.find('                <div className="md:col-span-2">')
    if start_inner != -1 and end_inner != -1:
        content = content[:start_inner] + content[end_inner:]

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

update_job_card_form()
update_paper_stock_management()
print("Updates applied successfully.")
