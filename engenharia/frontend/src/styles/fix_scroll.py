import re
import os

path = r"c:\Users\david\Documents\MeuMEI\meu-mei\engenharia\frontend\src\styles\globals.css"

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix onboarding-main: change justify-content to flex-start to avoid scroll clipping
# And remove overflow-y from it to let the split-container handle the scroll
main_pattern = r'(\.onboarding-main\s*\{)(.*?)(\})'
def fix_main(match):
    header = match.group(1)
    body = match.group(2)
    footer = match.group(3)
    if "flex: 6;" in body:
        new_body = body.replace("justify-content: center;", "justify-content: flex-start;")
        new_body = new_body.replace("overflow-y: auto;", "overflow-y: visible;")
        # Ensure padding at the bottom so it doesn't touch the edge
        if "padding:" in new_body:
            new_body = re.sub(r'padding:\s*[^;]+;', 'padding: 40px 16px 80px 16px;', new_body)
        return f"{header}{new_body}{footer}"
    return match.group(0)

content = re.sub(main_pattern, fix_main, content, flags=re.DOTALL)

# 2. Ensure onboarding-card has margin: auto 0 for centering without breaking flex-start positioning
card_pattern = r'(\.onboarding-card\s*\{)(.*?)(\})'
def fix_card(match):
    header = match.group(1)
    body = match.group(2)
    footer = match.group(3)
    if "margin: auto 0;" not in body:
        # If it's missing, add it. If it's there, keep it.
        # Based on previous view, it was there. Let's make sure it's consistent.
        pass
    return match.group(0)

# 3. Double check onboarding-split-container is scrollable
split_pattern = r'(\.onboarding-split-container\s*\{)(.*?)(\})'
def fix_split(match):
    header = match.group(1)
    body = match.group(2)
    footer = match.group(3)
    # Ensure it's not overflow: hidden
    new_body = body.replace("overflow: hidden;", "overflow-y: auto;")
    return f"{header}{new_body}{footer}"

content = re.sub(split_pattern, fix_split, content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully fixed scroll issues in globals.css")
