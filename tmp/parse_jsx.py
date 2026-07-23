import re

with open('src/components/TripFeedback.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Match standard JSX tags (and custom tags like motion.div)
tag_pattern = re.compile(r'<(/?[a-zA-Z0-9:._-]+)(?:\s+[^>]*?)?(/?)>')

# List of self-closing tags to ignore
self_closing_list = [
    'input', 'img', 'br', 'hr', 'link', 'meta', 'Star', 'Megaphone', 
    'TrendingUp', 'Award', 'Volume2', 'VolumeX', 'Mascot3D', 'Sparkles', 
    'Check', 'ArrowLeft', 'ArrowRight', 'Send', 'Heart'
]

stack = []
for idx in range(1343, len(lines)):
    line_num = idx + 1
    line = lines[idx]
    
    # Strip comments to prevent matching false tags
    line = re.sub(r'//.*', '', line)
    
    # Remove text inside quotes so tag-like text inside strings is ignored
    line = re.sub(r'"[^"]*"', '""', line)
    line = re.sub(r"'[^']*'", "''", line)
    line = re.sub(r'`[^`]*`', '``', line)
    
    for match in tag_pattern.finditer(line):
        full_tag = match.group(0)
        tag_name = match.group(1)
        
        # Check if self-closing via slash at end or predefined list
        is_self_closing = match.group(2) == '/' or full_tag.endswith('/>') or tag_name in self_closing_list
        
        if tag_name.startswith('/'):
            name = tag_name[1:]
            if not stack:
                print(f"Line {line_num}: Extra close tag </{name}> with empty stack")
                continue
            top, top_line = stack.pop()
            if top != name:
                print(f"Line {line_num}: Mismatched close tag </{name}> (expected </{top}> from line {top_line})")
                # Put it back to trace further errors
                stack.append((top, top_line))
        else:
            if is_self_closing:
                continue
            stack.append((tag_name, line_num))

if stack:
    print("Unclosed tags remaining in stack at EOF:")
    for tag, line in stack:
        print(f"  <{tag}> opened at line {line}")
else:
    print("All tags are perfectly balanced!")
