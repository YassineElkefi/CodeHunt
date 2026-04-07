"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRealtime } from "../context/RealtimeContext";
import dynamic from "next/dynamic";

const ThemeToggle = dynamic(() => import("@/components/ThemeToggle").then((m) => m.ThemeToggle), { ssr: false });

export default function HomePage() {
  const { clientId, isConnected } = useRealtime();
  const router = useRouter();
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<"create" | "join" | null>(null);

  const createGame = async () => {
    if (!clientId) return setError("Connecting…");
    if (!name.trim()) return setError("Please enter your name");
    setLoading("create");
    setError("");
    try {
      const resp = await fetch("/api/game/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), clientId }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Failed to create game");
      router.push(`/game/${data.roomId}?name=${encodeURIComponent(name.trim())}&host=true`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create game");
      setLoading(null);
    }
  };

  const joinGame = async () => {
    if (!clientId) return setError("Connecting…");
    if (!name.trim()) return setError("Please enter your name");
    if (!roomId.trim()) return setError("Please enter a room code");
    setLoading("join");
    setError("");
    try {
      const resp = await fetch("/api/game/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), roomId: roomId.trim().toUpperCase(), clientId }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Failed to join game");
      router.push(`/game/${data.roomId}?name=${encodeURIComponent(name.trim())}&host=false`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to join game");
      setLoading(null);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-[var(--color-background-tertiary,#f5f4f0)] p-4">
      <div className="w-full max-w-sm">
        <div className="mb-4 flex justify-end">
          <ThemeToggle />
        </div>
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[color-mix(in_srgb,var(--color-accent)_20%,transparent)] mb-4">
            <span className="text-2xl font-mono font-bold text-[var(--color-accent)]">CH</span>
          </div>
          <h1 className="text-2xl font-medium text-[var(--color-text-primary)]">CodeHunt</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">A 2-player code deduction game</p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-2" suppressHydrationWarning>
            {isConnected ? "Online" : "Connecting..."}
          </p>
        </div>

        {/* Card */}
        <div className="bg-[var(--color-background-primary)] rounded-2xl border border-[var(--color-border-tertiary)] p-6">
          <label className="block text-xs text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1.5">Your name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-3 py-2 text-sm border border-[var(--color-border-secondary)] rounded-lg bg-[var(--color-background-primary)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] mb-4 transition-colors"
            maxLength={20}
            onKeyDown={(e) => e.key === "Enter" && createGame()}
          />

          <button
            onClick={createGame}
            disabled={loading !== null}
            className="w-full py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 mb-3"
          >
            {loading === "create" ? "Creating…" : "Create a game"}
          </button>

          <div className="flex items-center gap-2 my-4">
            <div className="flex-1 h-px bg-[var(--color-border-tertiary)]" />
            <span className="text-xs text-[var(--color-text-tertiary)]">or join with a code</span>
            <div className="flex-1 h-px bg-[var(--color-border-tertiary)]" />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              placeholder="Room code"
              maxLength={5}
              className="flex-1 px-3 py-2 text-sm border border-[var(--color-border-secondary)] rounded-lg bg-[var(--color-background-primary)] text-[var(--color-text-primary)] font-mono tracking-widest uppercase outline-none focus:border-[var(--color-accent)] transition-colors"
              onKeyDown={(e) => e.key === "Enter" && joinGame()}
            />
            <button
              onClick={joinGame}
              disabled={loading !== null}
              className="px-4 py-2 bg-[var(--color-background-secondary)] hover:bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] text-sm font-medium rounded-lg border border-[var(--color-border-secondary)] transition-colors disabled:opacity-60"
            >
              {loading === "join" ? "Joining…" : "Join"}
            </button>
          </div>

          {error && (
            <p className="mt-3 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>

        <p className="text-center text-xs text-[var(--color-text-tertiary)] mt-4">
          4 unique digits · 0–9 · No repeats · No leading 0
        </p>
        <details className="mt-3 rounded-xl border border-[var(--color-border-tertiary)] bg-[var(--color-background-primary)] p-4">
          <summary className="cursor-pointer text-sm font-medium text-[var(--color-text-primary)]">How to play</summary>
          <div className="mt-3 space-y-2 text-xs text-[var(--color-text-secondary)]">
            <p>Each player sets a secret 4-digit code using digits 0-9 with no repeats (cannot start with 0).</p>
            <p>Players alternate turns to guess the opponent code.</p>
            <p>
              Feedback uses exact hits (right digit, right spot) and misplaced hits (right digit, wrong spot).
            </p>
            <p>First player to get 4 exact hits wins the round.</p>
          </div>
        </details>
      </div>
    </div>
  );
}