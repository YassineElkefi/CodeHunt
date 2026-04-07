"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as Ably from "ably";

type RealtimeContextValue = {
  clientId: string | null;
  realtime: Ably.Realtime | null;
  isConnected: boolean;
};

const RealtimeContext = createContext<RealtimeContextValue>({
  clientId: null,
  realtime: null,
  isConnected: false,
});

function getOrCreateClientId() {
  const key = "codehunt.clientId";
  const existing = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  if (existing) return existing;
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  window.localStorage.setItem(key, id);
  return id;
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [clientId] = useState<string | null>(() => (typeof window === "undefined" ? null : getOrCreateClientId()));
  const [isConnected, setIsConnected] = useState(false);

  const realtime = useMemo(() => {
    if (!clientId) return null;
    return new Ably.Realtime({
      authUrl: `/api/ably-token?clientId=${encodeURIComponent(clientId)}`,
    });
  }, [clientId]);

  useEffect(() => {
    if (!realtime) return;

    const onConnected = () => setIsConnected(true);
    const onDisconnected = () => setIsConnected(false);

    realtime.connection.on("connected", onConnected);
    realtime.connection.on("disconnected", onDisconnected);
    realtime.connection.on("failed", onDisconnected);

    return () => {
      realtime.connection.off("connected", onConnected);
      realtime.connection.off("disconnected", onDisconnected);
      realtime.connection.off("failed", onDisconnected);
      realtime.close();
    };
  }, [realtime]);

  const value = useMemo(() => ({ clientId, realtime, isConnected }), [clientId, realtime, isConnected]);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  return useContext(RealtimeContext);
}

