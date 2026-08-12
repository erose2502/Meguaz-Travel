"use client";

import { useState } from "react";
import { EnvelopeSimple, ArrowRight } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";

// Styled to match the Figma prototype's onboarding surfaces (dark navy + glass).
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    setState(error ? "error" : "sent");
  }

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-8"
      style={{ background: "#071320", fontFamily: "'Inter', sans-serif" }}
    >
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-[#2FB4B4]/10 blur-3xl animate-drift" />
      <div className="absolute bottom-20 left-0 w-96 h-96 rounded-full bg-[#FF7A00]/8 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-xs text-center">
        <span className="font-display text-white text-5xl leading-none tracking-tight">
          Meguaz
        </span>
        <span
          className="mt-3 h-1 w-16 rounded-full"
          style={{ background: "linear-gradient(90deg, #FF7A00, #FFC857)" }}
        />

        {state === "sent" ? (
          <div className="glass rounded-2xl px-5 py-6 mt-10 w-full">
            <EnvelopeSimple size={28} color="#2FB4B4" weight="light" className="mx-auto mb-3" />
            <p className="text-white/85 text-sm leading-relaxed">
              Check <span className="font-semibold text-white">{email}</span> for your
              sign-in link.
            </p>
          </div>
        ) : (
          <>
            <p className="text-white/60 text-sm leading-relaxed mt-8">
              Sign in with your email — no password needed.
            </p>
            <form onSubmit={signIn} className="mt-6 w-full">
              <div className="glass rounded-2xl flex items-center gap-3 px-4 py-3 border border-white/20">
                <EnvelopeSimple size={18} color="#2FB4B4" weight="light" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="flex-1 bg-transparent text-white placeholder-white/30 text-sm outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={state === "sending"}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-full py-4 font-semibold text-white transition-all duration-300 active:scale-95 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #FF7A00, #FFC857)" }}
              >
                {state === "sending" ? "Sending link…" : "Send sign-in link"}
                <ArrowRight size={18} weight="regular" />
              </button>
              {state === "error" && (
                <p className="text-[#FF7A00] text-xs mt-3">
                  That didn&apos;t send — check the address and try again.
                </p>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
