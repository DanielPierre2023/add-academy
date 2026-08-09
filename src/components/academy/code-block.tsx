'use client';

import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Play, RotateCcw, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

declare global {
  interface Window {
    loadPyodide: any;
    pyodide: any;
  }
}

interface CodeBlockProps {
  id: string;
  title: string;
  code: string;
  language: string;
  runnable: boolean;
}

export function CodeBlock({ id, title, code, language, runnable }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [output, setOutput] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pyodideLoadedRef = useRef(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code]);

  const loadPyodide = useCallback(async () => {
    if (pyodideLoadedRef.current && window.pyodide) return;

    setIsLoading(true);

    // Load Pyodide script if not already loaded
    if (!window.loadPyodide) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Pyodide'));
        document.head.appendChild(script);
      });
    }

    // Initialize Pyodide
    if (!window.pyodide) {
      window.pyodide = await window.loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
      });
    }

    pyodideLoadedRef.current = true;
    setIsLoading(false);
  }, []);

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setError(null);
    setOutput('');

    try {
      await loadPyodide();

      // Redirect stdout to capture print output
      window.pyodide.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
sys.stderr = StringIO()
`);

      try {
        await window.pyodide.runPythonAsync(code);
      } catch (pyErr: any) {
        setError(pyErr.message || String(pyErr));
      }

      // Capture stdout
      const stdout = window.pyodide.runPython('sys.stdout.getvalue()');
      const stderr = window.pyodide.runPython('sys.stderr.getvalue()');

      // Reset stdout/stderr
      window.pyodide.runPython(`
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__
`);

      if (stdout) setOutput(stdout);
      if (stderr && !error) setError(stderr);
    } catch (err: any) {
      setError(err.message || 'An error occurred while running the code.');
    } finally {
      setIsRunning(false);
    }
  }, [code, loadPyodide, error]);

  const handleReset = useCallback(() => {
    setOutput('');
    setError(null);
  }, []);

  return (
    <Card className="overflow-hidden border-zinc-700">
      {/* Title Bar */}
      <CardHeader className="flex flex-row items-center justify-between bg-zinc-800 px-4 py-2 space-y-0">
        <CardTitle className="text-sm font-medium text-zinc-200">
          {title}
          <span className="ml-2 text-xs text-zinc-400 font-normal">
            {language}
          </span>
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
          {runnable && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700"
                onClick={handleRun}
                disabled={isRunning || isLoading}
              >
                <Play className="h-3.5 w-3.5" />
              </Button>
              {(output || error) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700"
                  onClick={handleReset}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              )}
            </>
          )}
        </div>
      </CardHeader>

      {/* Code Content */}
      <CardContent className="p-0">
        <pre className="bg-zinc-900 p-4 overflow-x-auto">
          <code className={cn('text-sm font-mono text-zinc-100 leading-relaxed')}>
            {code}
          </code>
        </pre>
      </CardContent>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-zinc-800 px-4 py-3 border-t border-zinc-700">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <div className="h-3 w-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
            Loading Python runtime...
          </div>
        </div>
      )}

      {/* Running State */}
      {isRunning && !isLoading && (
        <div className="bg-zinc-800 px-4 py-3 border-t border-zinc-700">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <div className="h-3 w-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            Running...
          </div>
        </div>
      )}

      {/* Output Area */}
      {output && (
        <div className="bg-zinc-950 px-4 py-3 border-t border-zinc-700">
          <div className="text-xs text-zinc-500 mb-1 font-medium uppercase tracking-wider">
            Output
          </div>
          <pre className="text-sm font-mono text-green-400 whitespace-pre-wrap">
            {output}
          </pre>
        </div>
      )}

      {/* Error Area */}
      {error && (
        <div className="bg-zinc-950 px-4 py-3 border-t border-red-900/50">
          <div className="text-xs text-red-500 mb-1 font-medium uppercase tracking-wider">
            Error
          </div>
          <pre className="text-sm font-mono text-red-400 whitespace-pre-wrap">
            {error}
          </pre>
        </div>
      )}
    </Card>
  );
}
