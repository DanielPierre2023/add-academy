#!/usr/bin/env python3
"""
Extract lecture content from monolithic index.html into structured JSON files.
Each lecture becomes a JSON file with: title, content (per language), quiz data, code blocks.
"""

import re
import json
import os
import html

SOURCE = '/home/user/llm-course/index.html'
OUTPUT_DIR = '/home/user/add-academy/src/content/lectures'
QUIZ_DIR = '/home/user/add-academy/src/content/quizzes'

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(QUIZ_DIR, exist_ok=True)

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def extract_title(content):
    """Extract first h1 or h2 from HTML content."""
    m = re.search(r'<h[12][^>]*>(.*?)</h[12]>', content, re.DOTALL)
    if m:
        # Strip HTML tags from title
        title = re.sub(r'<[^>]+>', '', m.group(1))
        # Clean up HTML entities
        title = html.unescape(title)
        return title.strip()
    return ''

def extract_code_blocks(content):
    """Extract runnable code blocks from lecture content."""
    blocks = []
    # Pattern 1: code-block-wrapper with code-block-header (newer format)
    pattern1 = r'<div class="code-block-wrapper">\s*<div class="code-block-header">\s*<span[^>]*>(.*?)</span>.*?<pre><code[^>]*>(.*?)</code></pre>'
    # Pattern 2: code-block with code-header (original format)
    pattern2 = r'<div class="code-header">\s*<span[^>]*>(.*?)</span>.*?<div class="code-block"[^>]*>\s*<pre><code[^>]*>(.*?)</code></pre>'

    for i, m in enumerate(re.finditer(pattern1, content, re.DOTALL)):
        title = re.sub(r'<[^>]+>', '', m.group(1)).strip()
        code = html.unescape(m.group(2)).strip()
        runnable = 'runPyodideCode' in content[max(0, m.start()-200):m.end()+200]
        blocks.append({
            'id': f'block-{i}',
            'title': title,
            'code': code,
            'language': 'python',
            'runnable': runnable,
        })

    if not blocks:
        for i, m in enumerate(re.finditer(pattern2, content, re.DOTALL)):
            title = re.sub(r'<[^>]+>', '', m.group(1)).strip()
            code = html.unescape(m.group(2)).strip()
            runnable = 'runPyodideCode' in content[max(0, m.start()-200):m.end()+200]
            blocks.append({
                'id': f'block-{i}',
                'title': title,
                'code': code,
                'language': 'python',
                'runnable': runnable,
            })

    return blocks

def extract_quiz(content, lecture_id):
    """Extract quiz data from lecture content."""
    quiz_match = re.search(
        r'<div class="quiz-section"[^>]*>(.*?)<div class="quiz-results"></div>\s*</div>',
        content, re.DOTALL
    )
    if not quiz_match:
        return None

    quiz_html = quiz_match.group(1)
    questions = []

    q_pattern = r'<div class="mcq-question" data-correct=\'(\[[\d,\s]+\])\' data-qidx="(\d+)">(.*?)</div>\s*</div>'
    for m in re.finditer(q_pattern, quiz_html, re.DOTALL):
        correct = json.loads(m.group(1))
        qidx = int(m.group(2))
        q_body = m.group(3)

        # Question text
        q_text_match = re.search(r'<div class="q-text">(.*?)</div>', q_body, re.DOTALL)
        q_text = q_text_match.group(1) if q_text_match else ''
        # Strip multi-hint span from text
        q_text = re.sub(r'<span class="q-multi-hint">.*?</span>', '', q_text).strip()
        q_text = re.sub(r'<[^>]+>', '', q_text).strip()

        has_multi = 'q-multi-hint' in q_body

        # Options
        options = []
        for opt_match in re.finditer(r'<div class="option-text">(.*?)</div>', q_body, re.DOTALL):
            opt_text = re.sub(r'<[^>]+>', '', opt_match.group(1)).strip()
            options.append(html.unescape(opt_text))

        # Explanation
        expl_match = re.search(r'<div class="mcq-explanation">(.*?)</div>', q_body, re.DOTALL)
        explanation = ''
        if expl_match:
            explanation = re.sub(r'<strong>.*?</strong>\s*', '', expl_match.group(1), count=1)
            explanation = re.sub(r'<[^>]+>', '', explanation).strip()
            explanation = html.unescape(explanation)

        questions.append({
            'index': qidx,
            'text': html.unescape(q_text),
            'options': options,
            'correct': correct,
            'explanation': explanation,
            'isMulti': has_multi,
        })

    if not questions:
        return None

    return {
        'id': f'quiz-{lecture_id}',
        'questions': questions,
    }


def extract_nav_buttons(content):
    """Extract prev/next from navButtons call."""
    m = re.search(r'\$\{navButtons\(([^)]+)\)\}', content)
    if not m:
        return None, None
    args = m.group(1)
    parts = [p.strip().strip("'\"") for p in args.split(',')]
    prev_id = parts[0] if parts[0] and parts[0] != 'null' else None
    next_id = parts[1] if len(parts) > 1 and parts[1] and parts[1] != 'null' else None
    return prev_id, next_id


# ═══════════════════════════════════════════
# Main extraction
# ═══════════════════════════════════════════

print("Reading source file...")
source = read_file(SOURCE)
print(f"Source size: {len(source):,} chars")

# Extract LECTURES entries
pattern = r"LECTURES\['(\w[\w-]*)'\]\s*=\s*\{\s*en:\s*\(\)\s*=>\s*`(.*?)`,\s*ro:\s*\(\)\s*=>\s*`(.*?)`,\s*el:\s*\(\)\s*=>\s*`(.*?)`\s*\};"

lectures_data = []
lecture_index = {}

for m in re.finditer(pattern, source, re.DOTALL):
    key = m.group(1)
    en_content = m.group(2)
    ro_content = m.group(3)
    el_content = m.group(4)

    if key in ('home', 'toc'):
        # Still extract but mark as special
        pass

    en_title = extract_title(en_content)
    ro_title = extract_title(ro_content)
    el_title = extract_title(el_content)

    # Determine stage
    is_genai = key.startswith('genai')
    if key == 'home':
        stage = -1
        stage_name = 'Home'
    elif is_genai:
        stage = 6
        stage_name = 'GenAI SaaS'
    else:
        num = int(key)
        if num <= 6:
            stage = 0
        elif num <= 12:
            stage = 1
        elif num <= 18:
            stage = 2
        elif num <= 24:
            stage = 3
        elif num <= 30:
            stage = 4
        else:
            stage = 5
        stage_names = ['Foundations', 'Tokenization', 'Attention', 'Architecture', 'Pretraining', 'Fine-tuning']
        stage_name = stage_names[stage] if stage < len(stage_names) else 'Unknown'

    # Extract code blocks (from EN — same in all languages)
    code_blocks = extract_code_blocks(en_content)

    # Extract quiz for each language
    en_quiz = extract_quiz(en_content, f'{key}-en')
    ro_quiz = extract_quiz(ro_content, f'{key}-ro')
    el_quiz = extract_quiz(el_content, f'{key}-el')

    # Extract navigation
    prev_id, next_id = extract_nav_buttons(en_content)

    lecture_data = {
        'id': key,
        'number': int(key) if key.isdigit() else (-1 if key == 'home' else int(key.replace('genai-', '')) + 100),
        'stage': stage,
        'stageName': stage_name,
        'isGenAI': is_genai,
        'title': {
            'en': en_title,
            'ro': ro_title,
            'el': el_title,
        },
        'prev': prev_id,
        'next': next_id,
        'codeBlockCount': len(code_blocks),
        'hasQuiz': en_quiz is not None,
    }

    lectures_data.append(lecture_data)
    lecture_index[key] = lecture_data

    # Write individual lecture content files
    lecture_content = {
        'id': key,
        'title': lecture_data['title'],
        'content': {
            'en': en_content,
            'ro': ro_content,
            'el': el_content,
        },
        'codeBlocks': code_blocks,
    }
    write_json(os.path.join(OUTPUT_DIR, f'{key}.json'), lecture_content)

    # Write quiz files
    if en_quiz:
        quiz_data = {
            'lectureId': key,
            'en': en_quiz,
            'ro': ro_quiz,
            'el': el_quiz,
        }
        write_json(os.path.join(QUIZ_DIR, f'{key}.json'), quiz_data)

    print(f"  {key}: {en_title[:60]}... ({len(code_blocks)} code blocks, quiz: {en_quiz is not None})")

# Write lecture index
write_json(os.path.join(OUTPUT_DIR, '_index.json'), {
    'lectures': lectures_data,
    'totalLectures': len(lectures_data),
    'totalCodeBlocks': sum(l['codeBlockCount'] for l in lectures_data),
    'totalQuizzes': sum(1 for l in lectures_data if l['hasQuiz']),
})

print(f"\nExtracted {len(lectures_data)} lectures")
print(f"Total code blocks: {sum(l['codeBlockCount'] for l in lectures_data)}")
print(f"Lectures with quizzes: {sum(1 for l in lectures_data if l['hasQuiz'])}")
print(f"Output: {OUTPUT_DIR}")
