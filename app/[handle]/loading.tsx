export default function StorefrontLoading() {
  return (
    <div className="min-h-screen bg-page pb-16">
      <div className="mx-auto w-full max-w-[1120px] px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="animate-pulse rounded-[28px] border border-hairline bg-white p-5 sm:rounded-[32px] sm:p-7">
          <div className="flex items-start gap-3 sm:items-center sm:gap-5">
            <div className="h-14 w-14 shrink-0 rounded-full bg-[#e9e9e6]" />
            <div className="min-w-0 flex-1">
              <div className="h-8 w-2/3 max-w-[320px] rounded bg-[#e9e9e6] sm:h-10" />
              <div className="mt-2 h-4 w-1/2 max-w-[260px] rounded bg-[#efefec]" />
              <div className="mt-2 h-4 w-1/3 max-w-[180px] rounded bg-[#efefec]" />
            </div>
            <div className="hidden h-12 w-40 rounded-pill bg-[#e9e9e6] sm:block" />
          </div>
        </div>

        <div className="mb-4 mt-6 flex gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-11 w-24 animate-pulse rounded-pill bg-[#e9e9e6]" />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4 xl:gap-5">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="animate-pulse rounded-[20px] border border-hairline bg-white p-2 sm:p-2.5"
            >
              <div className="w-full rounded-[14px] bg-[#e9e9e6]" style={{ aspectRatio: '1 / 1' }} />
              <div className="px-1 pb-1 pt-3">
                <div className="h-4 w-3/4 rounded bg-[#e9e9e6]" />
                <div className="mt-2 h-3 w-1/3 rounded bg-[#efefec]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
