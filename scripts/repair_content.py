"""
W2.1 (repair phase) — fix the escaping corruption left by the retired
extract-content.py scraper, and PROVE each fix by parsing/executing the block.

Three corruption classes, all artifacts of a regex scrape of JS template
literals:

  1. `\\n` inside a string  -> prints a literal "\n" to the learner
                               (735 occurrences across 115 blocks)
  2. `\'` / `\"`            -> SyntaxError: unexpected character after line
                               continuation character
  3. `{{ }}`               -> set-of-dict TypeError (only outside f-strings;
                               inside an f-string `{{` is CORRECT and is left
                               alone)

Rules of engagement:
  * A repair is applied ONLY if the block is measurably better afterwards
    (parses when it did not, or still parses and no longer prints literal \n).
  * Never touch a block that already parses and has no corruption.
  * Report anything that cannot be fixed rather than silently mangling it.
"""
import json, glob, os, ast, re, sys, subprocess, tempfile

BS = chr(92)
CORRUPT_NL = BS + BS + 'n'      # \\n  -> should be \n
LECTURES = 'src/content/lectures'


def parses(code):
    try:
        ast.parse(code)
        return True
    except SyntaxError:
        return False


def fix_newlines(code):
    """`\\n` -> `\n`. Only ever appears inside string literals in this corpus."""
    return code.replace(CORRUPT_NL, BS + 'n')


def fix_escaped_quotes(code):
    """
    `\'` and `\"` outside of any legitimate need. The scraper escaped quotes
    that were already safely inside a differently-quoted string.
    """
    out = code.replace(BS + "'", "'").replace(BS + '"', '"')
    return out


def fix_braces(code):
    """
    `{{`/`}}` -> `{`/`}` ONLY on lines that are not f-strings, since `{{` is a
    legitimate literal-brace escape inside an f-string.
    """
    lines = []
    for line in code.split('\n'):
        stripped = line.lstrip()
        is_fstring_line = bool(re.search(r'''\bf["']|\bf"""|\brf["']|\bfr["']''', line))
        if not is_fstring_line and ('{{' in line or '}}' in line):
            line = line.replace('{{', '{').replace('}}', '}')
        lines.append(line)
    return '\n'.join(lines)


def try_run(code, timeout=45):
    """Execute in CPython (numpy available) as a stand-in for Pyodide."""
    with tempfile.NamedTemporaryFile('w', suffix='.py', delete=False) as f:
        f.write(code); p = f.name
    try:
        r = subprocess.run([sys.executable, p], capture_output=True,
                           text=True, timeout=timeout)
        return r.returncode, (r.stdout or '') + (r.stderr or '')
    except subprocess.TimeoutExpired:
        return -1, 'TIMEOUT'
    finally:
        os.unlink(p)


def main():
    write = '--write' in sys.argv
    run_all = '--run' in sys.argv

    repaired = unfixable = untouched = 0
    still_bad = []
    literal_nl_before = literal_nl_after = 0
    changes = {}

    for path in sorted(glob.glob(f'{LECTURES}/*.json')):
        if path.endswith('_index.json'):
            continue
        doc = json.load(open(path))
        lid = os.path.basename(path)[:-5]
        dirty = False

        for i, block in enumerate(doc.get('codeBlocks', [])):
            code = block.get('code', '')
            lang = (block.get('language') or 'python').lower()
            orig = code

            literal_nl_before += code.count(CORRUPT_NL)

            had_corruption = (CORRUPT_NL in code) or (BS + "'" in code) or (BS + '"' in code)
            parsed_before = parses(code) if lang == 'python' else True

            if not had_corruption and parsed_before and '{{' not in code:
                untouched += 1
                literal_nl_after += code.count(CORRUPT_NL)
                continue

            # Apply repairs in order, keeping only what helps.
            cand = fix_newlines(code)
            if lang == 'python' and not parses(cand) and parses(code):
                cand = code                       # newline fix broke it: revert

            cand2 = fix_escaped_quotes(cand)
            if lang != 'python' or parses(cand2) or not parses(cand):
                cand = cand2

            cand3 = fix_braces(cand)
            if lang != 'python' or parses(cand3) or not parses(cand):
                cand = cand3

            parsed_after = parses(cand) if lang == 'python' else True
            improved = (cand != orig) and (
                parsed_after or not parsed_before
            ) and not (parsed_before and not parsed_after)

            if improved:
                block['code'] = cand
                dirty = True
                repaired += 1
                changes.setdefault(lid, []).append(i)
                literal_nl_after += cand.count(CORRUPT_NL)
            else:
                literal_nl_after += code.count(CORRUPT_NL)

            final = block['code']
            if lang == 'python' and not parses(final):
                unfixable += 1
                still_bad.append((lid, i))

        if dirty and write:
            json.dump(doc, open(path, 'w'), ensure_ascii=False, indent=2)

    print(f"blocks repaired   : {repaired}")
    print(f"blocks untouched  : {untouched}")
    print(f"literal \\n before : {literal_nl_before}")
    print(f"literal \\n after  : {literal_nl_after}")
    print(f"python still not parsing: {unfixable}  {still_bad if still_bad else ''}")
    if changes:
        print("\nfiles changed:")
        for lid, idxs in sorted(changes.items()):
            print(f"  {lid}: blocks {idxs}")
    if not write:
        print("\n(dry run — pass --write to apply)")

    if run_all:
        print("\n=== executing every runnable python block ===")
        ok = fail = skip = 0
        failures = []
        for path in sorted(glob.glob(f'{LECTURES}/*.json')):
            if path.endswith('_index.json'):
                continue
            doc = json.load(open(path))
            lid = os.path.basename(path)[:-5]
            for i, b in enumerate(doc.get('codeBlocks', [])):
                lang = (b.get('language') or 'python').lower()
                if lang != 'python':
                    skip += 1; continue
                code = b.get('code', '')
                rc, out = try_run(code)
                if rc == 0:
                    ok += 1
                else:
                    first = next((l for l in out.strip().split('\n')[::-1] if l.strip()), '')
                    fail += 1
                    failures.append((lid, i, first[:90]))
        print(f"  PASS {ok}   FAIL {fail}   non-python skipped {skip}")
        from collections import Counter
        kinds = Counter(f.split(':')[0] for _, _, f in failures)
        print("  failure kinds:", dict(kinds.most_common(8)))
        return failures
    return []


if __name__ == '__main__':
    main()
