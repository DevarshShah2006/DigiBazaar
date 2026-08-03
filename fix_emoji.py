"""
fix_emoji.py - Strip emoji & non-ASCII from stdout.write calls in seed_master_data.py
The FILE stays UTF-8 (Python reads it fine). We only strip chars that break
Windows cp1252 stdout printing.
"""
import re

path = 'backend/core/management/commands/seed_master_data.py'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

print(f"Original size: {len(content)} chars")

# Map every problematic character to an ASCII equivalent
REPLACEMENTS = [
    # Emojis
    ('\U0001f680', '[>]'),   # rocket -> [>]
    ('\U0001f6f5', '[~]'),   # motor scooter
    ('\U0001f4e6', '[PKG]'), # package
    ('\U0001f4ca', '[BAR]'), # bar chart
    ('\U0001f4c8', '[UP]'),  # chart up
    ('\U0001f464', '[USR]'), # person
    ('\U0001f465', '[GRP]'), # people
    ('\U0001f3f7', '[TAG]'), # label
    ('\U0001f50d', '[?]'),   # magnifier
    ('\U0001f514', '[!]'),   # bell
    ('\U0001f525', '[HOT]'), # fire
    ('\U0001f381', '[GFT]'), # gift
    ('\U0001f4b0', '[MNY]'), # money bag
    ('\U0001f4a1', '[i]'),   # bulb
    ('\U0001f916', '[ML]'),  # robot
    ('\U0001f4c5', '[CAL]'), # calendar
    ('\U0001f4b9', '[CHR]'), # chart with money
    ('\U0001f4b3', '[CRD]'), # credit card
    ('\U0001f4b8', '[PAY]'), # flying money
    ('\U0001f4aa', '[STR]'), # muscle
    ('\U0001f44d', '[+1]'),  # thumbs up
    ('\U0001f4e5', '[IN]'),  # inbox
    ('\U0001f6d2', '[BUY]'), # shopping cart
    ('\u2705', '[OK]'),      # check box
    ('\u274c', '[ERR]'),     # cross mark
    ('\u2714', '[OK]'),      # heavy check mark
    ('\u2b50', '[*]'),       # star
    ('\u26a1', '[!]'),       # lightning
    ('\u2728', '[*]'),       # sparkles
    # Box-drawing / special punctuation
    ('\u2500', '-'),         # light horizontal
    ('\u2501', '='),         # heavy horizontal
    ('\u2502', '|'),
    ('\u2503', '|'),
    ('\u250c', '+'),
    ('\u2510', '+'),
    ('\u2514', '+'),
    ('\u2518', '+'),
    ('\u251c', '+'),
    ('\u2524', '+'),
    ('\u252c', '+'),
    ('\u2534', '+'),
    ('\u253c', '+'),
    ('\u2550', '='),
    ('\u2551', '|'),
    ('\u2554', '+'),
    ('\u2557', '+'),
    ('\u255a', '+'),
    ('\u255d', '+'),
    ('\u2560', '+'),
    ('\u2563', '+'),
    ('\u2566', '+'),
    ('\u2569', '+'),
    ('\u256c', '+'),
    ('\u2022', '-'),         # bullet point
    ('\u2023', '-'),         # triangle bullet
    ('\u2013', '-'),         # en dash
    ('\u2014', '--'),        # em dash
    ('\u2019', "'"),         # right single quote
    ('\u2018', "'"),         # left single quote
    ('\u201c', '"'),         # left double quote
    ('\u201d', '"'),         # right double quote
    ('\u20b9', 'Rs.'),       # Indian Rupee sign - keep readable
    ('\u00a0', ' '),         # non-breaking space
    ('\u00d7', 'x'),         # multiplication sign
    ('\u2248', '~='),        # approximately equal
    ('\u221e', 'inf'),       # infinity
    ('\u03c3', 'sigma'),     # sigma
    ('\u03bc', 'mu'),        # mu
    ('\u03b8', 'theta'),     # theta
    ('\u2264', '<='),        # less than or equal
    ('\u2265', '>='),        # greater than or equal
    ('\u00b1', '+/-'),       # plus-minus
    ('\u25b6', '>'),         # play button
    ('\u25cf', '*'),         # black circle
]

for old, new in REPLACEMENTS:
    content = content.replace(old, new)

# Safety net: replace any remaining non-ASCII chars (outside 0x20-0x7E range, except newline/tab)
# by encoding to ascii with replace
lines = content.split('\n')
clean_lines = []
for line in lines:
    try:
        line.encode('cp1252')
        clean_lines.append(line)
    except (UnicodeEncodeError, UnicodeDecodeError):
        # Replace chars that fail cp1252 in this line
        cleaned = line.encode('ascii', errors='replace').decode('ascii')
        clean_lines.append(cleaned)

content = '\n'.join(clean_lines)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

# Verify
remaining = [(i, c, hex(ord(c))) for i, c in enumerate(content) if ord(c) > 127]
print(f"Remaining non-ASCII chars: {len(remaining)}")
if remaining:
    for i, c, h in remaining[:20]:
        print(f"  pos={i} char=? cp={h}")
else:
    print("All clear! File is now cp1252-safe for stdout.")

print(f"Final size: {len(content)} chars")
print("Done.")
