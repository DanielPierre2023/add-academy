/**
 * Shared Pyodide runner for the code playground.
 * Manages the Pyodide singleton and package loading.
 */

declare global {
  interface Window {
    loadPyodide: any;
    pyodide: any;
  }
}

const PYODIDE_PACKAGES = new Set([
  'numpy', 'scipy', 'matplotlib', 'pandas', 'scikit-learn',
  'sympy', 'networkx', 'pillow', 'regex',
]);

const loadedPackages = new Set<string>();

async function ensurePyodide(): Promise<any> {
  if (typeof window === 'undefined') throw new Error('Pyodide requires a browser environment');

  if (window.pyodide) return window.pyodide;

  if (!window.loadPyodide) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Pyodide'));
      document.head.appendChild(script);
    });
  }

  window.pyodide = await window.loadPyodide({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
  });

  try {
    await window.pyodide.loadPackage('numpy');
    loadedPackages.add('numpy');
  } catch (e) {
    console.warn('Failed to pre-load numpy:', e);
  }

  return window.pyodide;
}

async function ensurePackages(pyodide: any, code: string): Promise<void> {
  const importRegex = /(?:^|\n)\s*(?:import|from)\s+(\w+)/g;
  let match;
  const needed: string[] = [];

  while ((match = importRegex.exec(code)) !== null) {
    const pkg = match[1];
    if (PYODIDE_PACKAGES.has(pkg) && !loadedPackages.has(pkg)) {
      needed.push(pkg);
    }
  }

  if (needed.length > 0) {
    await pyodide.loadPackage(needed);
    needed.forEach((p) => loadedPackages.add(p));
  }
}

export async function runPythonInPlayground(
  code: string
): Promise<{ stdout: string; stderr: string }> {
  const pyodide = await ensurePyodide();
  await ensurePackages(pyodide, code);

  pyodide.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
sys.stderr = StringIO()
`);

  let caughtError = '';
  try {
    await pyodide.runPythonAsync(code);
  } catch (err: any) {
    caughtError = err.message || String(err);
  }

  const stdout = pyodide.runPython('sys.stdout.getvalue()');
  const stderr = pyodide.runPython('sys.stderr.getvalue()');

  pyodide.runPython(`
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__
`);

  return { stdout, stderr: stderr || caughtError };
}
