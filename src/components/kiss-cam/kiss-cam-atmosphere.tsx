"use client";

import { useEffect, useMemo, useState } from "react";

type Balloon = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  opacity: number;
};

function makeHeartBalloons(count: number): Balloon[] {
  const colors = ["#f4b6c4", "#f7d6de", "#ffc9d4", "#ffe4ea", "#e8799a", "#ff8fab"];
  return Array.from({ length: count }, (_, id) => ({
    id,
    left: 4 + ((id * 17) % 92),
    delay: (id * 0.65) % 7,
    duration: 12 + (id % 6) * 1.5,
    size: 30 + (id % 5) * 8,
    color: colors[id % colors.length]!,
    opacity: 0.55 + (id % 4) * 0.1,
  }));
}

/**
 * Love-themed stage atmosphere — matches the mobile Kiss Cam rose palette
 * with soft double-heart silhouettes behind the couple / camera frame.
 */
export function KissCamBackground({ active }: { active: boolean }) {
  return (
    <div className="kiss-cam-love-stage absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_8%,rgba(255,245,248,.95),transparent_52%),radial-gradient(ellipse_at_12%_78%,rgba(255,182,193,.42),transparent_44%),radial-gradient(ellipse_at_88%_68%,rgba(232,121,154,.28),transparent_42%),radial-gradient(ellipse_at_50%_100%,rgba(90,40,55,.18),transparent_45%)]" />

      <div className="kiss-cam-bokeh absolute -left-16 top-6 h-80 w-80 rounded-full bg-[#ffc9d4]/45 blur-3xl" />
      <div className="kiss-cam-bokeh kiss-cam-bokeh-delay absolute -right-10 top-1/4 h-[28rem] w-[28rem] rounded-full bg-[#e8799a]/28 blur-3xl" />
      <div className="kiss-cam-bokeh absolute bottom-[-8%] left-[28%] h-96 w-96 rounded-full bg-[#fff5f7]/55 blur-3xl" />
      <div className="kiss-cam-bokeh absolute right-[18%] bottom-[12%] h-64 w-64 rounded-full bg-[#ff8fab]/22 blur-3xl" />

      <LoveHeartMotifs />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_42%,rgba(58,36,48,.22))]" />
      {active ? <SparkleField /> : null}
    </div>
  );
}

/** Soft double-heart / twin-love shapes filling the stage (like the mobile preview). */
function LoveHeartMotifs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Wide twin hearts — center watermark */}
      <svg
        className="kiss-cam-stage-hearts absolute left-1/2 top-[42%] w-[min(92vw,1100px)] -translate-x-1/2 -translate-y-1/2 opacity-[0.22]"
        viewBox="0 0 200 120"
        fill="none"
      >
        <path
          d="M62 108 C62 108 -8 72 -8 38 C-8 16 16 2 42 8 C54 11 62 24 66 38 C70 24 82 8 102 8 C122 2 140 16 136 38 C132 68 90 98 62 108 Z"
          fill="url(#kissLoveFill)"
        />
        <path
          d="M138 108 C138 108 68 72 68 38 C64 16 88 2 114 8 C126 11 134 24 138 38 C142 24 154 8 174 8 C194 2 212 16 208 38 C204 68 166 98 138 108 Z"
          fill="url(#kissLoveFill)"
        />
        <path
          d="M62 108 C62 108 -8 72 -8 38 C-8 16 16 2 42 8 C54 11 62 24 66 38 C70 24 82 8 102 8 C122 2 140 16 136 38 C132 68 90 98 62 108 Z"
          stroke="rgba(255,201,212,.55)"
          strokeWidth="1.2"
        />
        <path
          d="M138 108 C138 108 68 72 68 38 C64 16 88 2 114 8 C126 11 134 24 138 38 C142 24 154 8 174 8 C194 2 212 16 208 38 C204 68 166 98 138 108 Z"
          stroke="rgba(255,201,212,.55)"
          strokeWidth="1.2"
        />
        <defs>
          <linearGradient id="kissLoveFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff5f7" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#ffc9d4" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#c45a78" stopOpacity="0.55" />
          </linearGradient>
        </defs>
      </svg>

      {/* Corner accent hearts */}
      <svg
        className="absolute -left-[4%] top-[8%] h-[22vmin] w-[22vmin] opacity-[0.16]"
        viewBox="0 0 24 24"
      >
        <path
          fill="#ff8fab"
          d="M12 21s-7.2-4.6-9.6-9.2C.6 8.2 2.4 4.8 6 4.8c2 0 3.3 1.2 4 2.2.7-1 2-2.2 4-2.2 3.6 0 5.4 3.4 3.6 7C19.2 16.4 12 21 12 21z"
        />
      </svg>
      <svg
        className="absolute -right-[3%] top-[14%] h-[18vmin] w-[18vmin] opacity-[0.14]"
        viewBox="0 0 24 24"
      >
        <path
          fill="#e8799a"
          d="M12 21s-7.2-4.6-9.6-9.2C.6 8.2 2.4 4.8 6 4.8c2 0 3.3 1.2 4 2.2.7-1 2-2.2 4-2.2 3.6 0 5.4 3.4 3.6 7C19.2 16.4 12 21 12 21z"
        />
      </svg>
      <svg
        className="absolute bottom-[6%] left-[8%] h-[14vmin] w-[14vmin] opacity-[0.12]"
        viewBox="0 0 24 24"
      >
        <path
          fill="#ffc9d4"
          d="M12 21s-7.2-4.6-9.6-9.2C.6 8.2 2.4 4.8 6 4.8c2 0 3.3 1.2 4 2.2.7-1 2-2.2 4-2.2 3.6 0 5.4 3.4 3.6 7C19.2 16.4 12 21 12 21z"
        />
      </svg>
    </div>
  );
}

function SparkleField() {
  const sparks = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        id: i,
        left: (i * 13) % 100,
        top: (i * 29) % 100,
        delay: (i % 6) * 0.8,
        size: 2 + (i % 3),
        color: i % 3 === 0 ? "#fff5f7" : i % 3 === 1 ? "#ffc9d4" : "#ffffff",
      })),
    [],
  );
  return (
    <>
      {sparks.map((spark) => (
        <span
          key={spark.id}
          className="kiss-cam-sparkle absolute rounded-full"
          style={{
            left: `${spark.left}%`,
            top: `${spark.top}%`,
            width: spark.size,
            height: spark.size,
            background: spark.color,
            animationDelay: `${spark.delay}s`,
          }}
        />
      ))}
    </>
  );
}

/** Floating pink / pearl heart balloons (celebration + ambient). */
export function KissCamBalloons({
  active,
  celebrate,
}: {
  active: boolean;
  celebrate?: boolean;
}) {
  const balloons = useMemo(() => makeHeartBalloons(celebrate ? 18 : 10), [celebrate]);
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {balloons.map((b) => (
        <span
          key={b.id}
          className="kiss-cam-balloon kiss-cam-balloon-heart absolute bottom-[-10%]"
          style={{
            left: `${b.left}%`,
            width: b.size,
            height: b.size * 0.9,
            opacity: b.opacity,
            animationDuration: `${b.duration}s`,
            animationDelay: `${b.delay}s`,
            color: b.color,
          }}
        />
      ))}
    </div>
  );
}

export function KissCamHearts({ active }: { active: boolean }) {
  const [items, setItems] = useState<{ id: number; left: number; delay: number }[]>([]);
  useEffect(() => {
    if (!active) {
      setItems([]);
      return;
    }
    setItems(
      Array.from({ length: 16 }, (_, i) => ({
        id: i,
        left: 18 + ((i * 11) % 64),
        delay: (i % 7) * 0.22,
      })),
    );
  }, [active]);

  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((item) => (
        <span
          key={item.id}
          className="kiss-cam-heart absolute bottom-[28%]"
          style={{ left: `${item.left}%`, animationDelay: `${item.delay}s` }}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#ff8fab] opacity-95" aria-hidden>
            <path d="M12 21s-7.2-4.6-9.6-9.2C.6 8.2 2.4 4.8 6 4.8c2 0 3.3 1.2 4 2.2.7-1 2-2.2 4-2.2 3.6 0 5.4 3.4 3.6 7C19.2 16.4 12 21 12 21z" />
          </svg>
        </span>
      ))}
    </div>
  );
}

export function KissCamConfetti({ active }: { active: boolean }) {
  const bits = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        left: (i * 7) % 100,
        delay: (i % 10) * 0.12,
        color: ["#f4b6c4", "#ffc9d4", "#e8799a", "#fff5f7", "#ff8fab", "#e8c97a"][i % 6],
        rot: (i * 40) % 360,
      })),
    [],
  );
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {bits.map((bit) => (
        <span
          key={bit.id}
          className="kiss-cam-confetti absolute top-[-5%] h-2 w-1.5 rounded-sm"
          style={{
            left: `${bit.left}%`,
            background: bit.color,
            animationDelay: `${bit.delay}s`,
            transform: `rotate(${bit.rot}deg)`,
          }}
        />
      ))}
    </div>
  );
}
