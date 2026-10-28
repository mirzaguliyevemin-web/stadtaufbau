# Epochia: erledigte Bild-Prompts markieren – in prompts.txt durchgestrichen mit ✅, in README.md mit [x] und ~~…~~.
# „Erledigt“ = das Originalbild liegt in bilder/epochia/quelle/ (Name ohne Endung wie im Prompt).
#   python3 neu/tools/prompts-abhaken.py
import os, re

DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'bilder', 'epochia')
done = {os.path.splitext(f)[0] for f in os.listdir(os.path.join(DIR, 'quelle'))}
strike = lambda t: ''.join(c + '̶' for c in t)
unstrike = lambda t: t.replace('̶', '')

# prompts.txt: Titelzeilen „12. Name  →  Datei: x.png“
path = os.path.join(DIR, 'prompts.txt')
out = []
for line in open(path, encoding='utf-8').read().split('\n'):
    plain = unstrike(line).replace('✅ ERLEDIGT – ', '')
    m = re.match(r'^(\d+)\. (.*)  →  Datei: (\S+)$', plain)
    if m:
        number, title, file = m.groups()
        line = f'✅ ERLEDIGT – {strike(f"{number}. {title}")}  →  Datei: {file}' if os.path.splitext(file)[0] in done else plain
    out.append(line)
open(path, 'w', encoding='utf-8').write('\n'.join(out))

# README.md: „- [ ] **Name** → `x.png`“
path = os.path.join(DIR, 'README.md')
out = []
for line in open(path, encoding='utf-8').read().split('\n'):
    m = re.match(r'^- \[[ x]\] (?:~~)?(\*\*.*?\*\*)(?:~~)?(.*?`([^`]+)`.*)$', line)
    if m:
        title, rest, file = m.groups()
        line = f'- [x] ~~{title}~~{rest}' if os.path.splitext(file)[0] in done else f'- [ ] {title}{rest}'
    out.append(line)
open(path, 'w', encoding='utf-8').write('\n'.join(out))
print('erledigt:', ', '.join(sorted(done)))
