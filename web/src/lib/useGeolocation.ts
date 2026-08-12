"use client";

import { useCallback, useState } from "react";

export type Coords = { lat: number; lng: number; accuracyM: number };
export type GeoState = "idle" | "locating" | "granted" | "denied" | "unavailable";

// Thin wrapper over the browser Geolocation API. Location is only requested on
// an explicit user gesture (calling `locate`), never on mount — the browser
// prompt should follow an action the user took.
export function useGeolocation() {
  const [state, setState] = useState<GeoState>("idle");
  const [coords, setCoords] = useState<Coords | null>(null);

  const locate = useCallback((): Promise<Coords | null> => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState("unavailable");
      return Promise.resolve(null);
    }
    setState("locating");
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracyM: pos.coords.accuracy,
          };
          setCoords(c);
          setState("granted");
          resolve(c);
        },
        (err) => {
          setState(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable");
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
      );
    });
  }, []);

  return { state, coords, locate };
}
