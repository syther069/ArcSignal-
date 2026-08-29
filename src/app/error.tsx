'use client';

import { useEffect } from 'react';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Page data unavailable:', error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-6 py-16">
      <section
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-surface p-8 text-center shadow-2xl"
        role="alert"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
          Unexpected error
        </p>
        <h1 className="mt-3 text-2xl font-bold text-white">
          ArcSignal could not load this page
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Try the request again. If the problem continues, the service may still be recovering.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-black transition hover:brightness-110"
        >
          Try again
        </button>
      </section>
    </main>
  );
}