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
      const items = content
        .split('\n')
        .map((line) => {
          const [term, ...definition] = line.split('|');
          return { term: term.trim(), definition: definition.join('|').trim() };
        })
        .filter((item) => item.term && item.definition);
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
  return Children.toArray(children)
    .map((child) => (typeof child === 'string' ? child : ''))
    .join('');
}

function MarkdownBlock({ content }: { content: string }) {
  return (
    <Markdown
      components={{
        h2: ({ children }) => {
          const text = textFromChildren(children);
          const id = slugifyHeading(text);
          return (
            <h2
              id={id}
              className="group mb-4 mt-12 scroll-mt-24 font-[family-name:var(--font-hanken)] text-2xl font-bold tracking-tight text-white border-b border-[#1e293b] pb-3"
            >
              <a
                href={`#${id}`}
                className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ddb7ff]"
              >
                <span>{children}</span>
                <span className="text-[#ddb7ff]/0 transition-colors group-hover:text-[#ddb7ff] font-[family-name:var(--font-jetbrains-mono)] text-lg" aria-hidden="true">
                  #
                </span>
              </a>
            </h2>
          );
        },
        h3: ({ children }) => {
          const text = textFromChildren(children);
          const id = slugifyHeading(text);
          return (
            <h3
              id={id}
              className="mb-3 mt-8 scroll-mt-24 font-[family-name:var(--font-hanken)] text-lg font-bold text-[#e5e2e1]"
            >
              {children}
            </h3>
          );
        },
        p: ({ children }) => (
          <p className="my-4 text-[15px] sm:text-base leading-relaxed text-[#e5e2e1] font-[family-name:var(--font-inter)] font-normal">
            {children}
          </p>
        ),
        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
        ul: ({ children }) => (
          <ul className="my-4 list-disc space-y-2 pl-6 text-[15px] leading-relaxed text-[#e5e2e1] marker:text-[#ddb7ff] font-[family-name:var(--font-inter)]">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="my-4 list-decimal space-y-2.5 pl-6 text-[15px] leading-relaxed text-[#e5e2e1] marker:font-[family-name:var(--font-jetbrains-mono)] marker:text-[#ddb7ff] font-[family-name:var(--font-inter)]">
            {children}
          </ol>
        ),
        li: ({ children }) => <li className="pl-1">{children}</li>,
        hr: () => <hr className="my-10 border-[#1e293b]" />,
        a: ({ href = '', children }) => {
          const external = href.startsWith('http');
          if (external) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[#ddb7ff] underline decoration-[#ddb7ff]/40 underline-offset-4 hover:decoration-[#ddb7ff] hover:text-[#ead7ff] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ddb7ff]"
              >
                {children}
                <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
              </a>
            );
          }
          return (
            <Link
              href={href}
              className="text-[#ddb7ff] underline decoration-[#ddb7ff]/40 underline-offset-4 hover:decoration-[#ddb7ff] hover:text-[#ead7ff] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ddb7ff]"
            >
              {children}
            </Link>
          );
        },
        code: ({ className, children }) => (
          <code
            className={
              className ??
              'rounded border border-[#1e293b] bg-[#1c1b1b] px-1.5 py-0.5 font-[family-name:var(--font-jetbrains-mono)] text-[0.87em] text-[#ddb7ff]'
            }
          >
            {children}
          </code>
        ),
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
        blockquote: ({ children }) => (
          <blockquote className="my-6 border-l-2 border-[#ddb7ff] bg-[#1c1b1b] py-2 pl-5 pr-4 italic text-[#94a3b8] rounded-r-lg font-[family-name:var(--font-inter)]">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="my-6 overflow-x-auto rounded-xl border border-[#1e293b] bg-[#1c1b1b] custom-scrollbar">
            <table className="w-full text-left text-sm text-[#e5e2e1] font-[family-name:var(--font-inter)]">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="border-b border-[#1e293b] bg-[#131313] text-xs font-[family-name:var(--font-jetbrains-mono)] uppercase tracking-wider text-[#94a3b8]">{children}</thead>,
        th: ({ children }) => <th className="px-4 py-3 font-semibold text-[#e5e2e1]">{children}</th>,
        td: ({ children }) => <td className="border-b border-[#1e293b]/50 px-4 py-3">{children}</td>,
      }}
    >
      {content}
    </Markdown>
  );
}

export default function DocsMarkdown({ source }: { source: string }) {
  return (
    <div className="docs-article space-y-4">
      {parseSegments(source).map((segment, index) => {
        if (segment.type === 'callout') {
          return (
            <DocsCallout key={index} variant={segment.variant} title={segment.title}>
              <MarkdownBlock content={segment.content} />
            </DocsCallout>
          );
        }
        if (segment.type === 'definitions') return <DefinitionTable key={index} items={segment.items} />;
        if (segment.type === 'address') return <ContractAddress key={index} label={segment.label} address={segment.address} />;
        return <MarkdownBlock key={index} content={segment.content} />;
      })}
    </div>
  );
}

