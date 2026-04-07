"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";

interface SocketContextProps {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextProps>({ socket: null, isConnected: false });

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let active = true;
    let s: Socket | null = null;

    const connect = async () => {
      // Ensure API route initializes socket server before client connects.
      await fetch("/api/socket");
      s = io(window.location.origin, { path: "/api/socket", transports: ["websocket", "polling"] });
      if (!active) {
        s.disconnect();
        return;
      }
      setSocket(s);
      s.on("connect", () => setIsConnected(true));
      s.on("disconnect", () => setIsConnected(false));
    };

    void connect();

    return () => {
      active = false;
      if (s) {
        s.disconnect();
      }
    };
  }, []);

  return <SocketContext.Provider value={{ socket, isConnected }}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);