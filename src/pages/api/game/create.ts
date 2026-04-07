import type { NextApiRequest, NextApiResponse } from "next";
import type { Game } from "@/types/game";
import { publishRoomEvent } from "@/lib/ablyGameStore";
import { randomRoomId } from "@/lib/gameLogic";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { name, clientId } = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!clientId || typeof clientId !== "string") return res.status(400).json({ error: "Missing clientId" });
    if (!name || typeof name !== "string" || !name.trim()) return res.status(400).json({ error: "Missing name" });

    let roomId = "";
    // Collision is extremely unlikely; do a few attempts anyway.
    for (let i = 0; i < 6; i++) {
      roomId = randomRoomId();
      if (roomId) break;
    }

    const game: Game = {
      id: roomId,
      players: [{ id: clientId, name: name.trim(), code: "", guesses: [] }],
      turn: 0,
      phase: "lobby",
    };

    await publishRoomEvent(roomId, "state", game);
    return res.status(200).json({ roomId, game });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : "Failed to create game" });
  }
}

