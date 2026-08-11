import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-4">
        <span className="text-4xl font-bold text-[#ddb7ff]">404</span>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-hanken)]">
          Market Not Found
        </h1>
        <p className="text-xs text-[#94a3b8]">
          The prediction market or page you are looking for does not exist or has been removed.
        </p>
        <div className="pt-2">
          <Link
            href="/markets"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#ddb7ff] text-[#121212] text-xs font-bold hover:bg-[#ead7ff] transition-colors"
          >
            Back to Markets
          </Link>
        </div>
      </div>
    </div>
  );
}
