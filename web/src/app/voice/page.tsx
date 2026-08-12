"use client";

import { useRouter } from "next/navigation";
import VoiceAgentOverlay from "@/components/app/VoiceAgentOverlay";

// Deep link to the voice agent; the same overlay the in-app pill opens.
export default function VoicePage() {
  const router = useRouter();
  return <VoiceAgentOverlay open onClose={() => router.push("/")} />;
}
