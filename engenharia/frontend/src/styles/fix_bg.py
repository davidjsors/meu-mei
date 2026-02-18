import re
import os

path = r"c:\Users\david\Documents\MeuMEI\meu-mei\engenharia\frontend\src\styles\globals.css"

if not os.path.exists(path):
    print(f"File not found: {path}")
    exit(1)

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update onboarding-split-container inside @media (max-width: 768px)
# Find the @media block first to be safe, but since it's unique enough:
media_mobile_pattern = r'(@media\s*\(max-width:\s*768px\)\s*\{.*?\.onboarding-split-container\s*\{)(.*?)(\})'
# This is hard to match across whole file, let's use a simpler approach

# Replace onboarding-split-container properties
split_container_pattern = r'(\.onboarding-split-container\s*\{)(.*?)(\})'
def fix_split(match):
    header = match.group(1)
    body = match.group(2)
    footer = match.group(3)
    if "flex-direction: column;" in body and "height: 100vh;" in body:
        return f"""{header}
    flex-direction: column;
    overflow-y: auto;
    height: auto;
    min-height: 100vh;
    background-color: var(--bg-app);
    background-image:
      radial-gradient(at 10% 10%, rgba(227, 38, 54, 0.12) 0px, transparent 80%),
      radial-gradient(at 90% 90%, rgba(0, 210, 106, 0.08) 0px, transparent 80%);
  {footer}"""
    return match.group(0)

content = re.sub(split_container_pattern, fix_split, content, flags=re.DOTALL)

# 2. Update onboarding-main background-color to transparent
onboarding_main_pattern = r'(\.onboarding-main\s*\{)(.*?)(\})'
def fix_main(match):
    header = match.group(1)
    body = match.group(2)
    footer = match.group(3)
    # Check if it's the right one (white background)
    if re.search(r'background-color:\s*#F+;', body, re.IGNORECASE) or "background-color: #FFFFFF" in body:
        new_body = re.sub(r'background-color:\s*#[a-fA-F0-9]+;?', 'background-color: transparent;', body)
        return f"{header}{new_body}{footer}"
    return match.group(0)

content = re.sub(onboarding_main_pattern, fix_main, content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully updated globals.css")
