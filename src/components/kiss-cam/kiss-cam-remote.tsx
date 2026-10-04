"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
 * Mobile remote — controls the desktop/LED Kiss Cam page only.
 * Signaling-only: never takes WebRTC video, never fullscreens this phone.
 * Camera QR is a read-only mirror of the laptop LED pairing code.
 */
export function KissCamRemote({ coupleNames }: { coupleNames: string }) {
  const search = useSearchParams();
  const sessionFromUrl = (search.get("session") || "").trim();
  const codeFromUrl = (search.get("code") || "").trim().toUpperCase();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [shortCode, setShortCode] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState(codeFromUrl);
  const [status, setStatus] = useState<"idle" | "connecting" | "ready" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [cameraPeers, setCameraPeers] = useState<KissCamCameraPeer[]>([]);
  const [publisherId, setPublisherId] = useState<string | null>(null);
  const [switchingPhone, setSwitchingPhone] = useState(false);
  const [loadingOn, setLoadingOn] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [ledFullscreen, setLedFullscreen] = useState(false);
  /** Only show the camera QR after the LED (or code lookup) confirmed the pairing. */
  const [qrMirrored, setQrMirrored] = useState(false);
  const connRef = useRef<KissCamConnection | null>(null);
  const bootstrappedRef = useRef(false);

  const applyPairing = useCallback((id: string, code: string, mirrored: boolean) => {
    const nextCode = code.trim().toUpperCase();
    setSessionId(id);
    setShortCode(nextCode);
    setCodeInput(nextCode);
    if (mirrored) setQrMirrored(true);
  }, []);

  const resolveSession = useCallback(
    async (code: string) => {
      const trimmed = code.trim().toUpperCase();
      if (!trimmed) {
        setMessage("Enter the short code shown on the LED Kiss Cam panel.");
        return;
      }
      setStatus("connecting");
      setMessage("Looking up LED session…");
      setQrMirrored(false);
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
        // Code lookup is the laptop LED short code — treat as mirrored pairing.
        applyPairing(json.id, json.shortCode || trimmed, true);
        setMessage(null);
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Unable to find LED session");
      }
    },
    [applyPairing],
  );

  // Bootstrap from URL: prefer LED short code lookup so phone never keeps a stale session id.
  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    const boot = async () => {
      if (codeFromUrl) {
        setStatus("connecting");
        setMessage("Looking up LED session…");
        setQrMirrored(false);
        try {
          const res = await fetch(
            `/api/kiss-cam/session/lookup?code=${encodeURIComponent(codeFromUrl)}`,
          );
          const json = (await res.json()) as {
            id?: string;
            shortCode?: string;
            error?: string;
          };
          if (res.ok && json.id) {
            applyPairing(json.id, json.shortCode || codeFromUrl, true);
            setMessage(null);
            return;
          }
        } catch {
          // Fall through — ephemeral LED sessions may only exist on the laptop link.
        }
        if (sessionFromUrl) {
          applyPairing(sessionFromUrl, codeFromUrl, false);
          setMessage("Linking to LED…");
          return;
        }
        setStatus("error");
        setMessage("Session not found or expired. Use Open mobile remote from the LED.");
        return;
      }
      if (sessionFromUrl) {
        setSessionId(sessionFromUrl);
        setQrMirrored(false);
        setStatus("connecting");
        setMessage("Linking to LED…");
      }
    };

    void boot();
  }, [applyPairing, codeFromUrl, sessionFromUrl]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    const run = async () => {
      setStatus("connecting");
      setMessage("Linking to LED…");
      let supabase: ReturnType<typeof createClient>;
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
            void conn.requestSessionInfo();
          }
        },
        onRoster: (cameras, liveId) => {
          if (cancelled) return;
          setCameraPeers(cameras);
          setPublisherId(liveId);
          setSwitchingPhone(false);
          setStatus("ready");
          setMessage(null);
          void conn.requestSessionInfo();
        },
        onPublisherChange: (_self, liveId) => {
          if (cancelled) return;
          setPublisherId(liveId);
          setSwitchingPhone(false);
        },
        onSessionInfo: (info) => {
          if (cancelled) return;
          // Laptop LED is source of truth — always mirror its pairing QR.
          applyPairing(info.sessionId, info.shortCode, true);
          setStatus("ready");
          setMessage(null);
        },
        onError: (msg) => {
          if (cancelled) return;
          console.warn("[kiss-cam remote]", msg);
          setMessage("Connection unstable — still trying to reach the LED…");
        },
      });
      connRef.current = conn;
      try {
        await conn.connect();
        if (!cancelled) {
          setStatus("ready");
          setMessage(null);
          await conn.requestSessionInfo();
        }
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setMessage(
          err instanceof Error ? err.message : "Unable to link to the LED session",
        );
      }
    };

    void run();

    return () => {
      cancelled = true;
      void connRef.current?.dispose();
      connRef.current = null;
    };
  }, [applyPairing, sessionId]);

  const sendAction = useCallback(async (action: KissCamControlAction) => {
    if (!connRef.current?.alive) {
      setMessage("Not linked to the LED yet.");
      return;
    }
    setBusyAction(action);
    try {
      await connRef.current.sendControl(action);
      if (action === "loading-on") setLoadingOn(true);
      if (action === "loading-off") setLoadingOn(false);
      if (action === "fullscreen-on") setLedFullscreen(true);
      if (action === "fullscreen-off") setLedFullscreen(false);
      if (action === "fullscreen-toggle") setLedFullscreen((v) => !v);
    } catch {
      setMessage("Unable to send command to the LED.");
    } finally {
      setBusyAction(null);
    }
  }, []);

  if (!sessionId) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-[#2a1a22] px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-[#fff5f7]">
        <header className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ffc9d4]/90">
            TableWedding
          </p>
          <h1 className="kiss-cam-love-title mt-1 text-[2.2rem] leading-none">LED Remote</h1>
          <p className="mt-2 text-sm text-[#f7f1e8]/70">
            This phone only controls the desktop Kiss Cam LED. Scan{" "}
            <span className="font-semibold">Scan for LED remote</span> on the laptop panel, or enter
            the short code shown next to the camera QR.
          </p>
        </header>
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ffc9d4]/85">
          LED short code
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
          {status === "connecting" ? "Linking…" : "Link to LED"}
        </Button>
        {message ? <p className="mt-3 text-sm text-rose-200">{message}</p> : null}
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-3 bg-[#2a1a22] px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] text-[#fff5f7]">
      <header className="flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ffc9d4]/90">
            LED remote only
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
            {status === "ready" ? "Controlling LED" : status === "error" ? "Offline" : "Linking…"}
          </p>
          {ledFullscreen ? (
            <p className="mt-1 text-[#ffd6e0]/80">LED fullscreen on</p>
          ) : null}
        </div>
      </header>

      {qrMirrored && sessionId && shortCode ? (
        <KissCamQRCode
          sessionId={sessionId}
          shortCode={shortCode}
          refreshing={false}
          hideRefresh
          onRefresh={() => undefined}
          footnote="Same camera QR as the laptop LED. Refresh the code only on the LED screen."
        />
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[#3a2f28]/92 p-4 text-center text-sm text-[#f7f1e8]/70">
          Syncing camera QR from the laptop LED…
          {shortCode ? (
            <p className="mt-2 font-heading text-xl tracking-[0.2em] text-[#fff5f7]">{shortCode}</p>
          ) : null}
        </div>
      )}

      <KissCamPhoneSwitcher
        cameras={cameraPeers}
        publisherId={publisherId}
        switching={switchingPhone}
        onSelect={(clientId) => {
          setSwitchingPhone(true);
          void connRef.current?.promoteCamera(clientId).catch(() => {
            setSwitchingPhone(false);
            setMessage("Unable to switch the LED camera phone.");
          });
        }}
      />

      <div className="rounded-2xl border border-white/10 bg-[#3a2f28]/92 p-4 shadow-[0_16px_40px_rgba(0,0,0,.35)] backdrop-blur-md">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ffc9d4]/90">
          LED controls
        </p>
        <p className="mt-2 text-[11px] leading-snug text-[#f7f1e8]/60">
          Every button here runs on the desktop LED website only — this phone never goes fullscreen
          or shows the stage.
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
              disabled={status !== "ready" || busyAction === "fullscreen-toggle"}
              onClick={() => void sendAction("fullscreen-toggle")}
              aria-pressed={ledFullscreen}
            >
              {ledFullscreen ? "Exit FS" : "Fullscreen"}
            </Button>
          </div>
          <Button
            className="h-12 w-full bg-[#c45a78]/85 text-white hover:bg-[#a84864]"
            disabled={status !== "ready"}
            onClick={() => void sendAction("love")}
          >
            ♥ Love
          </Button>
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
