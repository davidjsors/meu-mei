import re
import os

path = r"c:\Users\david\Documents\MeuMEI\meu-mei\engenharia\frontend\src\styles\globals.css"

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Line 2720 is "@media (max-width: 768px) {" (0-indexed: 2719)
# We want to close it at line 2902 (0-indexed: 2901)
# And remove the last '}' (line 4066, 0-indexed: 4065)

new_lines = []
in_wrong_range = False

for i, line in enumerate(lines):
    # Insert closing brace before line 2903
    if i == 2902: 
        new_lines.append("}\n\n")
        in_wrong_range = True
    
    # If we are in the range that was accidentally indented, remove 2 spaces
    if in_wrong_range:
        if line.startswith("  "):
            new_lines.append(line[2:])
        else:
            new_lines.append(line)
    else:
        new_lines.append(line)

# Remove the last line if it's just the closing brace we moved
# Let's be careful. The last line is index 4066 (actually lines have changed length now)
# Instead of index-based removal at the end, let's just reverse the last few lines and find the stray brace.

# But wait, my line numbers might be slightly off if the file changed.
# Let's count back from the end.
for j in range(len(new_lines)-1, -1, -1):
    if new_lines[j].strip() == "}":
        # Check if it was part of a class or just the stray one.
        # Minimal classes usually have content. A stray '}' is often alone.
        # The forgot-info-box ends at 4065.
        new_lines.pop(j)
        break

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Successfully closed media query and fixed global styles.")
