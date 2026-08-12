export default function AppLoading() {
  return (
    <div className="animate-pulse space-y-5 pb-24 md:pb-0" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <div className="h-3 w-24 rounded-full bg-[var(--primary)]/20" />
        <div className="h-10 w-48 rounded-2xl bg-black/10 md:h-12 md:w-64" />
        <div className="h-4 w-full max-w-md rounded-full bg-black/5" />
      </div>
      <div className="grid grid-cols-3 gap-2 sm:max-w-md">
        <div className="h-16 rounded-2xl bg-white/70" />
        <div className="h-16 rounded-2xl bg-white/70" />
        <div className="h-16 rounded-2xl bg-white/70" />
      </div>
      <div className="h-14 rounded-2xl bg-white/80 shadow-sm" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-[4.5rem] rounded-2xl bg-white/75 shadow-sm" />
        ))}
      </div>
    </div>
  );
}
