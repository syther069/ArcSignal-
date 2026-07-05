const fs = require('fs');

// MarketsClient.tsx
let m = fs.readFileSync('src/app/markets/MarketsClient.tsx', 'utf8');
m = m.replace(
  /<main className=\"lg:ml-\[264px\] pt-24 p-6 lg:p-8 flex-1 min-w-0 min-h-screen max-w-\[1440px\] mx-auto w-full pb-24 md:pb-8\">/,
  '<main className=\"lg:ml-[264px] pt-24 pb-24 md:pb-8 flex-1 min-w-0 min-h-screen\">\\n        <div className=\"max-w-[1440px] mx-auto w-full p-6 lg:p-8\">'
);
if (m !== fs.readFileSync('src/app/markets/MarketsClient.tsx', 'utf8')) {
  m = m.replace(/<\/main>/, '  </div>\n      </main>');
  fs.writeFileSync('src/app/markets/MarketsClient.tsx', m);
}

// DashboardClient.tsx
let d = fs.readFileSync('src/app/dashboard/DashboardClient.tsx', 'utf8');
d = d.replace(
  /<main className=\"lg:ml-\[264px\] xl:mr-\[320px\] pt-24 p-8 flex-1 min-w-0 min-h-screen\">/,
  '<main className=\"lg:ml-[264px] xl:mr-[320px] pt-24 flex-1 min-w-0 min-h-screen\">\\n        <div className=\"p-8 max-w-[1600px] mx-auto w-full\">'
);
if (d !== fs.readFileSync('src/app/dashboard/DashboardClient.tsx', 'utf8')) {
  d = d.replace(/<\/main>/, '  </div>\n      </main>');
  fs.writeFileSync('src/app/dashboard/DashboardClient.tsx', d);
}

// PortfolioClient.tsx
let p = fs.readFileSync('src/app/portfolio/PortfolioClient.tsx', 'utf8');
p = p.replace(
  /<main className=\"lg:ml-\[264px\] pt-24 px-4 md:px-8 pb-20 flex-1 min-w-0\">/,
  '<main className=\"lg:ml-[264px] pt-24 pb-20 flex-1 min-w-0\">\\n        <div className=\"max-w-[1440px] mx-auto w-full px-4 md:px-8\">'
);
if (p !== fs.readFileSync('src/app/portfolio/PortfolioClient.tsx', 'utf8')) {
  p = p.replace(/<\/main>/, '  </div>\n      </main>');
  fs.writeFileSync('src/app/portfolio/PortfolioClient.tsx', p);
}

// WorldCupClient.tsx
let w = fs.readFileSync('src/app/world-cup/WorldCupClient.tsx', 'utf8');
w = w.replace(
  /<main className=\"lg:ml-\[264px\] pt-24 px-6 md:px-8 pb-16 flex-1 min-w-0\">/,
  '<main className=\"lg:ml-[264px] pt-24 pb-16 flex-1 min-w-0\">\\n        <div className=\"max-w-[1440px] mx-auto w-full px-6 md:px-8\">'
);
if (w !== fs.readFileSync('src/app/world-cup/WorldCupClient.tsx', 'utf8')) {
  w = w.replace(/<\/main>/, '  </div>\n      </main>');
  fs.writeFileSync('src/app/world-cup/WorldCupClient.tsx', w);
}

// AnalyticsClient.tsx
let a = fs.readFileSync('src/app/analytics/AnalyticsClient.tsx', 'utf8');
a = a.replace(
  /<main className=\"flex-1 lg:ml-\[264px\] pt-24 px-8 pb-16 overflow-y-auto min-h-screen\">/,
  '<main className=\"flex-1 lg:ml-[264px] pt-24 pb-16 overflow-y-auto min-h-screen\">\\n        <div className=\"max-w-[1440px] mx-auto w-full px-4 lg:px-8\">'
);
if (a !== fs.readFileSync('src/app/analytics/AnalyticsClient.tsx', 'utf8')) {
  a = a.replace(/<\/main>/, '  </div>\n      </main>');
  fs.writeFileSync('src/app/analytics/AnalyticsClient.tsx', a);
}

// FeedClient.tsx
let f = fs.readFileSync('src/app/feed/FeedClient.tsx', 'utf8');
f = f.replace(
  /<main className=\"flex-1 lg:ml-\[264px\] pt-24 px-8 pb-16 overflow-y-auto min-h-screen\">/,
  '<main className=\"flex-1 lg:ml-[264px] pt-24 pb-16 overflow-y-auto min-h-screen\">\\n        <div className=\"max-w-[1440px] mx-auto w-full px-4 lg:px-8\">'
);
if (f !== fs.readFileSync('src/app/feed/FeedClient.tsx', 'utf8')) {
  f = f.replace(/<\/main>/, '  </div>\n      </main>');
  fs.writeFileSync('src/app/feed/FeedClient.tsx', f);
}

console.log('Fixed wrapper divs');
