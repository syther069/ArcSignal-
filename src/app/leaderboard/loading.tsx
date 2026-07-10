import Sidebar from '@/components/layout/Sidebar';

export default function LeaderboardLoading() {
  return (
    <div className="flex min-h-screen bg-[#101416]">
      <Sidebar />
      <main className="flex-1 lg:ml-[264px] pt-24 pb-16 overflow-y-auto min-h-screen">
        <div className="max-w-[1440px] mx-auto w-full px-4 lg:px-8">
          <div className="mb-10 text-center">
            <div className="h-10 w-64 bg-[#1c1b1b] border border-[#2b2a2a] rounded-lg animate-pulse mx-auto mb-2"></div>
            <div className="h-5 w-96 bg-[#1c1b1b] border border-[#2b2a2a] rounded animate-pulse mx-auto"></div>
          </div>

          <div className="bg-[#1c1b1b]/50 border border-[#2b2a2a] rounded overflow-hidden">
            <div className="p-4 border-b border-[#2b2a2a]">
               <div className="h-6 w-full bg-[#1c1b1b] rounded animate-pulse"></div>
            </div>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="p-4 border-b border-[#2b2a2a] flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="h-8 w-8 rounded-full bg-[#1c1b1b] animate-pulse"></div>
                   <div className="h-5 w-32 bg-[#1c1b1b] rounded animate-pulse"></div>
                </div>
                <div className="h-5 w-24 bg-[#1c1b1b] rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
