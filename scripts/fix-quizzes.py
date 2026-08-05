#!/usr/bin/env python3
"""
Re-extract quiz data from lecture HTML content.
1. Parse quiz questions/options/explanations from the embedded HTML
2. Write proper quiz JSON files
3. Strip quiz HTML from lecture content
4. Fix literal \n in HTML content
"""

import json
import glob
import re
import html
import os


def parse_quiz_html(quiz_html: str) -> list[dict]:
    """Parse quiz questions from the embedded HTML quiz section."""
    questions = []

    # Find all mcq-question blocks
    question_pattern = re.compile(
        r'<div\s+class="mcq-question"[^>]*data-correct=\'(\[[\d,\s]+\])\'[^>]*data-qidx="(\d+)"[^>]*>(.*?)</div>\s*(?=<div\s+class="mcq-question"|$)',
        re.DOTALL
    )

    # Alternative: some might not have data-qidx
    if not question_pattern.search(quiz_html):
        question_pattern = re.compile(
            r'<div\s+class="mcq-question"[^>]*data-correct=\'(\[[\d,\s]+\])\'[^>]*>(.*?)</div>\s*(?=<div\s+class="mcq-question"|$)',
            re.DOTALL
        )

    # Split by mcq-question divs more robustly
    parts = re.split(r'(?=<div\s+class="mcq-question")', quiz_html)

    for idx, part in enumerate(parts):
        if not part.strip() or 'mcq-question' not in part:
            continue

        # Extract correct answers
        correct_match = re.search(r"data-correct='(\[[\d,\s]+\])'", part)
        if not correct_match:
            correct_match = re.search(r'data-correct="(\[[\d,\s]+\])"', part)
        if not correct_match:
            continue
        correct = json.loads(correct_match.group(1))

        # Extract question index
        qidx_match = re.search(r'data-qidx="(\d+)"', part)
        qidx = int(qidx_match.group(1)) if qidx_match else len(questions)

        # Extract question text - try q-text div first, then fall back to q-header content
        qtext_match = re.search(r'<div\s+class="q-text">(.*?)</div>', part, re.DOTALL)
        if qtext_match:
            question_text = clean_html_text(qtext_match.group(1))
        else:
            # GenAI format: text is directly in q-header after q-number span
            qheader_match = re.search(r'<div\s+class="q-header">(.*?)</div>', part, re.DOTALL)
            if qheader_match:
                header_content = qheader_match.group(1)
                # Remove q-number span/div
                header_content = re.sub(r'<(?:span|div)\s+class="q-number">[^<]*</(?:span|div)>', '', header_content)
                question_text = clean_html_text(header_content)
            else:
                question_text = ""

        # Extract options
        options = []
        option_matches = re.finditer(
            r'<div\s+class="option-text">(.*?)</div>', part, re.DOTALL
        )
        for opt_match in option_matches:
            options.append(clean_html_text(opt_match.group(1)))

        # Extract explanation
        expl_match = re.search(r'<div\s+class="mcq-explanation">(.*?)</div>', part, re.DOTALL)
        explanation = ""
        if expl_match:
            explanation = clean_html_text(expl_match.group(1))
            # Remove the "Explanation:" prefix
            explanation = re.sub(r'^[✅\s]*Explanation:\s*', '', explanation)

        is_multi = len(correct) > 1

        questions.append({
            "index": qidx,
            "text": question_text,
            "options": options,
            "correct": correct,
            "explanation": explanation,
            "isMulti": is_multi
        })

    return questions


def clean_html_text(text: str) -> str:
    """Clean HTML text: decode entities, strip tags, normalize whitespace."""
    # Replace literal \n with nothing
    text = text.replace('\\n', ' ')
    # Decode HTML entities
    text = html.unescape(text)
    # Remove HTML tags (but keep content)
    text = re.sub(r'<strong>(.*?)</strong>', r'\1', text)
    text = re.sub(r'<em>(.*?)</em>', r'\1', text)
    text = re.sub(r'<code>(.*?)</code>', r'`\1`', text)
    text = re.sub(r'<[^>]+>', '', text)
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def strip_quiz_from_content(content: str) -> str:
    """Remove the quiz section from lecture HTML content."""
    # Match the quiz-section div and everything after it up to closing divs
    # The quiz section is typically at the end of the content
    pattern = re.compile(
        r'<div\s+class="quiz-section"[^>]*>.*$',
        re.DOTALL
    )
    cleaned = pattern.sub('', content)

    # Also clean up any trailing "See you in the next lecture!" that's orphaned
    # and fix any unclosed divs
    cleaned = cleaned.rstrip()

    return cleaned


def fix_literal_newlines(content: str) -> str:
    """Replace literal \\n sequences with actual newlines in HTML content."""
    # Replace literal \n (as stored in JSON) with actual newlines
    content = content.replace('\\n', '\n')
    return content


def main():
    lectures_dir = 'src/content/lectures'
    quizzes_dir = 'src/content/quizzes'

    total_fixed = 0
    total_quizzes_extracted = 0

    for lecture_file in sorted(glob.glob(f'{lectures_dir}/*.json')):
        basename = os.path.basename(lecture_file)
        if basename in ('_index.json', 'home.json'):
            continue

        lecture_id = basename.replace('.json', '')

        with open(lecture_file) as f:
            data = json.load(f)

        modified = False
        quiz_data = {"lectureId": lecture_id}
        has_quiz = False

        for lang in ['en', 'ro', 'el']:
            content = data.get('content', {}).get(lang, '')
            if not content:
                continue

            # Fix literal \n in content
            if '\\n' in content:
                content = fix_literal_newlines(content)
                modified = True

            # Extract quiz if present
            quiz_match = re.search(r'<div\s+class="quiz-section"[^>]*>.*$', content, re.DOTALL)
            if quiz_match:
                quiz_html = quiz_match.group(0)
                questions = parse_quiz_html(quiz_html)

                if questions:
                    quiz_data[lang] = {
                        "id": f"quiz-{lecture_id}-{lang}",
                        "questions": questions
                    }
                    has_quiz = True
                    total_quizzes_extracted += len(questions)

                # Strip quiz from content
                content = strip_quiz_from_content(content)
                modified = True

            if modified:
                data['content'][lang] = content

        # Save modified lecture content
        if modified:
            with open(lecture_file, 'w') as f:
                json.dump(data, f, ensure_ascii=False)
            total_fixed += 1
            print(f"Fixed: {lecture_id}")

        # Save quiz data if extracted
        if has_quiz:
            # Fill missing languages with empty
            for lang in ['en', 'ro', 'el']:
                if lang not in quiz_data:
                    quiz_data[lang] = {"id": f"quiz-{lecture_id}-{lang}", "questions": []}

            quiz_file = f'{quizzes_dir}/{lecture_id}.json'
            with open(quiz_file, 'w') as f:
                json.dump(quiz_data, f, indent=2, ensure_ascii=False)
            print(f"  Quiz extracted: {lecture_id} ({len(quiz_data.get('en', {}).get('questions', []))} questions)")

    print(f"\nDone! Fixed {total_fixed} lectures, extracted {total_quizzes_extracted} quiz questions total.")


if __name__ == '__main__':
    main()
