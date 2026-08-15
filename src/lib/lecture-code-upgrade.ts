/**
 * W2.6 — turn the read-only code embedded in lecture HTML into editable,
 * runnable playgrounds IN PLACE (next to the prose that explains it), and let
 * the caller drop the decoupled duplicate list at the bottom of the lecture.
 *
 * Lecture HTML is authored/generated with a wide variety of code "chrome":
 * bare <pre>, `.code-block` wrappers, `.code-header`/`.code-actions` bars with
 * dead `onclick="runPyodideCode(this)"` buttons, `.output` panels, etc. Rather
 * than regex-splitting that (nested divs make it unsafe), we operate on the
 * live DOM after render: find each <pre>, strip its surrounding chrome, and
 * replace the whole thing with an empty host <div> the component mounts a React
 * playground into.
 *
 * This module is intentionally free of React/Next imports so it can be unit
 * tested headlessly with jsdom (see scripts/test-code-upgrade.mjs).
 */

export interface CodeBlockSite {
  code: string;
  language: string;
  runnable: boolean;
  /** Descriptive title lifted from the original code header, if any. */
  title: string;
  /** Empty <div> inserted where the code block was; mount your editor here. */
  host: HTMLElement;
}

// Class fragments that identify code "chrome" in any of the authored variants
// (.code-block / .code-block-wrapper, .code-header / .code-block-header, …).
const WRAPPER_SEL = '.code-block, .code-block-wrapper';
const HEADER_SEL = '.code-header, .code-block-header, .code-actions, .code-lang';
const AFTER_RE = /(^|\s)(output|code-output)(\s|$)/;
const HEADER_RE = /(^|\s)(code-header|code-block-header|code-actions|code-lang)(\s|$)/;

function headerTitle(el: Element | null): string {
  if (!el) return '';
  const span = el.querySelector('span');
  const raw = (span?.textContent ?? el.textContent ?? '').trim();
  // strip the run-button glyph/label that shares the header
  return raw.replace(/[▶▶]?\s*Run\s*$/i, '').replace(/\s+/g, ' ').trim();
}

/** Decode the HTML entities that matter for comparing rendered code to source. */
export function decodeEntities(html: string): string {
  return html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => safeCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => safeCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&'); // must be last
}

function safeCodePoint(n: number): string {
  try {
    return String.fromCodePoint(n);
  } catch {
    return '';
  }
}

/** Collapse whitespace for order-independent code matching. */
export function normalizeCode(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Find every <pre> code block under `root`, strip its chrome, and replace it
 * with an empty host div. Returns one entry per block (in document order).
 *
 * @param root       the prose container (NOT the whole page — keep the bottom
 *                   fallback list out of scope so it isn't double-processed).
 * @param isRunnable decides whether a block should become an editable/runnable
 *                   playground (true) or a read-only reference (false).
 */
export interface PlaceholderCode {
  code: string;
  language?: string;
  runnable?: boolean;
  title?: string;
}

export function collectAndReplaceCodeBlocks(
  root: HTMLElement,
  isRunnable: (code: string, language: string) => boolean,
  /** Fill empty `<pre data-block-id>` placeholders from the codeBlocks JSON. */
  resolvePlaceholder?: (blockId: string) => PlaceholderCode | undefined
): CodeBlockSite[] {
  const doc = root.ownerDocument;
  if (!doc) return [];
  const sites: CodeBlockSite[] = [];

  for (const pre of Array.from(root.querySelectorAll('pre'))) {
    // A shared wrapper may have been removed already by a sibling.
    if (!pre.isConnected || !root.contains(pre)) continue;

    const codeEl = pre.querySelector('code');
    let code = (codeEl?.textContent ?? pre.textContent ?? '').replace(/\n$/, '');
    const cls = codeEl?.className || '';
    const langMatch = cls.match(/language-([A-Za-z0-9+#-]+)/);
    let language = (langMatch ? langMatch[1] : 'python').toLowerCase();
    let placeholderTitle = '';
    let forcedRunnable: boolean | null = null;

    // Empty placeholder (`<pre><code data-block-id="block-N">`) — pull the real
    // code from the JSON codeBlocks.
    if (code.trim().length === 0) {
      const blockId =
        codeEl?.getAttribute('data-block-id') || pre.getAttribute('data-block-id') || '';
      const resolved = blockId && resolvePlaceholder ? resolvePlaceholder(blockId) : undefined;
      if (resolved) {
        code = resolved.code;
        if (resolved.language) language = resolved.language.toLowerCase();
        if (typeof resolved.runnable === 'boolean') forcedRunnable = resolved.runnable;
        placeholderTitle = resolved.title || '';
      } else {
        // Unresolvable empty block — drop it rather than render an empty box.
        (pre.closest(WRAPPER_SEL) ?? pre).remove();
        continue;
      }
    }

    // Pick the outermost node to replace: a code-block wrapper if the <pre>
    // lives in one (removes ALL its chrome at once), otherwise the <pre> plus
    // any adjacent header/output chrome siblings.
    const wrapper = pre.closest(WRAPPER_SEL);
    let target: Element = pre;
    let title = '';
    if (wrapper && wrapper !== root && root.contains(wrapper)) {
      title = headerTitle(wrapper.querySelector(HEADER_SEL));
      target = wrapper;
    } else {
      const prev = pre.previousElementSibling;
      if (prev && HEADER_RE.test(prev.className || '')) {
        title = headerTitle(prev);
        prev.remove();
      }
      const next = pre.nextElementSibling;
      if (next && AFTER_RE.test(next.className || '')) next.remove();
      target = pre;
    }

    const host = doc.createElement('div');
    host.className = 'lecture-code-host';
    target.replaceWith(host);

    sites.push({
      code,
      language,
      runnable: forcedRunnable !== null ? forcedRunnable : isRunnable(code, language),
      title: placeholderTitle || title,
      host,
    });
  }

  // Final safety sweep: strip any dead run-buttons / handlers and now-empty
  // chrome that a non-standard structure left behind, so no broken "Run"
  // control ever survives.
  root
    .querySelectorAll('.run-btn, [onclick*="runPyodideCode"], [onclick*="runCode"]')
    .forEach((el) => el.remove());
  root.querySelectorAll(HEADER_SEL).forEach((el) => {
    if (!el.querySelector('pre, .lecture-code-host')) el.remove();
  });
  root.querySelectorAll(WRAPPER_SEL).forEach((el) => {
    if (!el.querySelector('pre, .lecture-code-host')) el.remove();
  });

  return sites;
}
