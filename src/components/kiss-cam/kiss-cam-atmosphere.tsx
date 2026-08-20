"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type Balloon = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  heart?: boolean;
  opacity: number;
};

function makeBalloons(count: number): Balloon[] {
  const colors = ["#f3e6d0", "#e8d5b5", "#f7efe4", "#f0d6d0", "#d8c4a4"];
  return Array.from({ length: count }, (_, id) => ({
    id,
    left: 4 + ((id * 17) % 92),
    delay: (id * 0.7) % 8,
    duration: 14 + (id % 7) * 1.4,
    size: 28 + (id % 5) * 8,
    color: colors[id % colors.length]!,
    heart: id % 5 === 0,
    opacity: 0.45 + (id % 4) * 0.1,
  }));
}

export function KissCamBackground({ active }: { active: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#f4ebe0]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(255,248,240,.95),transparent_55%),radial-gradient(ellipse_at_20%_80%,rgba(212,175,55,.12),transparent_40%),radial-gradient(ellipse_at_80%_70%,rgba(180,90,90,.08),transparent_42%)]" />
      <div className="kiss-cam-bokeh absolute -left-10 top-10 h-72 w-72 rounded-full bg-[#f0d9b5]/35 blur-3xl" />
      <div className="kiss-cam-bokeh kiss-cam-bokeh-delay absolute right-0 top-1/3 h-96 w-96 rounded-full bg-[#e8c9c0]/25 blur-3xl" />
      <div className="kiss-cam-bokeh absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-[#d4af37]/12 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(60,40,25,.28))]" />
      {active ? <SparkleField /> : null}
    </div>
  );
}

function SparkleField() {
  const sparks = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
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
          className="kiss-cam-sparkle absolute rounded-full bg-[#fff8e7]"
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

export function KissCamBalloons({
  active,
  celebrate,
}: {
  active: boolean;
  celebrate?: boolean;
}) {
  const balloons = useMemo(() => makeBalloons(celebrate ? 16 : 9), [celebrate]);
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {balloons.map((b) => (
        <span
          key={b.id}
          className={cn("kiss-cam-balloon absolute bottom-[-10%]", b.heart && "kiss-cam-balloon-heart")}
          style={{
            left: `${b.left}%`,
            width: b.size,
            height: b.heart ? b.size * 0.9 : b.size * 1.2,
            background: b.heart ? "transparent" : b.color,
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
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        left: 20 + ((i * 11) % 60),
        delay: (i % 7) * 0.25,
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
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#b85c6a] opacity-90" aria-hidden>
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
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        left: (i * 7) % 100,
        delay: (i % 10) * 0.12,
        color: ["#d4af37", "#e8d5b5", "#c97b84", "#f7f1e8", "#8b7355"][i % 5],
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
