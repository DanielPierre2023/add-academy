'use client';

import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Play,
  RotateCcw,
  Copy,
  Check,
  Terminal,
  Loader2,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CodePlaygroundProps {
  /** Initial code to display */
  initialCode: string;
  /** Programming language for syntax highlighting label */
  language?: string;
  /** Title shown above the editor */
  title?: string;
  /** Whether the code is editable */
  editable?: boolean;
  /** Run handler — if not provided, uses Pyodide for Python */
  onRun?: (code: string) => Promise<{ stdout: string; stderr: string }>;
  /** Additional CSS class */
  className?: string;
}

/**
 * Interactive code playground with editable code, run button, and output panel.
 * Supports Python via Pyodide (in-browser) by default.
 */
export function CodePlayground({
  initialCode,
  language = 'python',
  title,
  editable = true,
  onRun,
  className,
}: CodePlaygroundProps) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setOutput('');
    setError('');

    try {
      if (onRun) {
        const result = await onRun(code);
        if (result.stderr) setError(result.stderr);
        else setOutput(result.stdout || '(no output)');
      } else {
        // Default: run Python via Pyodide
        const { runPythonInPlayground } = await import('@/lib/pyodide-runner');
        const result = await runPythonInPlayground(code);
        if (result.stderr) setError(result.stderr);
        else setOutput(result.stdout || '(no output)');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsRunning(false);
    }
  }, [code, onRun]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const handleReset = useCallback(() => {
    setCode(initialCode);
    setOutput('');
    setError('');
  }, [initialCode]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Ctrl/Cmd + Enter to run
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      }
      // Tab for indentation
      if (e.key === 'Tab') {
        e.preventDefault();
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newCode = code.substring(0, start) + '    ' + code.substring(end);
        setCode(newCode);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 4;
        }, 0);
      }
    },
    [code, handleRun]
  );

  return (
    <div
      className={cn(
        'rounded-lg border bg-card overflow-hidden',
        expanded && 'fixed inset-4 z-50 shadow-2xl',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            {title || `${language} playground`}
          </span>
          <span className="text-[10px] text-muted-foreground/60">
            Ctrl+Enter to run
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleCopy}
            title="Copy code"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleReset}
            title="Reset code"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? 'Minimize' : 'Expand'}
          >
            {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
          <Button
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={handleRun}
            disabled={isRunning}
          >
            {isRunning ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                Run
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Code editor */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          readOnly={!editable}
          className={cn(
            'w-full bg-[#1e1e2e] text-[#cdd6f4] font-mono text-sm p-4 resize-none focus:outline-none',
            expanded ? 'min-h-[60vh]' : 'min-h-[200px]'
          )}
          spellCheck={false}
          style={{
            tabSize: 4,
            lineHeight: '1.6',
          }}
        />
      </div>

      {/* Output */}
      {(output || error) && (
        <div className="border-t">
          <div className="px-3 py-1.5 bg-muted/30 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            Output
          </div>
          <pre
            className={cn(
              'px-4 py-3 text-sm font-mono overflow-x-auto max-h-[300px] overflow-y-auto',
              error ? 'text-red-400 bg-red-950/20' : 'text-green-300 bg-[#1e1e2e]'
            )}
          >
            {error || output}
          </pre>
        </div>
      )}
    </div>
  );
}
