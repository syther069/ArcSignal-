import Sidebar from '@/components/layout/Sidebar';

export default function AnalyticsLoading() {
  return (
    <div className="flex min-h-screen bg-[#131313]">
      <Sidebar />
      <main className="flex-1 lg:ml-[264px] pt-24 pb-16 overflow-y-auto min-h-screen">
        <div className="max-w-[1440px] mx-auto w-full px-4 lg:px-8">
          
          {/* Section 1: Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 h-[160px]">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-[#1c1b1b] border border-[#2b2a2a] p-6 h-full rounded animate-pulse"></div>
            ))}
          </div>

          {/* Section 2: Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2 bg-[#1c1b1b] border border-[#2b2a2a] p-6 rounded h-[360px] animate-pulse"></div>
            <div className="bg-[#1c1b1b] border border-[#2b2a2a] p-6 rounded h-[360px] animate-pulse"></div>
          </div>

          {/* Section 3: Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-[#1c1b1b] border border-[#2b2a2a] p-6 rounded h-[340px] animate-pulse"></div>
            <div className="bg-[#1c1b1b] border border-[#2b2a2a] p-6 rounded h-[340px] animate-pulse"></div>
          </div>
        </div>
      </main>
    </div>
  );
}
