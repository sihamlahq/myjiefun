type KissCamLoadingOverlayProps = {
  active: boolean;
  /** Larger copy / spinner for the LED wall. */
  size?: "phone" | "stage";
  className?: string;
};

/**
 * Soft loading spark — love frame stays clear underneath (no milky white plate).
 */
export function KissCamLoadingOverlay({
  active,
  size = "stage",
  className = "",
}: KissCamLoadingOverlayProps) {
  if (!active) return null;

  const stage = size === "stage";

  return (
    <div
      className={`kiss-cam-loading pointer-events-none absolute inset-0 z-[28] flex flex-col items-center justify-center overflow-hidden ${className}`}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      {/* Soft radial spark only — intentionally no frosted / milky plate. */}
      <div className="kiss-cam-loading-veil absolute inset-0" aria-hidden />

      {/* Tight w-max box — avoids a huge opacity compositor plate behind Loading. */}
      <div className="relative z-[1] flex w-max max-w-[min(90vw,28rem)] flex-col items-center px-4 text-center">
        <div className="kiss-cam-loading-orbit relative mb-4" aria-hidden>
          <span className="kiss-cam-loading-heart kiss-cam-loading-heart-a">♥</span>
          <span className="kiss-cam-loading-heart kiss-cam-loading-heart-b">♥</span>
          <span className="kiss-cam-loading-dot" />
        </div>

        <p
          className={`kiss-cam-loading-title font-kiss m-0 w-max leading-none ${
            stage ? "text-[clamp(2.75rem,8vw,5.5rem)]" : "text-3xl"
          }`}
        >
          Loading
        </p>
        <p
          className={`mt-2 font-semibold uppercase tracking-[0.35em] text-[#8b3a55]/80 ${
            stage ? "text-[clamp(0.7rem,1.5vw,1rem)]" : "text-[10px]"
          }`}
        >
          Please wait
        </p>

        <div className="kiss-cam-loading-bar mt-5 overflow-hidden rounded-full" aria-hidden>
          <span className="kiss-cam-loading-bar-fill" />
        </div>
      </div>
    </div>
  );
}
