import Ably from "ably";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

export function getAblyRest() {
  const key = requireEnv("ABLY_API_KEY");
  return new Ably.Rest({ key });
}

export function roomChannelName(roomId: string) {
  return `room:${roomId}`;
}

