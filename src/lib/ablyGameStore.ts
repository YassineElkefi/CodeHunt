import type { Game } from "@/types/game";
import { getAblyRest, roomChannelName } from "@/lib/ablyServer";

export type RoomEventName = "state" | "sessionEnded";

export async function publishRoomEvent(roomId: string, name: RoomEventName, data: unknown) {
  const ably = getAblyRest();
  await ably.channels.get(roomChannelName(roomId)).publish(name, data);
}

export async function loadLatestGameState(roomId: string): Promise<Game | null> {
  const ably = getAblyRest();
  const ch = ably.channels.get(roomChannelName(roomId));

  // Ably history returns newest-first by default. We look for the latest "state" message.
  const page = await ch.history({ limit: 25 });
  for (const msg of page.items) {
    if (msg.name === "state") return (msg.data ?? null) as Game | null;
  }
  return null;
}

