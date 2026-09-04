export type DocsStatus = 'implemented' | 'planned' | 'testnet' | 'risk' | 'reference';

export type DocsArticle = {
  slug: string;
  title: string;
  description: string;
  section: string;
  order: number;
  status: DocsStatus;
  keywords: string[];
};

export type DocsSection = {
  id: string;
  label: string;
};

export const docsSections: DocsSection[] = [
  { id: 'start', label: 'Start here' },
  { id: 'prediction', label: 'Prediction markets' },
  { id: 'intelligence', label: 'AI & resolution' },
  { id: 'developers', label: 'Developers' },
  { id: 'trust', label: 'Trust & reference' },
];

export const docsArticles: DocsArticle[] = [
  {
    slug: '',
    title: 'Documentation',
    description: 'Understand ArcSignal, place a testnet prediction, or inspect the contracts behind the protocol.',
    section: 'start',
    order: 0,
    status: 'testnet',
    keywords: ['overview', 'documentation', 'prediction market', 'Arc testnet'],
  },
  {
    slug: 'how-it-works',
    title: 'How ArcSignal works',
    description: 'A concise map of AI-generated signals, Follow and Fade pools, resolution, and claims.',
    section: 'start',
    order: 1,
    status: 'implemented',
    keywords: ['protocol', 'architecture', 'overview', 'pari-mutuel'],
  },
  {
    slug: 'getting-started',
    title: 'Getting started',
    description: 'Connect an EVM wallet, switch to ARC Testnet, and obtain testnet funds.',
    section: 'start',
    order: 2,
    status: 'testnet',
    keywords: ['wallet', 'ARC Testnet', 'USDC', 'faucet', 'chain 5042002'],
  },
  {
    slug: 'first-prediction',
    title: 'Your first prediction',
    description: 'Read a market, choose Follow or Fade, approve USDC, and submit a stake.',
    section: 'start',
    order: 3,
    status: 'implemented',
    keywords: ['stake', 'approve', 'trade', 'position', 'market'],
  },
  {
    slug: 'follow-vs-fade',
    title: 'Follow vs Fade',
    description: 'What each side means and how the choice relates to the AI thesis.',
    section: 'prediction',
    order: 4,
    status: 'reference',
    keywords: ['follow', 'fade', 'yes', 'no', 'AI thesis'],
  },
  {
    slug: 'odds-and-payouts',
    title: 'Odds and payouts',
    description: 'How pool balances imply returns and how pari-mutuel payouts are calculated.',
    section: 'prediction',
    order: 5,
    status: 'reference',
    keywords: ['odds', 'payout', 'pool', 'return', 'formula', 'pari-mutuel'],
  },
  {
    slug: 'market-lifecycle',
    title: 'Market lifecycle',
    description: 'The states a market moves through from owner creation to resolution or cancellation.',
    section: 'prediction',
    order: 6,
    status: 'implemented',
    keywords: ['open', 'expired', 'resolved', 'cancelled', 'lifecycle'],
  },
  {
    slug: 'resolution-and-claims',
    title: 'Resolution and claims',
    description: 'How the resolver determines outcomes and how winning users claim USDC.',
    section: 'prediction',
    order: 7,
    status: 'risk',
    keywords: ['resolver', 'owner', 'claimWinnings', 'oracle', 'trust'],
  },
  {
    slug: 'ai-signals',
    title: 'AI signals',
    description: 'What the analysis engine produces, which data it reads, and what it does not control.',
    section: 'intelligence',
    order: 8,
    status: 'implemented',
    keywords: ['Gemini', 'Groq', 'CoinGecko', 'API-Football', 'probability', 'confidence'],
  },
  {
    slug: 'contracts',
    title: 'Contracts and addresses',
    description: 'Current ARC Testnet addresses, public methods, events, and authority boundaries.',
    section: 'developers',
    order: 9,
    status: 'testnet',
    keywords: ['contract', 'address', 'ABI', 'USDC', 'ARCSignal', 'Solidity'],
  },
  {
    slug: 'api',
    title: 'Developer API',
    description: 'Current app-facing read endpoints and the status of a supported public API.',
    section: 'developers',
    order: 10,
    status: 'planned',
    keywords: ['API', 'HTTP', 'markets endpoint', 'integration', 'rate limits'],
  },
  {
    slug: 'security-and-risks',
    title: 'Security and risks',
    description: 'The testnet, contract, administrative, data, and market risks you should understand.',
    section: 'trust',
    order: 11,
    status: 'risk',
    keywords: ['security', 'unaudited', 'testnet', 'owner', 'risk', 'admin'],
  },
  {
    slug: 'glossary',
    title: 'Glossary',
    description: 'Canonical definitions for the terms used throughout ArcSignal.',
    section: 'trust',
    order: 12,
    status: 'reference',
    keywords: ['definitions', 'terms', 'follow pool', 'fade pool', 'resolution time'],
  },
];

export const docsArticleMap = new Map(docsArticles.map((article) => [article.slug, article]));

export function getDocsHref(slug: string) {
  return slug ? `/docs/${slug}` : '/docs';
}

export function getAdjacentDocsArticles(slug: string) {
  const index = docsArticles.findIndex((article) => article.slug === slug);
  return {
    previous: index > 0 ? docsArticles[index - 1] : undefined,
    next: index >= 0 && index < docsArticles.length - 1 ? docsArticles[index + 1] : undefined,
  };
}

