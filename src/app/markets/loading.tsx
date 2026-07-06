import Sidebar from '@/components/layout/Sidebar';

export default function MarketsLoading() {
  return (
    <div className="flex min-h-screen bg-[#131313]">
      <Sidebar />
      <main className="lg:ml-[264px] pt-24 pb-24 md:pb-8 flex-1 min-w-0 min-h-screen">
        <div className="max-w-[1440px] mx-auto w-full p-6 lg:p-8">
          
          {/* Page header skeleton */}
          <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
             <div>
               <div className="h-10 w-64 bg-[#1c1b1b] border border-[#3a3939] rounded-lg animate-pulse mb-3"></div>
               <div className="h-4 w-72 md:w-96 bg-[#1c1b1b] border border-[#3a3939] rounded animate-pulse"></div>
             </div>
             <div className="h-10 w-36 bg-[#1c1b1b] border border-[#3a3939] rounded-full animate-pulse"></div>
          </header>
          
          {/* Filters skeleton */}
          <div className="flex flex-col mb-8 gap-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div className="h-10 w-64 bg-[#1c1b1b] border border-[#3a3939] rounded-full animate-pulse"></div>
               <div className="h-10 w-full md:w-96 bg-[#1c1b1b] border border-[#3a3939] rounded-full animate-pulse"></div>
            </div>
          </div>
          
          {/* Market grid skeleton */}
          <div className="space-y-12 mb-12">
             <section>
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-8 h-8 rounded-full bg-[#1c1b1b] border border-[#3a3939] animate-pulse"></div>
                   <div>
                     <div className="h-6 w-32 bg-[#1c1b1b] border border-[#3a3939] rounded animate-pulse mb-2"></div>
                     <div className="h-3 w-24 bg-[#1c1b1b] border border-[#3a3939] rounded animate-pulse"></div>
                   </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {Array.from({length: 6}).map((_, i) => (
                      <div key={i} className="h-[340px] bg-[#1c1b1b] border border-[#3a3939] rounded-[20px] animate-pulse"></div>
                   ))}
                </div>
             </section>
          </div>

        </div>
      </main>
    </div>
  );
}
