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
  const colors = ["#f4b6c4", "#f7d6de", "#f0c4ce", "#ffe4ea", "#e8a8b6"];
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

/** Soft light-blue pastel wedding atmosphere — invitation illustration feel. */
export function KissCamBackground({ active }: { active: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#e8f2f8]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_15%,rgba(255,255,255,.95),transparent_55%),radial-gradient(ellipse_at_15%_80%,rgba(190,220,235,.45),transparent_42%),radial-gradient(ellipse_at_85%_70%,rgba(244,182,196,.18),transparent_40%)]" />
      <div className="kiss-cam-bokeh absolute -left-10 top-8 h-72 w-72 rounded-full bg-[#c5e0ef]/50 blur-3xl" />
      <div className="kiss-cam-bokeh kiss-cam-bokeh-delay absolute right-0 top-1/3 h-96 w-96 rounded-full bg-[#f4c9d4]/30 blur-3xl" />
      <div className="kiss-cam-bokeh absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-[#d4e8f2]/55 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(90,120,140,.16))]" />
      {active ? <SparkleField /> : null}
    </div>
  );
}

function SparkleField() {
  const sparks = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        id: i,
        left: (i * 13) % 100,
        top: (i * 29) % 100,
        delay: (i % 6) * 0.8,
        size: 2 + (i % 3),
      })),
    [],
  );
  return (
    <>
      {sparks.map((spark) => (
        <span
          key={spark.id}
          className="kiss-cam-sparkle absolute rounded-full bg-white"
          style={{
            left: `${spark.left}%`,
            top: `${spark.top}%`,
            width: spark.size,
            height: spark.size,
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
  const balloons = useMemo(() => makeHeartBalloons(celebrate ? 18 : 8), [celebrate]);
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
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#f4b6c4] opacity-95" aria-hidden>
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
        color: ["#f4b6c4", "#c5e0ef", "#e8c97a", "#fffcf8", "#d4a5b0"][i % 5],
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
