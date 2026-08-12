"use client";

import { useEffect, useState } from "react";
import { MapPin, NavigationArrow, CalendarBlank, Wallet, X, ArrowRight, Crosshair, CheckCircle } from "@phosphor-icons/react";
import LottiePlayer from "./LottiePlayer";
import { useGeolocation } from "@/lib/useGeolocation";
import type { SolveResponse } from "@/lib/plan-types";

interface TripBriefSheetProps {
  open: boolean;
  onClose: () => void;
  onSolved: (result: SolveResponse) => void;
}

// The one screen the prototype was missing: capturing the brief before "Solve it".
// Styled in the same cream glass language as the landing surface.
export default function TripBriefSheet({ open, onClose, onSolved }: TripBriefSheetProps) {
  const [from, setFrom] = useState("San Francisco");
  const [to, setTo] = useState("");
  const [arriveBy, setArriveBy] = useState("");
  const [budget, setBudget] = useState(900);
  const [solving, setSolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { state: geoState, coords, locate } = useGeolocation();

  useEffect(() => {
    const home = localStorage.getItem("meguaz_home_base");
    if (home) setFrom(home);
    const inTwoWeeks = new Date(Date.now() + 14 * 86_400_000);
    setArriveBy(inTwoWeeks.toISOString().slice(0, 10));
  }, []);

  if (!open) return null;

  async function solve(e: React.FormEvent) {
    e.preventDefault();
    setSolving(true);
    setError(null);
    try {
      const res = await fetch("/api/plan/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to,
          arriveBy,
          budget,
          adults: 1,
          // Real position sharpens "leave home by"; omitted if not shared.
          originCoords: coords ? { lat: coords.lat, lng: coords.lng } : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          res.status === 404
            ? "No routes found — try a bigger nearby city or another date."
            : "The solver hiccuped — give it another try."
        );
        return;
      }
      onSolved(data as SolveResponse);
    } catch {
      setError("Connection dropped — try that again.");
    } finally {
      setSolving(false);
    }
  }

  const fieldShell =
    "rounded-2xl px-4 py-3 flex items-center gap-3 bg-white/70 border border-[#0D1B2A]/10";

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: "rgba(7,19,32,0.55)", backdropFilter: "blur(6px)" }}
      />
      <div
        className="relative w-full max-w-md rounded-t-[2rem] md:rounded-[2rem] p-6 pb-8 animate-rise"
        style={{ background: "#F6F3EA", boxShadow: "0 -20px 60px -20px rgba(7,19,32,0.5)" }}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display text-[#0D1B2A] text-2xl">Where to?</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 glass-card rounded-full flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Close trip brief"
          >
            <X size={16} color="#0D1B2A" weight="bold" />
          </button>
        </div>
        <p className="text-[#0D1B2A]/50 text-xs mb-5">
          Meguaz solves the whole door-to-door trip against your budget and arrival time.
        </p>

        {solving ? (
          <div className="flex flex-col items-center py-10">
            <LottiePlayer type="loading" size={72} />
            <p className="text-[#0D1B2A]/60 text-sm mt-5">
              Solving {from} → {to || "your trip"}…
            </p>
            <p className="text-[#0D1B2A]/40 text-xs mt-1">
              Checking live fares and door-to-door timing
            </p>
          </div>
        ) : (
          <form onSubmit={solve} className="space-y-3">
            <div className={fieldShell}>
              <MapPin size={18} color="#146C7E" weight="regular" />
              <div className="flex-1">
                <p className="text-[#0D1B2A]/45 text-[11px] uppercase tracking-wide">From home</p>
                <input
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  required
                  className="w-full bg-transparent text-[#0D1B2A] font-semibold text-sm outline-none"
                  placeholder="San Francisco"
                />
              </div>
              {geoState === "granted" && coords ? (
                <span className="flex items-center gap-1 text-[#2FB4B4] text-[11px] font-semibold">
                  <CheckCircle size={14} weight="fill" /> Located
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => locate()}
                  disabled={geoState === "locating"}
                  className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-[#146C7E]"
                  style={{ background: "rgba(20,108,126,0.1)" }}
                >
                  <Crosshair size={13} weight="bold" />
                  {geoState === "locating" ? "Locating…" : "Use my location"}
                </button>
              )}
            </div>

            {/* Location sharpens the leave-home-by time to a real drive ETA. */}
            <p className="text-[#0D1B2A]/40 text-[11px] px-1 -mt-1">
              {geoState === "granted"
                ? "Using your live location for an accurate leave-home-by time."
                : geoState === "denied"
                  ? "Location off — we'll estimate the drive from your city instead."
                  : "Share your location for a precise leave-home-by time."}
            </p>

            <div className={fieldShell}>
              <NavigationArrow size={18} color="#FF7A00" weight="regular" />
              <div className="flex-1">
                <p className="text-[#0D1B2A]/45 text-[11px] uppercase tracking-wide">To</p>
                <input
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  required
                  autoFocus
                  className="w-full bg-transparent text-[#0D1B2A] font-semibold text-sm outline-none"
                  placeholder="London, Tokyo, Addis Ababa…"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={fieldShell}>
                <CalendarBlank size={18} color="#146C7E" weight="regular" />
                <div className="flex-1 min-w-0">
                  <p className="text-[#0D1B2A]/45 text-[11px] uppercase tracking-wide">Arrive by</p>
                  <input
                    type="date"
                    value={arriveBy}
                    onChange={(e) => setArriveBy(e.target.value)}
                    required
                    className="w-full bg-transparent text-[#0D1B2A] font-semibold text-sm outline-none"
                  />
                </div>
              </div>
              <div className={fieldShell}>
                <Wallet size={18} color="#FF7A00" weight="regular" />
                <div className="flex-1 min-w-0">
                  <p className="text-[#0D1B2A]/45 text-[11px] uppercase tracking-wide">Budget cap</p>
                  <div className="flex items-center gap-1">
                    <span className="text-[#0D1B2A] font-semibold text-sm">$</span>
                    <input
                      type="number"
                      min={50}
                      step={50}
                      value={budget}
                      onChange={(e) => setBudget(Number(e.target.value))}
                      required
                      className="w-full bg-transparent text-[#0D1B2A] font-semibold text-sm outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {error && <p className="text-[#FF7A00] text-xs px-1">{error}</p>}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-full py-4 font-semibold text-white active:scale-[0.98] hover:brightness-105 transition-all mt-2"
              style={{
                background: "linear-gradient(135deg, #FF7A00, #FFC857)",
                boxShadow: "0 12px 28px -10px rgba(255,122,0,0.6)",
              }}
            >
              Solve this trip
              <ArrowRight size={18} weight="bold" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
