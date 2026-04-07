import type { NextApiRequest, NextApiResponse } from "next";
import { getAblyRest } from "@/lib/ablyServer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const clientId = typeof req.query.clientId === "string" ? req.query.clientId : "";
    if (!clientId) return res.status(400).json({ error: "Missing clientId" });

    const ably = getAblyRest();
    const tokenRequest = await ably.auth.createTokenRequest({ clientId });
    return res.status(200).json(tokenRequest);
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : "Failed to create token request" });
  }
}

