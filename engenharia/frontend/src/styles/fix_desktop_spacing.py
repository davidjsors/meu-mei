import re
import os

path = r"c:\Users\david\Documents\MeuMEI\meu-mei\engenharia\frontend\src\styles\globals.css"

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Restore/Add global definitions for grids (outside media queries)
# Let's put them near the global onboarding section (around line 1006)
grid_defs = """
.onboarding-profile-grid,
.onboarding-pin-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  width: 100%;
}
"""

if ".onboarding-profile-grid" not in content[:1200]: # avoid duplicates if it was already there
    # Insert after .onboarding-card definition
    content = re.sub(r'(\.onboarding-card\s*\{.*?\})', r'\1\n' + grid_defs, content, flags=re.DOTALL)

# 2. Fix gap in .onboarding-content (global)
# It's at 2544 and potentially 2905
content = re.sub(r'(\.onboarding-content\s*\{.*?)gap:\s*0\s*;', r'\1gap: 32px;', content, flags=re.DOTALL)

# 3. Ensure .onboarding-main in desktop has white background (already set but let's be sure)
# And make sure it's not transparent globally
main_pattern = r'(\.onboarding-main\s*\{)(.*?)(\})'
def fix_main_global(match):
    header = match.group(1)
    body = match.group(2)
    footer = match.group(3)
    # If this is the desktop one (around line 2528)
    if "flex: 1;" in body and "background-color: transparent;" in body:
        new_body = body.replace("background-color: transparent;", "background-color: #FFFFFF;")
        return f"{header}{new_body}{footer}"
    return match.group(0)

content = re.sub(main_pattern, fix_main_global, content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully restored desktop grids and spacing.")
