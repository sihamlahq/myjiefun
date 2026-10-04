"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  KissCamConnection,
  type KissCamCameraPeer,
  type KissCamControlAction,
} from "@/components/kiss-cam/kiss-cam-connection";
import { KissCamPhoneSwitcher } from "@/components/kiss-cam/kiss-cam-phone-switcher";
import { KissCamQRCode } from "@/components/kiss-cam/kiss-cam-qr";
import { cn } from "@/lib/utils";

/**
 * Mobile remote: the Kiss Cam right-side control panel only.
 * Joins the LED session as a signaling-only "remote" — never steals WebRTC video.
 */
export function KissCamRemote({ coupleNames }: { coupleNames: string }) {
  const search = useSearchParams();
  const sessionFromUrl = (search.get("session") || "").trim();
  const codeFromUrl = (search.get("code") || "").trim().toUpperCase();

  const [sessionId, setSessionId] = useState<string | null>(sessionFromUrl || null);
  const [shortCode, setShortCode] = useState<string | null>(codeFromUrl || null);
  const [codeInput, setCodeInput] = useState(codeFromUrl);
  const [status, setStatus] = useState<"idle" | "connecting" | "ready" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [cameraPeers, setCameraPeers] = useState<KissCamCameraPeer[]>([]);
  const [publisherId, setPublisherId] = useState<string | null>(null);
  const [switchingPhone, setSwitchingPhone] = useState(false);
  const [loadingOn, setLoadingOn] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const connRef = useRef<KissCamConnection | null>(null);

  const resolveSession = useCallback(async (code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setMessage("Enter the Kiss Cam short code from the LED panel.");
      return;
    }
    setStatus("connecting");
    setMessage("Looking up session…");
    try {
      const res = await fetch(
        `/api/kiss-cam/session/lookup?code=${encodeURIComponent(trimmed)}`,
      );
      const json = (await res.json()) as {
        id?: string;
        shortCode?: string;
        error?: string;
      };
      if (!res.ok || !json.id) {
        throw new Error(json.error || "Session not found or expired");
      }
      setSessionId(json.id);
      setShortCode(json.shortCode || trimmed);
      setMessage(null);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Unable to find session");
    }
  }, []);

  useEffect(() => {
    if (sessionFromUrl) {
      setSessionId(sessionFromUrl);
      if (codeFromUrl) setShortCode(codeFromUrl);
      return;
    }
    if (codeFromUrl) {
      void resolveSession(codeFromUrl);
    }
  }, [codeFromUrl, resolveSession, sessionFromUrl]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let supabase: ReturnType<typeof createClient> | null = null;

    const run = async () => {
      setStatus("connecting");
      setMessage("Connecting to LED…");
      try {
        supabase = createClient();
      } catch {
        setStatus("error");
        setMessage("Supabase is not configured.");
        return;
      }

      const conn = new KissCamConnection(supabase, sessionId, "remote", {
        onPeerPresence: (present) => {
          if (cancelled) return;
          if (present) {
            setStatus("ready");
            setMessage(null);
          }
        },
        onRoster: (cameras, liveId) => {
          if (cancelled) return;
          setCameraPeers(cameras);
          setPublisherId(liveId);
          setSwitchingPhone(false);
          setStatus("ready");
          setMessage(null);
        },
        onPublisherChange: (_self, liveId) => {
          if (cancelled) return;
          setPublisherId(liveId);
          setSwitchingPhone(false);
        },
        onError: (msg) => {
          if (cancelled) return;
          console.warn("[kiss-cam remote]", msg);
          setMessage("Connection is unstable. Trying to reconnect…");
        },
      });
      connRef.current = conn;
      try {
        await conn.connect();
        if (!cancelled) {
          setStatus("ready");
          setMessage(null);
        }
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setMessage(
          err instanceof Error ? err.message : "Unable to connect to the LED session",
        );
      }
    };

    void run();

    return () => {
      cancelled = true;
      void connRef.current?.dispose();
      connRef.current = null;
    };
  }, [sessionId]);

  const sendAction = useCallback(async (action: KissCamControlAction) => {
    if (!connRef.current?.alive) {
      setMessage("Not connected to the LED yet.");
      return;
    }
    setBusyAction(action);
    try {
      await connRef.current.sendControl(action);
      if (action === "loading-on") setLoadingOn(true);
      if (action === "loading-off") setLoadingOn(false);
    } catch {
      setMessage("Unable to send control to the LED.");
    } finally {
      setBusyAction(null);
    }
  }, []);

  const ledHref = useMemo(() => {
    if (!sessionId) return "/reception/kiss-cam";
    return "/reception/kiss-cam";
  }, [sessionId]);

  if (!sessionId) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-[#2a1a22] px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-[#fff5f7]">
        <header className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ffc9d4]/90">
            TableWedding
          </p>
          <h1 className="kiss-cam-love-title mt-1 text-[2.2rem] leading-none">Kiss Cam Remote</h1>
          <p className="mt-2 text-sm text-[#f7f1e8]/70">
            Control the LED panel from this phone — enter the short code shown next to the QR.
          </p>
        </header>
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ffc9d4]/85">
          Short code
        </label>
        <input
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
          placeholder="e.g. A7K2M9"
          className="mt-2 h-12 rounded-xl border border-white/15 bg-black/30 px-3 font-mono text-lg tracking-[0.2em] text-[#fff5f7] outline-none focus:border-[#ffc9d4]/50"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
        />
        <Button
          className="mt-4 h-12 w-full bg-[#c45a78] text-white hover:bg-[#a84864]"
          onClick={() => void resolveSession(codeInput)}
          disabled={status === "connecting"}
        >
          {status === "connecting" ? "Connecting…" : "Connect remote"}
        </Button>
        {message ? <p className="mt-3 text-sm text-rose-200">{message}</p> : null}
        <Link
          href="/reception/kiss-cam"
          className="mt-8 text-center text-sm text-[#ffd6e0] underline-offset-2 hover:underline"
        >
          Open full Kiss Cam LED
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-3 bg-[#2a1a22] px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] text-[#fff5f7]">
      <header className="flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ffc9d4]/90">
            Mobile remote
          </p>
          <h1 className="kiss-cam-love-title mt-0.5 text-[2rem] leading-none">Kiss Cam</h1>
          <p className="mt-1 truncate text-xs text-[#f7f1e8]/65">{coupleNames}</p>
        </div>
        <div className="shrink-0 text-right text-[11px]">
          <p
            className={cn(
              "font-semibold",
              status === "ready"
                ? "text-emerald-300"
                : status === "error"
                  ? "text-rose-300"
                  : "text-amber-200",
            )}
          >
            {status === "ready" ? "Linked to LED" : status === "error" ? "Offline" : "Connecting…"}
          </p>
          <Link href={ledHref} className="mt-1 inline-block text-[#ffd6e0] underline-offset-2 hover:underline">
            LED page
          </Link>
        </div>
      </header>

      <KissCamQRCode
        sessionId={sessionId}
        shortCode={shortCode}
        refreshing={false}
        hideRefresh
        onRefresh={() => undefined}
        footnote="Same camera QR as the LED. Refresh the code only from the LED screen."
      />

      <KissCamPhoneSwitcher
        cameras={cameraPeers}
        publisherId={publisherId}
        switching={switchingPhone}
        onSelect={(clientId) => {
          setSwitchingPhone(true);
          void connRef.current?.promoteCamera(clientId).catch(() => {
            setSwitchingPhone(false);
            setMessage("Unable to switch camera phone.");
          });
        }}
      />

      <div className="rounded-2xl border border-white/10 bg-[#3a2f28]/92 p-4 shadow-[0_16px_40px_rgba(0,0,0,.35)] backdrop-blur-md">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ffc9d4]/90">
          Controls
        </p>
        <p className="mt-2 text-[11px] leading-snug text-[#f7f1e8]/60">
          These buttons drive the LED wall. The projector page stays clean — this phone is the
          remote.
        </p>

        <div className="mt-3 grid gap-2">
          <Button
            size="lg"
            className="h-12 w-full bg-[#c45a78] text-white hover:bg-[#a84864]"
            disabled={status !== "ready" || busyAction === "start"}
            onClick={() => void sendAction("start")}
          >
            Start Kiss Cam
          </Button>
          <Button
            size="lg"
            className={`h-12 w-full touch-manipulation ${
              loadingOn
                ? "bg-[#ff8fab] text-white hover:bg-[#ff7a9a]"
                : "border border-white/20 bg-white/10 text-[#f7f1e8] hover:bg-white/15"
            }`}
            disabled={status !== "ready"}
            onClick={() => void sendAction(loadingOn ? "loading-off" : "loading-on")}
            aria-pressed={loadingOn}
          >
            {loadingOn ? "Clear Loading Screen" : "Loading Screen"}
          </Button>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="secondary"
              disabled={status !== "ready"}
              onClick={() => void sendAction("preview")}
            >
              Preview
            </Button>
            <Button
              variant="outline"
              className="border-white/20 text-[#f7f1e8]"
              disabled={status !== "ready"}
              onClick={() => void sendAction("reset")}
            >
              Reset
            </Button>
            <Button
              variant="gold"
              disabled={status !== "ready"}
              onClick={() => void sendAction("love")}
            >
              ♥ Love
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {([3, 2, 1] as const).map((n) => (
              <Button
                key={n}
                variant="outline"
                className="h-12 border-white/20 text-lg font-semibold text-[#f7f1e8]"
                disabled={status !== "ready"}
                onClick={() => void sendAction(`countdown-${n}`)}
              >
                {n}
              </Button>
            ))}
          </div>
        </div>

        {message ? <p className="mt-3 text-xs text-amber-200/90">{message}</p> : null}
      </div>
    </main>
  );
}
