/**
 * Male + female lip-kiss emoji beat for the LED stage.
 * Uses the kissing-couple ZWJ sequence, with a soft heart bloom behind it.
 */
export function KissCamKissEmoji({ className = "" }: { className?: string }) {
  return (
    <div
      className={`kiss-cam-kiss-emoji pointer-events-none absolute inset-0 z-[25] flex items-center justify-center ${className}`}
      aria-hidden
    >
      <div className="kiss-cam-kiss-emoji-inner relative flex items-center justify-center">
        <span className="kiss-cam-kiss-emoji-bloom absolute" aria-hidden />
        <span
          className="kiss-cam-kiss-emoji-glyph relative select-none text-[clamp(5.5rem,18vw,12rem)] leading-none"
          role="img"
          aria-label="Man and woman kissing"
        >
          {/* man + woman kissing (lips) */}
          {"\u{1F469}\u{200D}\u{2764}\u{FE0F}\u{200D}\u{1F48B}\u{200D}\u{1F468}"}
        </span>
      </div>
    </div>
  );
}
