import re
file_path = r"c:\Users\new user\Desktop\Krishna printers\src\JobCardForm.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the inner paper rendering from print preview
old_print_render = """                    ['Cover Paper', [previewData.paper, previewData.paperGSM && `${previewData.paperGSM} GSM`].filter(Boolean).join(' - ')],
                    ['Inner Paper', [previewData.innerPaper, previewData.innerPaperGSM && `${previewData.innerPaperGSM} GSM`].filter(Boolean).join(' - ')],"""

new_print_render = """                    ['Paper', [previewData.paper, previewData.paperGSM && `${previewData.paperGSM} GSM`].filter(Boolean).join(' - ')],"""

content = content.replace(old_print_render, new_print_render)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("done")
