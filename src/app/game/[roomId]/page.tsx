"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSocket } from "../../../context/SocketContext";
import { useRouter } from "next/navigation";
import { Game, Phase } from "@/types/game";
import dynamic from "next/dynamic";

const ThemeToggle = dynamic(() => import("@/components/ThemeToggle").then((m) => m.ThemeToggle), { ssr: false });

// ---- helpers ----
function validateCode(code: string): string | null {
  if (code.length !== 4) return "Code must be exactly 4 digits";
  if (!/^\d+$/.test(code)) return "Digits only (0–9)";
  if (code.startsWith("0")) return "Code cannot start with 0";
  const unique = new Set(code.split(""));
  if (unique.size !== 4) return "All digits must be unique";
  return null;
}

function formatGuessFeedback(bulls: number, cows: number): string {
  if (bulls === 0 && cows === 0) return "0 Cows 0 Bulls";
  const exact = bulls === 1 ? "1 Bull" : `${bulls} Bulls`;
  const near = cows === 1 ? "1 Cow" : `${cows} Cows`;
  return `${exact} • ${near}`;
}

export default function GameRoom() {
  const { socket } = useSocket();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = pathname?.split("/")[2] || "";
  const isHost = searchParams?.get("host") === "true";

  const [phase, setPhase] = useState<Phase>(isHost ? "lobby" : "code");
  const [game, setGame] = useState<Game | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");
  const [codeLocked, setCodeLocked] = useState(false);
  const [guess, setGuess] = useState("");
  const [guessError, setGuessError] = useState("");
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [copied, setCopied] = useState(false);
  const guessRef = useRef<HTMLInputElement>(null);
  const opponent = game?.players.find((p) => p.id !== socket?.id);
  const myPlayer = game?.players.find((p) => p.id === socket?.id);
  const isMyTurn = game ? game.players[game.turn]?.id === socket?.id : false;
  const winner = game?.winner ? game.players.find((p) => p.id === game.winner) : null;
  const iWon = winner?.id === socket?.id;

  // Handle incoming events
  useEffect(() => {
    if (!socket) return;

    // Host: receives their own game right away via navigation state
    // but also needs to listen for when opponent joins
    socket.on("gameStarted", ({ game: g }: { game: Game }) => {
      setGame(g);
      setPhase("code");
    });

    socket.on("codeSet", ({ game: g }: { game: Game }) => {
      setGame(g);
    });

    socket.on("playPhase", ({ game: g }: { game: Game }) => {
      setGame(g);
      setPhase("play");
    });

    socket.on("updateGame", ({ game: g }: { game: Game }) => {
      setGame(g);
      if (g.phase === "done") setPhase("done");
    });

    socket.on("playerLeft", () => {
      setOpponentLeft(true);
    });
    socket.on("sessionEnded", () => {
      setOpponentLeft(true);
    });

    return () => {
      socket.off("gameStarted");
      socket.off("codeSet");
      socket.off("playPhase");
      socket.off("updateGame");
      socket.off("playerLeft");
      socket.off("sessionEnded");
    };
  }, [socket]);

  // Focus guess input on play phase when it's our turn
  useEffect(() => {
    if (phase === "play" && isMyTurn && guessRef.current) {
      guessRef.current.focus();
    }
  }, [phase, game?.turn, isMyTurn]);

  useEffect(() => {
    if (!opponentLeft) return;
    const timer = setTimeout(() => {
      router.push("/");
    }, 2200);
    return () => clearTimeout(timer);
  }, [opponentLeft, router]);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const submitCode = () => {
    const err = validateCode(codeInput);
    if (err) return setCodeError(err);
    setCodeError("");
    socket?.emit("setCode", { roomId, code: codeInput });
    setCodeLocked(true);
  };

  const submitGuess = () => {
    const err = validateCode(guess);
    if (err) return setGuessError(err);
    setGuessError("");
    socket?.emit("makeGuess", { roomId, guess });
    setGuess("");
  };

  const leaveGame = () => {
    socket?.emit("leaveGame", { roomId });
    router.push("/");
  };

  if (opponentLeft) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
        <div className="w-full max-w-sm rounded-2xl border border-[var(--color-border-tertiary)] bg-[var(--color-background-primary)] p-6 text-center shadow-xl">
          <p className="text-2xl mb-2">⚠️</p>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Session ended</h3>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Your opponent left the game. You will be redirected to home.
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-4 w-full rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
          >
            Go now
          </button>
        </div>
      </div>
    );
  }

  // ---- PHASE: LOBBY (host waiting) ----
  if (phase === "lobby") {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--color-background-tertiary,#f5f4f0)] p-4">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <span className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wider">CodeHunt</span>
            <h2 className="text-xl font-medium text-[var(--color-text-primary)] mt-1">Waiting for opponent</h2>
          </div>

          <div className="bg-[var(--color-background-primary)] rounded-2xl border border-[var(--color-border-tertiary)] p-6">
            <p className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">Room code</p>
            <div className="bg-[var(--color-background-secondary)] rounded-xl p-4 text-center mb-4">
              <div className="font-mono text-3xl font-medium tracking-[0.2em] text-[var(--color-accent)] mb-1">{roomId}</div>
              <p className="text-xs text-[var(--color-text-tertiary)]">Share this with your opponent</p>
            </div>
            <button
              onClick={copyRoomCode}
              className="w-full py-2 text-sm font-medium rounded-lg border border-[var(--color-border-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)] transition-colors"
            >
              {copied ? "Copied!" : "Copy room code"}
            </button>

            <div className="mt-6">
              <p className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3">Players</p>
              <PlayerSlot name={searchParams?.get("name") || "You"} role="Host" color="purple" />
              <PlayerSlot name="Waiting…" role="" color="empty" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- PHASE: CODE ENTRY ----
  if (phase === "code") {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--color-background-tertiary,#f5f4f0)] p-4">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <span className="text-xs text-[var(--color-text-tertiary)] font-mono tracking-wider">{roomId}</span>
            <h2 className="text-xl font-medium text-[var(--color-text-primary)] mt-1">Set your secret code</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">4 unique digits from 0–9, no leading 0</p>
          </div>

          <div className="bg-[var(--color-background-primary)] rounded-2xl border border-[var(--color-border-tertiary)] p-6">
            {/* Digit display */}
            <div className="flex gap-3 justify-center mb-4">
              {[0,1,2,3].map((i) => (
                <div key={i} className={`w-12 h-14 flex items-center justify-center rounded-xl text-2xl font-mono font-medium transition-colors ${codeInput[i] ? "bg-[color-mix(in_srgb,var(--color-accent)_20%,transparent)] text-[var(--color-accent)] border border-[color-mix(in_srgb,var(--color-accent)_45%,white)]" : "bg-[var(--color-background-secondary)] text-[var(--color-text-tertiary)] border border-[var(--color-border-tertiary)]"}`}>
                  {codeLocked ? "•" : (codeInput[i] || "·")}
                </div>
              ))}
            </div>

            {!codeLocked ? (
              <>
                <input
                  type="text"
                  inputMode="numeric"
                  value={codeInput}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setCodeInput(v);
                    setCodeError("");
                  }}
                  placeholder="Type your 4-digit code"
                  className="w-full px-3 py-2 text-sm border border-[var(--color-border-secondary)] rounded-lg bg-[var(--color-background-primary)] text-[var(--color-text-primary)] font-mono tracking-widest text-center outline-none focus:border-[var(--color-accent)] mb-3 transition-colors"
                  maxLength={4}
                  onKeyDown={(e) => e.key === "Enter" && submitCode()}
                />
                {codeError && <p className="text-xs text-red-600 mb-3">{codeError}</p>}
                <button
                  onClick={submitCode}
                  disabled={codeInput.length !== 4}
                  className="w-full py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40"
                >
                  Lock in code
                </button>
              </>
            ) : (
              <div className="text-center py-3">
                <div className="inline-flex items-center gap-2 bg-[#EAF3DE] text-[#27500A] text-sm px-4 py-2 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-[#639922] inline-block" />
                  Code locked! Waiting for opponent…
                </div>
              </div>
            )}

            {/* Opponent status */}
            {game && (
              <div className="mt-4 pt-4 border-t border-[var(--color-border-tertiary)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--color-text-tertiary)]">{opponent?.name || "Opponent"}</span>
                  {opponent?.code
                    ? <span className="text-xs bg-[#EAF3DE] text-[#27500A] px-2 py-0.5 rounded">Ready</span>
                    : <span className="text-xs text-[var(--color-text-tertiary)] flex items-center gap-1.5"><PulseDot />Setting code…</span>
                  }
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- PHASE: PLAY / DONE ----
  return (
    <div className="flex-1 bg-[var(--color-background-tertiary,#f5f4f0)] p-4">
      {/* Header */}
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-[var(--color-text-tertiary)] font-mono tracking-wider">{roomId}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-2 py-1 bg-[var(--color-background-primary)] rounded-lg border border-[var(--color-border-tertiary)] text-[var(--color-text-secondary)]">
              CodeHunt
            </span>
            <ThemeToggle />
            <button
              type="button"
              onClick={leaveGame}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-background-secondary)]"
            >
              <span aria-hidden="true">⎋</span>
              Leave game
            </button>
          </div>
        </div>

        {/* Winner banner */}
        {phase === "done" && (
          <div className={`rounded-xl p-4 text-center mb-4 ${iWon ? "bg-[#EAF3DE] border border-[#9FE1CB]" : "bg-[#FAECE7] border border-[#F5C4B3]"}`}>
            <p className="font-medium text-lg" style={{ color: iWon ? "#085041" : "#993C1D" }}>
              {iWon ? "You cracked the code!" : `${winner?.name} cracked your code.`}
            </p>
            <p className="text-sm mt-0.5" style={{ color: iWon ? "#0F6E56" : "#712B13" }}>
              {iWon ? "Nice work, codeHunter." : "Better luck next time."}
            </p>
            <button
              onClick={() => router.push("/")}
              className="mt-3 px-4 py-1.5 text-sm font-medium rounded-lg border transition-colors"
              style={{ borderColor: iWon ? "#5DCAA5" : "#F0997B", color: iWon ? "#085041" : "#993C1D" }}
            >
              Play again
            </button>
          </div>
        )}

        {/* Turn banner */}
        {phase === "play" && (
          <div className={`rounded-xl px-4 py-3 mb-4 ${isMyTurn ? "bg-[#E1F5EE] border border-[#9FE1CB]" : "bg-[var(--color-background-secondary)] border border-[var(--color-border-tertiary)]"}`}>
            {isMyTurn ? (
              <p className="text-sm font-medium text-[#085041]">Your turn — make a guess</p>
            ) : (
              <p className="text-sm text-[var(--color-text-secondary)] flex items-center gap-2">
                <PulseDot /> Waiting for {opponent?.name}…
              </p>
            )}
          </div>
        )}

        {/* Guess input */}
        {phase === "play" && (
          <div className="bg-[var(--color-background-primary)] rounded-xl border border-[var(--color-border-tertiary)] p-5 mb-4 text-center">
            <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] mb-2">Your locked code</p>
            <p className="font-mono text-4xl tracking-[0.3em] text-[var(--color-accent)]">
              {myPlayer?.code || "----"}
            </p>
          </div>
        )}

        {phase === "play" && isMyTurn && (
          <div className="bg-[var(--color-background-primary)] rounded-xl border border-[var(--color-border-tertiary)] p-4 mb-4">
            <div className="flex gap-2">
              <input
                ref={guessRef}
                type="text"
                inputMode="numeric"
                value={guess}
                onChange={(e) => {
                  setGuess(e.target.value.replace(/\D/g, "").slice(0, 4));
                  setGuessError("");
                }}
                placeholder="Enter guess"
                maxLength={4}
                className="flex-1 px-3 py-2 text-sm border border-[var(--color-border-secondary)] rounded-lg bg-[var(--color-background-primary)] text-[var(--color-text-primary)] font-mono tracking-widest text-center outline-none focus:border-[var(--color-accent)] transition-colors"
                onKeyDown={(e) => e.key === "Enter" && submitGuess()}
              />
              <button
                onClick={submitGuess}
                disabled={guess.length !== 4}
                className="px-5 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40"
              >
                Guess
              </button>
            </div>
            {guessError && <p className="text-xs text-red-600 mt-2">{guessError}</p>}
          </div>
        )}

        {/* Two-column boards */}
        <div className="grid grid-cols-2 gap-3">
          {game?.players.map((p) => {
            const isMe = p.id === socket?.id;
            return (
              <div key={p.id} className="bg-[var(--color-background-primary)] rounded-xl border border-[var(--color-border-tertiary)] p-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium ${isMe ? "bg-[#EEEDFE] text-[#3C3489]" : "bg-[#E1F5EE] text-[#085041]"}`}>
                    {p.name[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">{p.name}</span>
                  {isMe && <span className="text-[10px] text-[var(--color-text-tertiary)]">(you)</span>}
                </div>
                {p.guesses.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-tertiary)] text-center py-4">No guesses yet</p>
                ) : (
                  <div className="space-y-1.5">
                    {p.guesses.map((g, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="font-mono text-sm tracking-widest text-[var(--color-text-primary)] flex-1">{g.guess}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--color-background-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border-secondary)]">
                          {formatGuessFeedback(g.bulls, g.cows)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <details className="mt-4 rounded-xl border border-[var(--color-border-tertiary)] bg-[var(--color-background-primary)] p-4">
          <summary className="cursor-pointer text-sm font-medium text-[var(--color-text-primary)]">Rules and help</summary>
          <div className="mt-3 space-y-2 text-xs text-[var(--color-text-secondary)]">
            <p>Secret code: 4 unique digits from 0 to 9, but it cannot start with 0.</p>
            <p>Each guess gets feedback: exact = correct digit and position, misplaced = correct digit wrong position.</p>
            <p>No matches means none of the guessed digits are in the secret code.</p>
            <p>Turns alternate until someone reaches 4 exact.</p>
          </div>
        </details>
      </div>

    </div>
  );
}

function PlayerSlot({ name, role, color }: { name: string; role: string; color: "purple" | "teal" | "empty" }) {
  const avatarStyle =
    color === "purple" ? "bg-[#EEEDFE] text-[#3C3489]" :
    color === "teal" ? "bg-[#E1F5EE] text-[#085041]" :
    "bg-[var(--color-background-secondary)] border border-dashed border-[var(--color-border-secondary)]";

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border-tertiary)] mb-2">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${avatarStyle}`}>
        {color !== "empty" ? name[0]?.toUpperCase() : ""}
      </div>
      <div>
        <p className={`text-sm font-medium ${color === "empty" ? "text-[var(--color-text-tertiary)]" : "text-[var(--color-text-primary)]"}`}>{name}</p>
        {role && <p className="text-xs text-[var(--color-text-tertiary)]">{role}</p>}
      </div>
      {color === "empty" && <PulseDot className="ml-auto" />}
    </div>
  );
}

function PulseDot({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full bg-[#EF9F27] animate-pulse ${className}`} />
  );
}