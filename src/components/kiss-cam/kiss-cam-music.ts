"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Optional bundled track — drop a file here for a default wedding theme. */
export const KISS_CAM_DEFAULT_MUSIC_SRC = "/assets/kiss-cam/music/theme.mp3";

const FADE_MS = 700;

/**
 * LED / laptop music player. Audio plays in this browser tab (venue speakers),
 * not on the phone. Unlock via a user gesture (Start / Choose file / Music ON).
 */
export function useKissCamMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const targetVolumeRef = useRef(0.65);

  const [enabled, setEnabled] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.65);
  const [trackLabel, setTrackLabel] = useState<string | null>(null);
  const [usingDefault, setUsingDefault] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  targetVolumeRef.current = volume;

  const ensureAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;
    const audio = new Audio();
    audio.preload = "auto";
    audio.loop = true;
    audio.addEventListener("play", () => setPlaying(true));
    audio.addEventListener("pause", () => setPlaying(false));
    audio.addEventListener("ended", () => setPlaying(false));
    audioRef.current = audio;
    return audio;
  }, []);

  const clearFade = useCallback(() => {
    if (fadeTimerRef.current) {
      clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  }, []);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const loadSrc = useCallback(
    async (src: string, label: string, isDefault: boolean) => {
      const audio = ensureAudio();
      clearFade();
      setError(null);
      audio.pause();
      audio.src = src;
      audio.currentTime = 0;
      audio.volume = muted ? 0 : targetVolumeRef.current;
      audio.muted = muted;
      try {
        audio.load();
      } catch {
        // Some browsers throw on load(); play() will surface real errors.
      }
      setTrackLabel(label);
      setUsingDefault(isDefault);
      setReady(true);
    },
    [clearFade, ensureAudio, muted],
  );

  // Prefer a bundled theme if the venue has not picked a custom file yet.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (objectUrlRef.current) return;
      try {
        const res = await fetch(KISS_CAM_DEFAULT_MUSIC_SRC, { method: "HEAD", cache: "no-store" });
        if (!res.ok || cancelled) return;
        await loadSrc(KISS_CAM_DEFAULT_MUSIC_SRC, "Default theme", true);
      } catch {
        // No bundled track — operator can Choose music.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadSrc]);

  useEffect(() => {
    return () => {
      clearFade();
      const audio = audioRef.current;
      if (audio) {
        try {
          audio.pause();
          audio.removeAttribute("src");
          audio.load();
        } catch {
          // ignore
        }
      }
      audioRef.current = null;
      revokeObjectUrl();
    };
  }, [clearFade, revokeObjectUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = muted;
    if (!muted && fadeTimerRef.current == null) {
      audio.volume = volume;
    }
  }, [muted, volume]);

  const chooseFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      if (!file.type.startsWith("audio/") && !/\.(mp3|m4a|aac|wav|ogg|flac)$/i.test(file.name)) {
        setError("Please choose an audio file (MP3, M4A, WAV, or OGG).");
        return;
      }
      revokeObjectUrl();
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      await loadSrc(url, file.name, false);
      // Choosing a file is a user gesture — try a silent unlock so Start can play later.
      const audio = ensureAudio();
      const prevVol = audio.volume;
      try {
        audio.muted = true;
        await audio.play();
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // Autoplay still blocked until Start / Music toggle.
      } finally {
        audio.muted = muted;
        audio.volume = muted ? 0 : prevVol;
      }
    },
    [ensureAudio, loadSrc, muted, revokeObjectUrl],
  );

  const clearTrack = useCallback(() => {
    clearFade();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
    }
    revokeObjectUrl();
    setTrackLabel(null);
    setUsingDefault(false);
    setReady(false);
    setPlaying(false);
    setError(null);
    // Re-check default theme after clearing a custom file.
    void (async () => {
      try {
        const res = await fetch(KISS_CAM_DEFAULT_MUSIC_SRC, { method: "HEAD", cache: "no-store" });
        if (!res.ok) return;
        await loadSrc(KISS_CAM_DEFAULT_MUSIC_SRC, "Default theme", true);
      } catch {
        // none
      }
    })();
  }, [clearFade, loadSrc, revokeObjectUrl]);

  const fadeTo = useCallback(
    (to: number, thenPause: boolean) => {
      const audio = audioRef.current;
      if (!audio) return;
      clearFade();
      const from = audio.volume;
      const steps = 12;
      let i = 0;
      fadeTimerRef.current = setInterval(() => {
        i += 1;
        const t = i / steps;
        audio.volume = from + (to - from) * t;
        if (i >= steps) {
          clearFade();
          audio.volume = to;
          if (thenPause) {
            audio.pause();
            try {
              audio.currentTime = 0;
            } catch {
              // ignore
            }
          }
        }
      }, FADE_MS / steps);
    },
    [clearFade],
  );

  const play = useCallback(async () => {
    if (!enabled || muted) return;
    const audio = audioRef.current;
    if (!audio?.src) {
      setError("Choose a music file for the LED screen first.");
      return;
    }
    // Keep looping in the background — do not restart if already playing.
    if (!audio.paused) {
      setError(null);
      return;
    }
    clearFade();
    setError(null);
    audio.muted = false;
    audio.volume = 0;
    try {
      await audio.play();
      fadeTo(targetVolumeRef.current, false);
    } catch {
      setError("Tap Play music or Start again to allow playback.");
      setPlaying(false);
    }
  }, [clearFade, enabled, fadeTo, muted]);

  const stop = useCallback(
    (fade = true) => {
      const audio = audioRef.current;
      if (!audio) return;
      if (fade && !audio.paused) {
        fadeTo(0, true);
      } else {
        clearFade();
        audio.pause();
        try {
          audio.currentTime = 0;
        } catch {
          // ignore
        }
        audio.volume = muted ? 0 : targetVolumeRef.current;
      }
    },
    [clearFade, fadeTo, muted],
  );

  const setEnabledAndMaybeStop = useCallback(
    (next: boolean) => {
      setEnabled(next);
      if (!next) stop(true);
    },
    [stop],
  );

  return {
    enabled,
    setEnabled: setEnabledAndMaybeStop,
    muted,
    setMuted,
    volume,
    setVolume,
    trackLabel,
    usingDefault,
    playing,
    ready,
    error,
    chooseFile,
    clearTrack,
    play,
    stop,
  };
}
