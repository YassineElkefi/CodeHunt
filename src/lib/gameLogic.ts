import type { Game, Player } from "@/types/game";

export function randomRoomId() {
  // 5 chars, easy to read, upper-case.
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

export function countBulls(code: string, guess: string) {
  let bulls = 0;
  for (let i = 0; i < 4; i++) if (code[i] === guess[i]) bulls++;
  return bulls;
}

export function countCows(code: string, guess: string) {
  let cows = 0;
  for (let i = 0; i < 4; i++) {
    if (code[i] !== guess[i] && code.includes(guess[i])) cows++;
  }
  return cows;
}

export function validateCode(code: string): string | null {
  if (code.length !== 4) return "Code must be exactly 4 digits";
  if (!/^\d+$/.test(code)) return "Digits only (0–9)";
  if (code.startsWith("0")) return "Code cannot start with 0";
  const unique = new Set(code.split(""));
  if (unique.size !== 4) return "All digits must be unique";
  return null;
}

export function getPlayer(game: Game, playerId: string): Player | undefined {
  return game.players.find((p) => p.id === playerId);
}

