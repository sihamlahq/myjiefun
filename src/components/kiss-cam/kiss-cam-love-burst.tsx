"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";

type KissCamLoveBurstProps = {
  active: boolean;
  /** Bump to restart the animation without waiting for the previous one. */
  burstId?: number;
  /** Larger burst for the LED wall. */
  size?: "phone" | "stage";
  className?: string;
};

type SparkStyle = CSSProperties & { "--sx": string; "--sy": string };
type HeartStyle = CSSProperties & {
  "--hx": string;
  "--hy": string;
  "--hs": number;
  "--hr": string;
};

/**
 * Center-screen love sparkle: hearts + glitter burst outward from the middle.
 * Phone uses fewer particles so taps stay responsive over a live camera feed.
 */
export function KissCamLoveBurst({
  active,
  burstId = 0,
  size = "phone",
  className = "",
}: KissCamLoveBurstProps) {
  const heartCount = size === "stage" ? 18 : 8;
  const sparkCount = size === "stage" ? 28 : 10;

  const hearts = useMemo(
    () =>
      Array.from({ length: heartCount }, (_, i) => {
        const angle = (i / heartCount) * Math.PI * 2 + (i % 3) * 0.18;
        const dist = size === "stage" ? 18 + (i % 5) * 9 : 12 + (i % 4) * 7;
        return {
          id: i,
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist * 0.85,
          delay: (i % 6) * 0.03,
          scale: 0.55 + (i % 4) * 0.16,
          rot: (i * 37) % 360,
        };
      }),
    [heartCount, size],
  );

  const sparks = useMemo(
    () =>
      Array.from({ length: sparkCount }, (_, i) => {
        const angle = (i / sparkCount) * Math.PI * 2;
        const dist = size === "stage" ? 10 + (i % 6) * 8 : 8 + (i % 4) * 6;
        return {
          id: i,
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          delay: (i % 6) * 0.025,
          color: ["#fff8fb", "#ffd0dc", "#f4b6c4", "#ffe8a3", "#ffffff"][i % 5],
        };
      }),
    [size, sparkCount],
  );

  if (!active) return null;

  return (
    <div
      key={burstId}
      className={`pointer-events-none absolute inset-0 z-40 overflow-hidden ${className}`}
      aria-hidden
    >
      <div className="kiss-cam-love-bloom absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />

      {sparks.map((spark) => {
        const style: SparkStyle = {
          width: size === "stage" ? 5 : 3,
          height: size === "stage" ? 5 : 3,
          background: spark.color,
          animationDelay: `${spark.delay}s`,
          "--sx": `${spark.x}vw`,
          "--sy": `${spark.y}vh`,
        };
        return (
          <span
            key={`s-${burstId}-${spark.id}`}
            className="kiss-cam-love-spark absolute left-1/2 top-1/2 rounded-full"
            style={style}
          />
        );
      })}

      {hearts.map((heart) => {
        const style: HeartStyle = {
          animationDelay: `${heart.delay}s`,
          "--hx": `${heart.x}vw`,
          "--hy": `${heart.y}vh`,
          "--hs": heart.scale,
          "--hr": `${heart.rot}deg`,
        };
        return (
          <span
            key={`h-${burstId}-${heart.id}`}
            className="kiss-cam-love-pop absolute left-1/2 top-1/2"
            style={style}
          >
            <svg
              viewBox="0 0 24 24"
              className={size === "stage" ? "h-8 w-8 sm:h-10 sm:w-10" : "h-5 w-5"}
              aria-hidden
            >
              <path
                fill="#f4b6c4"
                d="M12 21s-7.2-4.6-9.6-9.2C.6 8.2 2.4 4.8 6 4.8c2 0 3.3 1.2 4 2.2.7-1 2-2.2 4-2.2 3.6 0 5.4 3.4 3.6 7C19.2 16.4 12 21 12 21z"
              />
            </svg>
          </span>
        );
      })}

      <p
        className={`kiss-cam-love-word font-kiss absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[#fff5f7] ${
          size === "stage" ? "text-[clamp(3rem,8vw,6rem)]" : "text-3xl"
        }`}
      >
        Love
      </p>
    </div>
  );
}
