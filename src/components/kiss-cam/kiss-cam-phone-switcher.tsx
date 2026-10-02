"use client";

import { Button } from "@/components/ui/button";
import type { KissCamCameraPeer } from "@/components/kiss-cam/kiss-cam-connection";

type KissCamPhoneSwitcherProps = {
  cameras: KissCamCameraPeer[];
  publisherId: string | null;
  switching?: boolean;
  onSelect: (clientId: string) => void;
};

/**
 * LED control: pick which connected phone is the live heart camera.
 * Standby phones stay on signaling (and keep their local preview) for instant switch.
 */
export function KissCamPhoneSwitcher({
  cameras,
  publisherId,
  switching = false,
  onSelect,
}: KissCamPhoneSwitcherProps) {
  if (cameras.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#3a2f28]/92 p-4 text-[#f7f1e8] shadow-[0_16px_40px_rgba(0,0,0,.35)] backdrop-blur-md">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ffc9d4]/90">
          Camera phones
        </p>
        <p className="mt-2 text-xs leading-snug text-[#f7f1e8]/65">
          Scan the QR on more phones. First free phone goes live; others stay connected in standby.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#3a2f28]/92 p-4 text-[#f7f1e8] shadow-[0_16px_40px_rgba(0,0,0,.35)] backdrop-blur-md">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ffc9d4]/90">
        Camera phones
      </p>
      <p className="mt-1.5 text-[11px] leading-snug text-[#f7f1e8]/55">
        One live view at a time. Standby phones stay connected — tap to switch instantly.
      </p>
      <ul className="mt-3 space-y-2">
        {cameras.map((cam, index) => {
          const live = cam.publishing || cam.clientId === publisherId;
          return (
            <li
              key={cam.clientId}
              className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {cam.label || `Phone ${index + 1}`}
                </p>
                <p className="text-[11px] text-[#f7f1e8]/60">
                  {live ? "Live in heart" : "Standby · connected"}
                </p>
              </div>
              {live ? (
                <span className="shrink-0 rounded-full bg-[#c45a78]/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Live
                </span>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  className="h-8 shrink-0 bg-[#c45a78] px-3 text-xs text-white hover:bg-[#a84864]"
                  disabled={switching}
                  onClick={() => onSelect(cam.clientId)}
                >
                  {switching ? "…" : "Make live"}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
