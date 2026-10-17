import { useMemo, useState } from 'react';
import hljs from 'highlight.js/lib/common';
import { Check, Copy } from 'lucide-react';
import 'highlight.js/styles/github-dark.css';

type Part =
  | { type: 'text'; content: string }
  | { type: 'code'; content: string; lang: string };

const FENCE = /```([\w+-]*)[ \t]*\r?\n?([\s\S]*?)```/g;

function parse(input: string): Part[] {
  const parts: Part[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(FENCE);
  while ((m = re.exec(input)) !== null) {
    if (m.index > last) parts.push({ type: 'text', content: input.slice(last, m.index) });
    parts.push({ type: 'code', lang: (m[1] || '').toLowerCase(), content: m[2].replace(/\r?\n$/, '') });
    last = re.lastIndex;
  }
  if (last < input.length) parts.push({ type: 'text', content: input.slice(last) });
  return parts;
}

function highlight(code: string, lang: string) {
  try {
    if (lang && hljs.getLanguage(lang)) return hljs.highlight(code, { language: lang }).value;
    return hljs.highlightAuto(code).value;
  } catch {
    return code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

function InlineCode({ text }: { text: string }) {
  const chunks = text.split(/(`[^`\n]+`)/g);
  return (
    <>
      {chunks.map((c, i) =>
        c.startsWith('`') && c.endsWith('`') && c.length > 2 ? (
          <code
            key={i}
            className="rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[12.5px] text-slate-800"
          >
            {c.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{c}</span>
        )
      )}
    </>
  );
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  const html = useMemo(() => highlight(code, lang), [code, lang]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-[#0d1117]">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          {lang || 'code'}
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1 text-[10px] font-medium text-slate-400 transition hover:text-slate-200"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Tersalin' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed">
        <code className="hljs bg-transparent" dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
}

export default function RichText({ text }: { text: string }) {
  const parts = useMemo(() => parse(text || ''), [text]);
  const hasCode = parts.some((p) => p.type === 'code');

  return (
    <div className={hasCode ? 'space-y-3' : ''}>
      {parts.map((p, i) =>
        p.type === 'code' ? (
          <CodeBlock key={i} code={p.content} lang={p.lang} />
        ) : p.content.trim() ? (
          <p key={i} className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            <InlineCode text={p.content} />
          </p>
        ) : null
      )}
    </div>
  );
}
