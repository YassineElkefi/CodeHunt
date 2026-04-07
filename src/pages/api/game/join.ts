import type { NextApiRequest, NextApiResponse } from "next";
import type { Game } from "@/types/game";
import { loadLatestGameState, publishRoomEvent } from "@/lib/ablyGameStore";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { roomId, name, clientId } = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!roomId || typeof roomId !== "string") return res.status(400).json({ error: "Missing roomId" });
    if (!clientId || typeof clientId !== "string") return res.status(400).json({ error: "Missing clientId" });
    if (!name || typeof name !== "string" || !name.trim()) return res.status(400).json({ error: "Missing name" });

    const rid = roomId.trim().toUpperCase();
    const game = await loadLatestGameState(rid);
    if (!game) return res.status(404).json({ error: "Room not found" });

    if (game.players.some((p) => p.id === clientId)) {
      // Re-join (refresh). Return current state.
      return res.status(200).json({ roomId: rid, game });
    }

    if (game.players.length >= 2) return res.status(400).json({ error: "Room is full" });
    if (game.phase !== "lobby") return res.status(400).json({ error: "Game already started" });

    const next: Game = {
      ...game,
      players: [...game.players, { id: clientId, name: name.trim(), code: "", guesses: [] }],
      phase: "code",
    };

    await publishRoomEvent(rid, "state", next);
    return res.status(200).json({ roomId: rid, game: next });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : "Failed to join game" });
  }
}

