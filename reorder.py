import re

with open('src/JobCardForm.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = '<div className="space-y-6 sm:space-y-8">'
end_marker = '<div className="mt-8 flex justify-end">'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Could not find boundaries.")
    exit(1)

# Find the last closing </div> before end_marker
end_idx = content.rfind('</div>', start_idx, end_idx) + 6

before = content[:start_idx + len(start_marker)]
inner = content[start_idx + len(start_marker) : end_idx - 6] # drop the closing </div> of space-y-6
after = content[end_idx - 6:]

sections_raw = re.split(r'(\s*\{\/\* Section [^}]+ \*\/\}\s*)', inner)
sections = []

current_header = ""
current_body = ""

for chunk in sections_raw:
    if "/* Section " in chunk:
        if current_header:
            sections.append({"header": current_header, "body": current_body})
        current_header = chunk
        current_body = ""
    else:
        current_body += chunk

if current_header:
    sections.append({"header": current_header, "body": current_body})

def get_section(name):
    for s in sections:
        if name in s['header']:
            return s
    return None

ordered_names = [
    ('Basic Details', 'Basic Details'),
    ('Type Of Work', 'Type Of Work'),
    ('Computer Details', 'Computer Details'),
    ('Plate', 'Plate Details'), # Plate & Printing Details
    ('Paper details', 'Paper Details'),
    ('Finishing Processes', 'Finishing Details'),
    ('Time Period', 'Time Period'),
    ('Remarks', 'Remarks')
]

new_sections = []
for search_str, new_name in ordered_names:
    s = get_section(search_str)
    if s:
        new_sections.append((s, new_name))
    else:
        print(f"WARNING: Section {search_str} not found!")

new_inner = "\n"
for i, (s, new_name) in enumerate(new_sections):
    new_inner += f"          {{/* Section {i+1}: {new_name} */}}\n"
    # Ensure body starts properly
    body = s['body'].lstrip('\n')
    new_inner += body

with open('src/JobCardForm.jsx', 'w', encoding='utf-8') as f:
    f.write(before + new_inner + after)

print("Done reordering.")
