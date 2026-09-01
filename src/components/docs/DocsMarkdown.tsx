import React, { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import Link from 'next/link';
import Markdown from 'react-markdown';
import { ExternalLink } from 'lucide-react';
import { slugifyHeading } from '@/lib/docs-content';
import CodeBlock from './CodeBlock';
import ContractAddress from './ContractAddress';
import DefinitionTable, { type DefinitionItem } from './DefinitionTable';
import DocsCallout, { type DocsCalloutVariant } from './DocsCallout';

type MarkdownSegment =
  | { type: 'markdown'; content: string }
  | { type: 'callout'; variant: DocsCalloutVariant; title?: string; content: string }
  | { type: 'definitions'; items: DefinitionItem[] }
  | { type: 'address'; label: string; address: string };

const extensionPattern = /^:::(testnet|important|security|implemented|planned|technical|definitions|address)(?:\s+([^\n]+))?\n([\s\S]*?)\n:::\s*$/gm;

function parseSegments(markdown: string): MarkdownSegment[] {
  const segments: MarkdownSegment[] = [];
  let cursor = 0;

  for (const match of markdown.matchAll(extensionPattern)) {
    const index = match.index ?? 0;
    if (index > cursor) segments.push({ type: 'markdown', content: markdown.slice(cursor, index) });
    const kind = match[1];
    const title = match[2]?.trim();
    const content = match[3].trim();

    if (kind === 'definitions') {
      const items = content.split('\n').map((line) => {
        const [term, ...definition] = line.split('|');
        return { term: term.trim(), definition: definition.join('|').trim() };
      }).filter((item) => item.term && item.definition);
      segments.push({ type: 'definitions', items });
    } else if (kind === 'address') {
      segments.push({ type: 'address', label: title ?? 'Contract', address: content });
    } else {
      segments.push({ type: 'callout', variant: kind as DocsCalloutVariant, title, content });
    }
    cursor = index + match[0].length;
  }
  if (cursor < markdown.length) segments.push({ type: 'markdown', content: markdown.slice(cursor) });
  return segments;
}

function textFromChildren(children: ReactNode) {
  return Children.toArray(children).map((child) => typeof child === 'string' ? child : '').join('');
}

function MarkdownBlock({ content }: { content: string }) {
  return (
    <Markdown components={{
      h2: ({ children }) => {
        const text = textFromChildren(children);
        const id = slugifyHeading(text);
        return <h2 id={id} className="group mb-4 mt-14 scroll-mt-24 font-display text-2xl font-semibold tracking-tight text-white"><a href={`#${id}`} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"><span className="mr-2 text-violet-300/0 transition-colors group-hover:text-violet-300/60" aria-hidden="true">#</span>{children}</a></h2>;
      },
      h3: ({ children }) => {
        const text = textFromChildren(children);
        const id = slugifyHeading(text);
        return <h3 id={id} className="mb-3 mt-9 scroll-mt-24 font-display text-lg font-semibold text-slate-100">{children}</h3>;
      },
      p: ({ children }) => <p className="text-[15px] leading-7 text-slate-400">{children}</p>,
      strong: ({ children }) => <strong className="font-semibold text-slate-200">{children}</strong>,
      ul: ({ children }) => <ul className="list-disc space-y-2 pl-6 text-[15px] leading-7 text-slate-400 marker:text-violet-300/70">{children}</ul>,
      ol: ({ children }) => <ol className="list-decimal space-y-3 pl-6 text-[15px] leading-7 text-slate-400 marker:font-mono marker:text-violet-300/70">{children}</ol>,
      li: ({ children }) => <li className="pl-1">{children}</li>,
      hr: () => <hr className="my-10 border-white/10" />,
      a: ({ href = '', children }) => {
        const external = href.startsWith('http');
        if (external) return <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan-300 underline decoration-cyan-300/30 underline-offset-4 hover:decoration-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">{children}<ExternalLink className="h-3 w-3" aria-hidden="true" /></a>;
        return <Link href={href} className="text-cyan-300 underline decoration-cyan-300/30 underline-offset-4 hover:decoration-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">{children}</Link>;
      },
      code: ({ className, children }) => <code className={className ?? 'rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[0.88em] text-violet-200'}>{children}</code>,
      pre: ({ children }) => {
        const child = Children.only(children);
        if (isValidElement(child)) {
          const element = child as ReactElement<{ className?: string; children?: ReactNode }>;
          const code = String(element.props.children ?? '').replace(/\n$/, '');
          const language = element.props.className?.replace('language-', '');
          return <CodeBlock code={code} language={language} />;
        }
        return <pre>{children}</pre>;
      },
      blockquote: ({ children }) => <blockquote className="my-7 border-l-2 border-violet-300/50 pl-5 italic text-slate-400">{children}</blockquote>,
    }}>{content}</Markdown>
  );
}

export default function DocsMarkdown({ source }: { source: string }) {
  return (
    <div className="docs-article space-y-5">
      {parseSegments(source).map((segment, index) => {
        if (segment.type === 'callout') return <DocsCallout key={index} variant={segment.variant} title={segment.title}><MarkdownBlock content={segment.content} /></DocsCallout>;
        if (segment.type === 'definitions') return <DefinitionTable key={index} items={segment.items} />;
        if (segment.type === 'address') return <ContractAddress key={index} label={segment.label} address={segment.address} />;
        return <MarkdownBlock key={index} content={segment.content} />;
      })}
    </div>
  );
}
