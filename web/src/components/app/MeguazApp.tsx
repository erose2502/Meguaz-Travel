"use client";

// Ported from the Figma Make prototype (src/App.tsx at repo root), now carrying
// real state: brief → solve (Duffel-backed) → selected option → locked-in trip.
import { useState, useEffect } from "react";
import OnboardingFlow from "./OnboardingFlow";
import LandingPage from "./LandingPage";
import SearchResults from "./SearchResults";
import JourneyTimeline from "./JourneyTimeline";
import BookingConfirmation from "./BookingConfirmation";
import TripsScreen from "./TripsScreen";
import ProfileScreen from "./ProfileScreen";
import BottomNav from "./BottomNav";
import TripBriefSheet from "./TripBriefSheet";
import VoiceAgentOverlay from "./VoiceAgentOverlay";
import { Waveform } from "@phosphor-icons/react";
import { saveTrip } from "@/lib/trips-client";
import type { PlanOption, SolveResponse } from "@/lib/plan-types";

type Screen =
  | "onboarding"
  | "landing"
  | "search"
  | "journey"
  | "confirmation"
  | "trips"
  | "profile";

const SHOW_ONBOARDING_KEY = "wayfar_onboarded";

export default function MeguazApp() {
  const [screen, setScreen] = useState<Screen>("onboarding");
  const [isMobile, setIsMobile] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [solved, setSolved] = useState<SolveResponse | null>(null);
  const [selected, setSelected] = useState<PlanOption | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    // ?screen=landing|trips|profile deep-links past onboarding (also handy in dev)
    const requested = new URLSearchParams(window.location.search).get("screen");
    if (requested === "landing" || requested === "trips" || requested === "profile") {
      sessionStorage.setItem(SHOW_ONBOARDING_KEY, "1");
      setScreen(requested);
      return;
    }
    if (sessionStorage.getItem(SHOW_ONBOARDING_KEY)) {
      setScreen("landing");
    }
  }, []);

  const handleOnboardingComplete = () => {
    sessionStorage.setItem(SHOW_ONBOARDING_KEY, "1");
    setScreen("landing");
  };

  const handleLockIn = () => {
    // Persist in the background; the confirmation screen never waits on I/O.
    if (solved && selected) void saveTrip(solved.brief, selected);
    setScreen("confirmation");
  };

  const showNav = screen !== "onboarding" && screen !== "confirmation";

  // Search & journey are steps inside the booking flow, not top-level destinations,
  // so no bottom-nav tab is highlighted while the user is mid-flow.
  const navScreenId =
    screen === "landing" || screen === "trips" || screen === "profile" ? screen : "";

  return (
    <div
      className="relative w-full min-h-dvh overflow-hidden"
      style={{ fontFamily: "'Inter', sans-serif", background: "#071320" }}
    >
      <div key={screen} className="animate-screen">
        {screen === "onboarding" && <OnboardingFlow onComplete={handleOnboardingComplete} />}

        {screen === "landing" && (
          <LandingPage
            onSearch={() => setBriefOpen(true)}
            onViewTrips={() => setScreen("trips")}
            isMobile={isMobile}
          />
        )}

        {screen === "search" && (
          <div className="overflow-y-auto h-dvh">
            <SearchResults
              solved={solved}
              onSelect={(option) => {
                setSelected(option);
                setScreen("journey");
              }}
              onBack={() => setScreen("landing")}
              isMobile={isMobile}
            />
          </div>
        )}

        {screen === "journey" && (
          <div className="overflow-y-auto h-dvh">
            <JourneyTimeline
              option={selected}
              budget={solved?.brief.budget}
              routeLabel={solved?.routeLabel}
              originCoords={solved?.brief.originCoords ?? null}
              onBack={() => setScreen("search")}
              onBook={handleLockIn}
              isMobile={isMobile}
            />
          </div>
        )}

        {screen === "confirmation" && (
          <div className="overflow-y-auto h-dvh">
            <BookingConfirmation
              option={selected}
              brief={solved?.brief ?? null}
              routeLabel={solved?.routeLabel}
              onDone={() => setScreen("landing")}
            />
          </div>
        )}

        {screen === "trips" && (
          <div className="overflow-y-auto h-dvh">
            <TripsScreen onOpenJourney={() => setScreen("journey")} isMobile={isMobile} />
          </div>
        )}

        {screen === "profile" && (
          <div className="overflow-y-auto h-dvh">
            <ProfileScreen isMobile={isMobile} />
          </div>
        )}
      </div>

      <TripBriefSheet
        open={briefOpen}
        onClose={() => setBriefOpen(false)}
        onSolved={(result) => {
          setSolved(result);
          setSelected(null);
          setBriefOpen(false);
          setScreen("search");
        }}
      />

      <VoiceAgentOverlay open={voiceOpen} onClose={() => setVoiceOpen(false)} />

      {/* Connect-to-agent pill — voice is a planning surface, available on the
          top-level screens, out of the way of the booking flow CTAs. */}
      {showNav && !voiceOpen && (
        <button
          onClick={() => setVoiceOpen(true)}
          className="fixed z-50 flex items-center gap-2 rounded-full pl-3.5 pr-4 py-3 text-sm font-semibold text-white active:scale-95 transition-transform"
          style={{
            right: 18,
            bottom: "max(96px, calc(env(safe-area-inset-bottom) + 88px))",
            background: "linear-gradient(135deg, #146C7E, #2FB4B4)",
            boxShadow: "0 12px 28px -10px rgba(47,180,180,0.7)",
          }}
          aria-label="Connect to voice agent"
        >
          <Waveform size={18} color="white" weight="bold" />
          Connect to agent
        </button>
      )}

      {showNav && (
        <BottomNav
          screen={navScreenId}
          onNavigate={(id) => {
            if (id === "landing") setScreen("landing");
            else if (id === "trips") setScreen("trips");
            else if (id === "profile") setScreen("profile");
          }}
        />
      )}
    </div>
  );
}
