type KissCamLoadingOverlayProps = {
  active: boolean;
  /** Larger copy / spinner for the LED wall. */
  size?: "phone" | "stage";
  className?: string;
};

/**
 * Soft loading veil — keeps the love background and couple visible underneath.
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
      className={`kiss-cam-loading pointer-events-none absolute inset-0 z-[28] flex flex-col items-center justify-center ${className}`}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      {/* Soft veil — translucent so background + couple stay visible */}
      <div className="kiss-cam-loading-veil absolute inset-0" aria-hidden />

      <div className="relative z-[1] flex flex-col items-center px-6 text-center">
        <div className="kiss-cam-loading-orbit relative mb-4" aria-hidden>
          <span className="kiss-cam-loading-heart kiss-cam-loading-heart-a">♥</span>
          <span className="kiss-cam-loading-heart kiss-cam-loading-heart-b">♥</span>
          <span className="kiss-cam-loading-dot" />
        </div>

        <p
          className={`kiss-cam-loading-title font-kiss text-[#5a2f38] ${
            stage ? "text-[clamp(2.75rem,8vw,5.5rem)]" : "text-3xl"
          }`}
        >
          Loading
        </p>
        <p
          className={`mt-1 font-semibold uppercase tracking-[0.35em] text-[#8b3a55]/75 ${
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
