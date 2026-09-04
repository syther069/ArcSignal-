import 'server-only';

import fs from 'fs';
import path from 'path';
import { docsArticleMap, docsArticles, type DocsArticle } from '@/lib/docs-config';

export type DocsHeading = {
  depth: 2 | 3;
  id: string;
  text: string;
};

export type DocsSearchRecord = {
  title: string;
  description: string;
  href: string;
  section: string;
  status: DocsArticle['status'];
  searchText: string;
};

const docsDirectory = path.join(process.cwd(), 'content', 'docs');

export function slugifyHeading(value: string) {
  return value
    .toLowerCase()
    .replace(/[`*_~]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function articleFileName(slug: string) {
  return slug ? `${slug}.md` : 'index.md';
}

export function getDocsArticle(slug: string) {
  const article = docsArticleMap.get(slug);
  if (!article) return null;

  const body = fs.readFileSync(path.join(docsDirectory, articleFileName(slug)), 'utf8');
  const headings = extractHeadings(body);
  return { article, body, headings };
}

export function extractHeadings(markdown: string): DocsHeading[] {
  const headings: DocsHeading[] = [];
  const seen = new Map<string, number>();

  for (const match of markdown.matchAll(/^(##|###)\s+(.+)$/gm)) {
    const text = match[2].replace(/\s+#+$/, '').trim();
    const baseId = slugifyHeading(text);
    const count = seen.get(baseId) ?? 0;
    seen.set(baseId, count + 1);
    headings.push({
      depth: match[1].length as 2 | 3,
      id: count === 0 ? baseId : `${baseId}-${count + 1}`,
      text,
    });
  }

  return headings;
}

export function getDocsSearchIndex(): DocsSearchRecord[] {
  return docsArticles.map((article) => {
    const body = fs.readFileSync(path.join(docsDirectory, articleFileName(article.slug)), 'utf8');
    const headingText = extractHeadings(body).map((heading) => heading.text).join(' ');
    return {
      title: article.title,
      description: article.description,
      href: article.slug ? `/docs/${article.slug}` : '/docs',
      section: article.section,
      status: article.status,
      searchText: [article.title, article.description, headingText, ...article.keywords].join(' ').toLowerCase(),
    };
  });
}

