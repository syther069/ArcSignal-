import DraftReview from './DraftReview';

export const metadata = { title: 'Market drafts | ArcSignal ops', robots: { index: false, follow: false } };

export default function DraftsPage() {
  return <main className="mx-auto max-w-4xl space-y-6 px-4 py-10 text-[#f1eef4]">
    <header>
      <p className="text-xs uppercase tracking-wider text-[#ddb7ff]">Operator</p>
      <h1 className="mt-2 text-3xl font-semibold">Markets drafted from X trends</h1>
      <p className="mt-2 max-w-2xl text-sm text-[#b0abb5]">Grok suggests price questions people on X are debating. Nothing goes on chain until you approve it here. Approved drafts are published by the next market job, after a fresh price check.</p>
    </header>
    <DraftReview />
  </main>;
}
