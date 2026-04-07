import { Server as IOServer } from "socket.io";
import { NextApiResponse } from "next";
import { Server as NetServer } from "net";

export type NextApiResponseServerIO = NextApiResponse & {
  socket: any & {
    server: NetServer & {
      io?: IOServer;
    };
  };
};