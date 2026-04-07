// types/game.ts

export type Phase = "lobby" | "code" | "play" | "done";

export interface Guess {
  guess: string;
  bulls: number;
  cows: number;
}

export interface Player {
  id: string; // socketId
  name: string;
  code: string; // secret number
  guesses: Guess[];
}

export interface Game {
  id: string; // room code
  players: Player[];
  turn: number; // index of current player
  winner?: string; // socketId of winner
  phase: Phase;
}