import Sidebar from '@/components/layout/Sidebar';

export default function ProfileLoading() {
  return (
    <div className="flex min-h-screen bg-[#080A0C]">
      <Sidebar />
      <main className="lg:ml-[264px] pt-24 pb-16 flex-1 min-w-0 min-h-screen">
        <div className="max-w-[1200px] mx-auto w-full px-4 md:px-8">
          
          <div className="relative mb-12">
            <div className="h-[200px] w-full bg-[#111416] border border-[rgba(255,255,255,0.08)] rounded-xl animate-pulse"></div>
            
            <div className="absolute -bottom-10 left-8 flex items-end gap-6">
              <div className="w-[120px] h-[120px] rounded-full bg-[#1a1c1e] border-4 border-[#080A0C] animate-pulse"></div>
              <div className="mb-2 space-y-2">
                <div className="h-8 w-48 bg-[#111416] rounded animate-pulse"></div>
                <div className="h-4 w-32 bg-[#111416] rounded animate-pulse"></div>
              </div>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
             {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[120px] bg-[#111416] border border-[rgba(255,255,255,0.08)] rounded-[16px] animate-pulse"></div>
             ))}
          </div>

          <div className="h-10 w-full border-b border-[rgba(255,255,255,0.08)] mb-8 flex gap-8">
            <div className="h-8 w-24 bg-[#111416] rounded animate-pulse"></div>
            <div className="h-8 w-24 bg-[#111416] rounded animate-pulse"></div>
          </div>

          <div className="space-y-4">
             {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 w-full bg-[#111416] border border-[rgba(255,255,255,0.08)] rounded-xl animate-pulse"></div>
             ))}
          </div>
          
        </div>
      </main>
    </div>
  );
}
