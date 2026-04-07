import type { NextApiRequest, NextApiResponse } from "next";
import { loadLatestGameState, publishRoomEvent } from "@/lib/ablyGameStore";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { roomId, clientId } = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!roomId || typeof roomId !== "string") return res.status(400).json({ error: "Missing roomId" });
    if (!clientId || typeof clientId !== "string") return res.status(400).json({ error: "Missing clientId" });

    const rid = roomId.trim().toUpperCase();
    const game = await loadLatestGameState(rid);
    if (!game) return res.status(200).json({ ok: true });

    const remaining = game.players.filter((p) => p.id !== clientId);
    await publishRoomEvent(rid, "sessionEnded", { reason: "opponent_left", leaverId: clientId });

    if (remaining.length === 0) {
      // Publish a null state as a tombstone.
      await publishRoomEvent(rid, "state", null);
      return res.status(200).json({ ok: true });
    }

    const next = { ...game, players: remaining };
    await publishRoomEvent(rid, "state", next);
    return res.status(200).json({ ok: true });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : "Failed to leave game" });
  }
}

