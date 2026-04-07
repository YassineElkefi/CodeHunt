import type { NextApiRequest, NextApiResponse } from "next";
import type { Game } from "@/types/game";
import { loadLatestGameState, publishRoomEvent } from "@/lib/ablyGameStore";
import { countBulls, countCows, validateCode } from "@/lib/gameLogic";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { roomId, clientId, guess } = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!roomId || typeof roomId !== "string") return res.status(400).json({ error: "Missing roomId" });
    if (!clientId || typeof clientId !== "string") return res.status(400).json({ error: "Missing clientId" });
    if (!guess || typeof guess !== "string") return res.status(400).json({ error: "Missing guess" });

    const err = validateCode(guess);
    if (err) return res.status(400).json({ error: err });

    const rid = roomId.trim().toUpperCase();
    const game = await loadLatestGameState(rid);
    if (!game) return res.status(404).json({ error: "Room not found" });
    if (game.phase !== "play") return res.status(400).json({ error: "Game is not in play phase" });

    const current = game.players[game.turn];
    if (!current || current.id !== clientId) return res.status(403).json({ error: "Not your turn" });

    const opponent = game.players.find((p) => p.id !== clientId);
    if (!opponent?.code) return res.status(400).json({ error: "Opponent code not set" });

    const bulls = countBulls(opponent.code, guess);
    const cows = countCows(opponent.code, guess);

    const players = game.players.map((p) =>
      p.id === clientId ? { ...p, guesses: [...p.guesses, { guess, bulls, cows }] } : p
    );

    const won = bulls === 4;
    const next: Game = {
      ...game,
      players,
      winner: won ? clientId : game.winner,
      phase: won ? "done" : game.phase,
      turn: won ? game.turn : (game.turn + 1) % 2,
    };

    await publishRoomEvent(rid, "state", next);
    return res.status(200).json({ roomId: rid, game: next });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : "Failed to submit guess" });
  }
}

