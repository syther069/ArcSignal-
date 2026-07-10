import Sidebar from '@/components/layout/Sidebar';

export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen bg-[#101416]">
      <Sidebar />
      <main className="lg:ml-[264px] xl:mr-[320px] pt-24 flex-1 min-w-0 min-h-screen">
        <div className="p-8 max-w-[1600px] mx-auto w-full">
          {/* Header Skeleton */}
          <header className="mb-10 flex items-end justify-between">
            <div>
              <div className="h-9 w-48 bg-[#1c1b1b] border border-[#2b2a2a] rounded-lg animate-pulse mb-2"></div>
              <div className="h-5 w-64 bg-[#1c1b1b] border border-[#2b2a2a] rounded animate-pulse"></div>
            </div>
          </header>

          {/* Metrics Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[120px] bg-[#1c1b1b] border border-[#2b2a2a] rounded animate-pulse"></div>
            ))}
          </div>

          {/* Main Layout Grid Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
            <div className="space-y-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-64 bg-[#1c1b1b] border border-[#2b2a2a] rounded-[20px] animate-pulse"></div>
              ))}
            </div>
            <div className="space-y-6">
              <div className="h-96 bg-[#1c1b1b] border border-[#2b2a2a] rounded animate-pulse"></div>
              <div className="h-96 bg-[#1c1b1b] border border-[#2b2a2a] rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
