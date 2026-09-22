"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { signalingChannelName } from "@/components/kiss-cam/kiss-cam-session";
import type { KissCamControlAction } from "@/components/kiss-cam/kiss-cam-connection";

type Props = {
  sessionId: string | null;
};

const actions: Array<{ label: string; action: KissCamControlAction; className?: string }> = [
  { label: "Start Kiss Cam", action: "start", className: "bg-[#c45a78] hover:bg-[#a84864]" },
  { label: "Preview", action: "preview", className: "bg-[#7a5060] hover:bg-[#654250]" },
  { label: "Reset", action: "reset", className: "bg-[#5a4a42] hover:bg-[#473b35]" },
];

export function KissCamMobileController({ sessionId }: Props) {
  const [connected, setConnected] = useState(false);
  const [sending, setSending] = useState<KissCamControlAction | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loadingScreen, setLoadingScreen] = useState(false);

  const channelName = useMemo(
    () => (sessionId ? signalingChannelName(sessionId) : null),
    [sessionId],
  );

  useEffect(() => {
    if (!channelName) return;

    const supabase = createClient();
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel.subscribe((status) => {
      setConnected(status === "SUBSCRIBED");
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setMessage("Could not connect to the Kiss Cam session.");
      }
    });

    return () => {
      setConnected(false);
      void supabase.removeChannel(channel);
    };
  }, [channelName]);

  const send = useCallback(
    async (action: KissCamControlAction) => {
      if (!channelName) return;
      setSending(action);
      setMessage(null);

      try {
        const supabase = createClient();
        const channel = supabase.channel(channelName, {
          config: { broadcast: { self: false } },
        });

        await new Promise<void>((resolve, reject) => {
          const timeout = window.setTimeout(
            () => reject(new Error("Connection timed out")),
            5000,
          );
          channel.subscribe((status) => {
            if (status === "SUBSCRIBED") {
              window.clearTimeout(timeout);
              resolve();
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              window.clearTimeout(timeout);
              reject(new Error("Connection failed"));
            }
          });
        });

        await channel.send({
          type: "broadcast",
          event: "signal",
          payload: { type: "control", action },
        });

        await supabase.removeChannel(channel);
      } catch {
        setMessage("Command could not be sent. Check the connection.");
      } finally {
        setSending(null);
      }
    },
    [channelName],
  );

  const trigger = (action: KissCamControlAction) => {
    void send(action);
  };

  if (!sessionId) {
    return (
      <main className="kiss-cam-phone-shell flex min-h-[100dvh] items-center justify-center px-5 text-[#fff5f7]">
        <div className="w-full max-w-md rounded-3xl border border-rose-200/20 bg-[#3a2430]/80 p-6 text-center shadow-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#ffc9d4]/80">
            TableWedding
          </p>
          <h1 className="kiss-cam-love-title mt-2 text-5xl">Kiss Cam</h1>
          <p className="mt-4 text-sm text-white/70">
            This controller QR is missing its session. Please scan the Controller QR shown on the Kiss Cam display.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="kiss-cam-phone-shell mx-auto min-h-[100dvh] max-w-md px-4 py-5 text-[#fff5f7]">
      <header className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.38em] text-[#ffc9d4]/80">
          TableWedding
        </p>
        <h1 className="kiss-cam-love-title mt-1 text-[clamp(3.2rem,15vw,4.5rem)]">
          Kiss Cam
        </h1>
        <p className="mt-1 text-sm text-[#ffd6e0]/75">Mobile Controller</p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs">
          <span
            className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-400"}`}
          />
          {connected ? "Controller connected" : "Connecting…"}
        </div>
      </header>

      <section className="mt-6 grid gap-3">
        <Button
          size="xl"
          className="h-16 w-full touch-manipulation bg-[#c45a78] text-lg font-semibold text-white shadow-[0_10px_28px_rgba(196,90,120,0.35)] hover:bg-[#a84864] active:scale-[0.98]"
          disabled={!connected || sending !== null}
          onClick={() => trigger("start")}
        >
          {sending === "start" ? "Starting…" : "▶ Start Kiss Cam"}
        </Button>

        <div className="grid grid-cols-2 gap-3">
          {actions.slice(1).map(({ label, action, className }) => (
            <Button
              key={action}
              size="lg"
              className={`h-14 touch-manipulation text-base text-white active:scale-[0.97] ${className}`}
              disabled={!connected || sending !== null}
              onClick={() => trigger(action)}
            >
              {sending === action ? "Sending…" : label}
            </Button>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-rose-200/15 bg-[#3a2430]/65 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#ffc9d4]/75">
          Screen
        </p>
        <div className="mt-3 grid gap-2">
          <Button
            size="lg"
            className={`h-14 w-full touch-manipulation text-base text-white active:scale-[0.97] ${
              loadingScreen
                ? "bg-[#ff8fab] hover:bg-[#ff7a9a]"
                : "bg-[#5a2f38] hover:bg-[#7a3f4c]"
            }`}
            disabled={!connected || sending !== null}
            onClick={() => {
              const next = !loadingScreen;
              setLoadingScreen(next);
              trigger(next ? "loading-on" : "loading-off");
            }}
          >
            {loadingScreen ? "Clear Loading Screen" : "Loading Screen"}
          </Button>

          <div className="grid grid-cols-3 gap-2">
            {([1, 2, 3] as const).map((value) => {
              const action = `countdown-${value}` as KissCamControlAction;
              return (
                <Button
                  key={value}
                  size="lg"
                  className="h-16 touch-manipulation bg-[#5a2f38] text-2xl font-semibold text-white hover:bg-[#7a3f4c] active:scale-[0.95]"
                  disabled={!connected || sending !== null}
                  onClick={() => trigger(action)}
                >
                  {value}
                </Button>
              );
            })}
          </div>
          <p className="text-center text-[10px] uppercase tracking-[0.2em] text-[#ffc9d4]/55">
            Countdown on LED screen
          </p>
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-rose-200/15 bg-[#3a2430]/65 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#ffc9d4]/75">
          Effects
        </p>
        <Button
          size="lg"
          className="mt-3 h-14 w-full touch-manipulation bg-[#ff8fab] text-base font-semibold text-white hover:bg-[#ff7a9a] active:scale-[0.97]"
          disabled={!connected || sending !== null}
          onClick={() => trigger("love")}
        >
          ♥ Love
        </Button>
      </section>

      {message ? (
        <p className="mt-4 rounded-2xl border border-rose-300/30 bg-rose-950/40 px-3 py-2 text-center text-xs text-rose-50">
          {message}
        </p>
      ) : null}

      <p className="mt-6 text-center text-[10px] leading-relaxed text-white/40">
        Keep this page open during the event. Commands are sent directly to the Kiss Cam display.
      </p>
    </main>
  );
}
