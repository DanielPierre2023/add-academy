#!/usr/bin/env python3
"""
Executes every lecture code block and asserts the `runnable` flag is honest.

Replaces the heuristic in the retired extract-content.py, which derived
`runnable` from a +/-200-character proximity guess -- leaving 78 working blocks
marked not-runnable and 40 crashing blocks marked runnable.

Also asserts the Stage 5 capstone still LEARNS: its loss must fall well below
ln(vocab) = 3.2958, the score a model gets for guessing. Before the W2.2 fix it
ended at 3.2369 -- indistinguishable from random -- because no transformer block
received a gradient.
"""
import json, glob, os, subprocess, sys, tempfile, re
from concurrent.futures import ThreadPoolExecutor

CAPSTONE_MAX_LOSS = 2.0
PYODIDE_OK = {'numpy','scipy','matplotlib','pandas','sklearn','sympy','networkx','PIL','regex'}
problems, ran, skipped = [], 0, 0

def run(code, timeout=180):
    """
    Execute a block in a THROWAWAY working directory.

    Several lecture blocks legitimately scaffold project files
    (requirements.txt, .env.example, vercel.json) or download a corpus.
    Running them in the repo root overwrites real files -- that silently
    clobbered requirements.txt the first time this script ran. Each block now
    gets its own temp cwd so the repository is never touched.
    """
    with tempfile.TemporaryDirectory() as workdir:
        script = os.path.join(workdir, 'block.py')
        with open(script, 'w') as f:
            f.write(code)
        try:
            r = subprocess.run([sys.executable, script], capture_output=True,
                               text=True, timeout=timeout, cwd=workdir)
            return r.returncode, (r.stdout or '') + (r.stderr or '')
        except subprocess.TimeoutExpired:
            return -1, 'TIMEOUT'

jobs = []
for path in sorted(glob.glob('src/content/lectures/*.json')):
    if path.endswith('_index.json'):
        continue
    doc = json.load(open(path)); lid = os.path.basename(path)[:-5]
    for i, b in enumerate(doc.get('codeBlocks', [])):
        lang = (b.get('language') or 'python').lower()
        if lang != 'python':
            if b.get('runnable'):
                problems.append(f'{lid}[{i}] runnable=true but language={lang}')
            skipped += 1
            continue
        jobs.append((lid, i, b.get('code', ''), bool(b.get('runnable'))))

def check(job):
    lid, i, code, flagged = job
    rc, out = run(code, timeout=90)
    works = rc == 0 or 'NameError' in out   # NameError = needs an earlier block; fine in order
    msgs = []
    if flagged and not works:
        last = next((l for l in out.strip().split('\n')[::-1] if l.strip()), '')
        msgs.append(f'{lid}[{i}] runnable=true but fails: {last[:90]}')
    if (not flagged) and rc == 0:
        msgs.append(f'{lid}[{i}] runnable=false but runs clean')
    return msgs

with ThreadPoolExecutor(max_workers=8) as ex:
    for msgs in ex.map(check, jobs):
        problems.extend(msgs)
ran = len(jobs)

# The capstone must actually train.
cap = json.load(open('src/content/lectures/32.json'))['codeBlocks'][0]['code']
rc, out = run(cap, timeout=600)
if rc != 0:
    problems.append('capstone (32[0]) failed to run')
else:
    m = re.findall(r'loss\s+([0-9.]+)', out)
    if not m:
        problems.append('capstone produced no loss output')
    elif float(m[-1]) > CAPSTONE_MAX_LOSS:
        problems.append(f'capstone final loss {m[-1]} > {CAPSTONE_MAX_LOSS} (model is not learning)')
    else:
        print(f'  capstone final loss {m[-1]} (must stay under {CAPSTONE_MAX_LOSS})')
    if 'rel. error' in out:
        e = re.search(r'rel\. error ([0-9.e+-]+)', out)
        if e and float(e.group(1)) > 1e-4:
            problems.append(f'capstone gradient check {e.group(1)} > 1e-4')
        elif e:
            print(f'  capstone gradient check {e.group(1)}')

print(f'  executed {ran} python blocks, skipped {skipped} non-python')
if problems:
    print(f'\npython verification FAILED ({len(problems)}):')
    for p in problems: print(f'  - {p}')
    sys.exit(1)
print('python verification OK')
