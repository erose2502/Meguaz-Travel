"use client";

import { useEffect, useState } from "react";
import { Microphone, PhoneDisconnect, X } from "@phosphor-icons/react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  BarVisualizer,
  useVoiceAssistant,
} from "@livekit/components-react";

interface VoiceAgentOverlayProps {
  open: boolean;
  onClose: () => void;
}

// Full-screen voice surface in the prototype's dark glass language.
// Opens already connecting — the pill button is the consent gesture.
export default function VoiceAgentOverlay({ open, onClose }: VoiceAgentOverlayProps) {
  const [conn, setConn] = useState<{ token: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setConn(null);
      setError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/livekit/token", { method: "POST", body: "{}" });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setConn(data);
      } catch {
        if (!cancelled) setError("Couldn't reach the voice service — try again in a moment.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col animate-screen"
      style={{
        background: "linear-gradient(180deg, #071320 0%, #0D1B2A 55%, #146C7E 100%)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Ambient orbs */}
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-[#2FB4B4]/10 blur-3xl animate-drift" />
      <div className="absolute bottom-20 left-0 w-96 h-96 rounded-full bg-[#FF7A00]/8 blur-3xl" />

      <div className="relative z-10 flex items-center justify-between px-5 pt-14 pb-4">
        <div>
          <p className="text-[#2FB4B4] text-xs font-medium tracking-widest uppercase">
            Voice agent
          </p>
          <h1 className="font-display text-white text-2xl leading-tight">Talk to Meguaz</h1>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 glass rounded-full flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Close voice agent"
        >
          <X size={18} color="white" weight="bold" />
        </button>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 pb-16">
        {error ? (
          <div className="flex flex-col items-center text-center max-w-xs">
            <p className="text-[#FF7A00] text-sm">{error}</p>
            <button
              onClick={onClose}
              className="mt-6 rounded-full px-8 py-3 glass text-white/80 text-sm font-medium active:scale-95 transition-transform"
            >
              Close
            </button>
          </div>
        ) : !conn ? (
          <div className="flex flex-col items-center text-center">
            <div
              className="rounded-full flex items-center justify-center mb-8 animate-pulse-glow"
              style={{
                width: 120,
                height: 120,
                background: "rgba(20,108,126,0.28)",
                border: "1px solid rgba(111,208,208,0.4)",
              }}
            >
              <Microphone size={52} color="#6FD0D0" weight="light" />
            </div>
            <p className="text-white/60 text-sm">Connecting to your agent…</p>
          </div>
        ) : (
          <LiveKitRoom
            serverUrl={conn.url}
            token={conn.token}
            connect
            audio
            video={false}
            onDisconnected={onClose}
            className="flex flex-col items-center gap-10 w-full max-w-xs"
          >
            <ActiveCall onEnd={onClose} />
            <RoomAudioRenderer />
          </LiveKitRoom>
        )}
      </div>
    </div>
  );
}

function ActiveCall({ onEnd }: { onEnd: () => void }) {
  const { state, audioTrack } = useVoiceAssistant();

  return (
    <>
      <div className="glass rounded-3xl w-full px-6 py-10 flex flex-col items-center">
        <BarVisualizer
          state={state}
          trackRef={audioTrack}
          barCount={5}
          style={{ height: 96, width: "100%", ["--lk-bar-color" as string]: "#2FB4B4" }}
        />
        <p className="text-white/50 text-xs mt-6">
          {state === "speaking"
            ? "Meguaz is speaking"
            : state === "listening"
              ? "Listening…"
              : state === "thinking"
                ? "Solving your trip…"
                : "Waiting for your agent to join…"}
        </p>
      </div>
      <p className="text-white/40 text-xs text-center max-w-[16rem] leading-relaxed">
        Tell Meguaz where you&apos;re headed, your budget, and when you need to arrive.
        Booking always finishes in the app.
      </p>
      <button
        onClick={onEnd}
        className="flex items-center justify-center gap-2 rounded-full px-8 py-4 font-semibold text-white/80 glass-dark active:scale-95 transition-transform"
      >
        <PhoneDisconnect size={18} weight="regular" />
        End conversation
      </button>
    </>
  );
}
