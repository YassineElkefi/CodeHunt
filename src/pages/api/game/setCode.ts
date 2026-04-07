import type { NextApiRequest, NextApiResponse } from "next";
import type { Game } from "@/types/game";
import { loadLatestGameState, publishRoomEvent } from "@/lib/ablyGameStore";
import { validateCode } from "@/lib/gameLogic";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { roomId, clientId, code } = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!roomId || typeof roomId !== "string") return res.status(400).json({ error: "Missing roomId" });
    if (!clientId || typeof clientId !== "string") return res.status(400).json({ error: "Missing clientId" });
    if (!code || typeof code !== "string") return res.status(400).json({ error: "Missing code" });

    const err = validateCode(code);
    if (err) return res.status(400).json({ error: err });

    const rid = roomId.trim().toUpperCase();
    const game = await loadLatestGameState(rid);
    if (!game) return res.status(404).json({ error: "Room not found" });

    const me = game.players.find((p) => p.id === clientId);
    if (!me) return res.status(403).json({ error: "Not in this room" });
    if (me.code) return res.status(400).json({ error: "Code already set" });

    const players = game.players.map((p) => (p.id === clientId ? { ...p, code } : p));
    const bothReady = players.length === 2 && players.every((p) => p.code);

    const next: Game = {
      ...game,
      players,
      phase: bothReady ? "play" : game.phase,
    };

    await publishRoomEvent(rid, "state", next);
    return res.status(200).json({ roomId: rid, game: next });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : "Failed to set code" });
  }
}

