export default function GuestsLoading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading guests">
      <div className="space-y-2">
        <div className="h-3 w-28 rounded-full bg-[var(--primary)]/20" />
        <div className="h-10 w-36 rounded-2xl bg-black/10" />
      </div>
      <div className="h-28 rounded-2xl bg-white/75" />
      <div className="flex justify-between gap-3">
        <div className="h-4 w-32 rounded-full bg-black/10" />
        <div className="h-10 w-28 rounded-xl bg-black/10" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-[5.25rem] rounded-2xl bg-white/80 shadow-sm" />
        ))}
      </div>
    </div>
  );
}
