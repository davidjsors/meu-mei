import re
import os

path = r"c:\Users\david\Documents\MeuMEI\meu-mei\engenharia\frontend\src\styles\globals.css"

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Clear backgrounds from onboarding-split-container in mobile media query
# It's at lines 2721+
split_pattern = r'(\.onboarding-split-container\s*\{)(.*?)(\})'
def fix_split(match):
    header = match.group(1)
    body = match.group(2)
    footer = match.group(3)
    if "background-image:" in body and "radial-gradient" in body:
        # Revert to standard mobile split container (dark presentation, white main)
        # But wait, presentation already has its background. 
        # Let's just remove the additions.
        new_body = re.sub(r'background-color:\s*var\(--bg-app\);', '', body)
        new_body = re.sub(r'background-image:\s*radial-gradient\(.*?\);', '', new_body, flags=re.DOTALL)
        return f"{header}{new_body}{footer}"
    return match.group(0)

content = re.sub(split_pattern, fix_split, content, flags=re.DOTALL)

# 2. Set onboarding-main background to #FFFFFF
main_pattern = r'(\.onboarding-main\s*\{)(.*?)(\})'
def fix_main(match):
    header = match.group(1)
    body = match.group(2)
    footer = match.group(3)
    if "background-color: transparent;" in body:
        new_body = body.replace("background-color: transparent;", "background-color: #FFFFFF;")
        return f"{header}{new_body}{footer}"
    return match.group(0)

content = re.sub(main_pattern, fix_main, content, flags=re.DOTALL)

# 3. Apply the immersive background to onboarding-card
card_pattern = r'(\.onboarding-card\s*\{)(.*?)(\})'
def fix_card(match):
    header = match.group(1)
    body = match.group(2)
    footer = match.group(3)
    if "rgba(17, 27, 33, 0.95)" in body:
        # Replace simple bg with app gradient
        new_body = body.replace("background: rgba(17, 27, 33, 0.95) !important;", 
                                "background-color: var(--bg-app) !important; background-image: radial-gradient(at 10% 10%, rgba(227, 38, 54, 0.15) 0px, transparent 80%), radial-gradient(at 90% 90%, rgba(0, 210, 106, 0.12) 0px, transparent 80%) !important;")
        return f"{header}{new_body}{footer}"
    return match.group(0)

content = re.sub(card_pattern, fix_card, content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully applied white background to main and immersive gradient to card.")
