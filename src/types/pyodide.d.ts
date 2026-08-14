/**
 * Structural types for the Pyodide runtime, which is loaded from the CDN at
 * runtime and ships no bundled type definitions.
 *
 * This declaration previously existed three times over — as `any` in
 * code-block.tsx, lecture-viewer.tsx and pyodide-runner.ts — which accounted
 * for most of the repo's `no-explicit-any` errors. One shared declaration
 * replaces all three.
 *
 * The window properties are declared non-optional to match how the app uses
 * them: every call site already guards on the CDN script having loaded.
 */
interface PyodideInterface {
  runPythonAsync(code: string): Promise<unknown>;
  runPython(code: string): unknown;
  loadPackage(names: string | string[]): Promise<void>;
  globals: { get(name: string): unknown; set(name: string, value: unknown): void };
  setStdout(options: { batched: (msg: string) => void }): void;
  setStderr(options: { batched: (msg: string) => void }): void;
}

interface Window {
  loadPyodide: (options?: { indexURL?: string }) => Promise<PyodideInterface>;
  pyodide: PyodideInterface;
}
