import React from 'react';
import fs from 'fs';
import path from 'path';
import Markdown from 'react-markdown';
import Link from 'next/link';

export default function TermsPage() {
  const filePath = path.join(process.cwd(), 'TERMS.md');
  const fileContent = fs.readFileSync(filePath, 'utf8');

  return (
    <main className="min-h-screen bg-background pt-32 pb-16 px-6 lg:px-12 flex flex-col items-center">
      <div className="w-full max-w-4xl mx-auto mb-8">
        <Link href="/" className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2 mb-8">
          <span>&larr;</span> Back to Home
        </Link>
      </div>
      
      <article className="prose prose-invert prose-p:text-on-surface-variant prose-headings:text-on-surface prose-strong:text-primary prose-a:text-tertiary hover:prose-a:text-tertiary-fixed max-w-4xl w-full bg-surface-container border border-white/5 p-8 md:p-12 rounded-xl top-lit-border shadow-2xl mb-16">
        <Markdown>{fileContent}</Markdown>
      </article>

      {/* Footer */}
      <footer className="w-full max-w-[1440px] border-t border-white/10 pt-8 pb-12 flex flex-col md:flex-row justify-between items-center gap-6 mt-16">
        <div className="text-sm text-on-surface-variant max-w-xs">
          <p className="font-bold text-on-surface mb-2">ArcSignal</p>
          <p>The next-generation protocol for high-precision decentralized forecasting and AI analytics.</p>
        </div>
        
        <div className="flex gap-8 text-sm text-on-surface-variant">
          <Link href="/terms" className="hover:text-on-surface transition-colors">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-on-surface transition-colors">Privacy Policy</Link>
          <Link href="/whitepaper" className="hover:text-on-surface transition-colors">Technical Whitepaper</Link>
        </div>

        <div className="text-xs text-on-surface-variant flex flex-col items-end">
          <div className="flex gap-4">
            <svg className="w-4 h-4 hover:text-on-surface cursor-pointer" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 5.523 4.477 10 10 10s10-4.477 10-10c0-5.523-4.477-10-10-10zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"/><path d="M12 4.168A7.834 7.834 0 0 0 4.168 12 7.834 7.834 0 0 0 12 19.832 7.834 7.834 0 0 0 19.832 12 7.834 7.834 0 0 0 12 4.168zm0 14c-3.4 0-6.168-2.768-6.168-6.168S8.6 5.832 12 5.832s6.168 2.768 6.168 6.168S15.4 18.168 12 18.168z"/></svg>
            <svg className="w-4 h-4 hover:text-on-surface cursor-pointer" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4.236l-8 4.882-8-4.882V6l8 4.882L20 6v2.236z"/></svg>
          </div>
        </div>
      </footer>
    </main>
  );
}
