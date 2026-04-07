import { Server } from "socket.io";
import { NextApiRequest } from "next";
import { NextApiResponseServerIO } from "@/types/next";

interface GuessResult { guess: string; bulls: number; cows: number; }
interface Player { id: string; name: string; code: string; guesses: GuessResult[]; }
interface Game { players: Player[]; turn: number; winner?: string; phase: "lobby" | "code" | "play" | "done"; }

const games: Record<string, Game> = {};

function notifySessionEndedForRemaining(io: Server, game: Game, leaverId: string) {
  for (const p of game.players) {
    if (p.id !== leaverId) {
      io.to(p.id).emit("playerLeft", {});
      io.to(p.id).emit("sessionEnded", { reason: "opponent_left" });
    }
  }
}

function removePlayerFromGames(io: Server, socketId: string) {
  for (const [roomId, game] of Object.entries(games)) {
    const existed = game.players.some((p) => p.id === socketId);
    if (existed) {
      notifySessionEndedForRemaining(io, game, socketId);
      game.players = game.players.filter((p) => p.id !== socketId);
      if (game.players.length === 0) {
        delete games[roomId];
      }
    }
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (!res.socket.server.io) {
    console.log("Initializing Socket.io server...");
    const io = new Server(res.socket.server, {
      path: "/api/socket",
      cors: {
        origin: "*",
      },
    });

    io.on("connection", (socket) => {
      console.log("connected", socket.id);

      socket.on("createGame", ({ name }: { name: string }) => {
        let roomId = "";
        do {
          roomId = Math.random().toString(36).substring(2, 7).toUpperCase();
        } while (games[roomId]);

        games[roomId] = {
          players: [{ id: socket.id, name, guesses: [], code: "" }],
          turn: 0,
          phase: "lobby",
        };
        socket.join(roomId);
        // Tell the creator their room ID and the current game state
        socket.emit("gameCreated", { roomId, game: games[roomId] });
      });

      socket.on("joinGame", ({ roomId, name }: { roomId: string; name: string }) => {
        const game = games[roomId];
        if (!game) return socket.emit("gameError", { message: "Room not found" });
        if (game.players.length >= 2) return socket.emit("gameError", { message: "Room is full" });
        if (game.phase !== "lobby") return socket.emit("gameError", { message: "Game already started" });

        game.players.push({ id: socket.id, name, guesses: [], code: "" });
        game.phase = "code";
        socket.join(roomId);
        // Emit to ALL players in the room (both host and joiner)
        io.to(roomId).emit("gameStarted", { game, roomId });
      });

      socket.on("setCode", ({ roomId, code }: { roomId: string; code: string }) => {
        const game = games[roomId];
        if (!game) return;
        const player = game.players.find((p) => p.id === socket.id);
        if (!player || player.code) return; // already set

        player.code = code;

        // Check if both players have set their codes
        if (game.players.every((p) => p.code)) {
          game.phase = "play";
          io.to(roomId).emit("playPhase", { game });
        } else {
          io.to(roomId).emit("codeSet", { game });
        }
      });

      socket.on("makeGuess", ({ roomId, guess }: { roomId: string; guess: string }) => {
        const game = games[roomId];
        if (!game || game.phase !== "play") return;

        const currentPlayer = game.players[game.turn];
        if (currentPlayer.id !== socket.id) return;

        const opponent = game.players.find((p) => p.id !== socket.id)!;
        const bulls = countBulls(opponent.code, guess);
        const cows = countCows(opponent.code, guess);
        currentPlayer.guesses.push({ guess, bulls, cows });

        if (bulls === 4) {
          game.winner = socket.id;
          game.phase = "done";
        } else {
          game.turn = (game.turn + 1) % 2;
        }

        io.to(roomId).emit("updateGame", { game });
      });

      socket.on("leaveGame", ({ roomId }: { roomId?: string }) => {
        if (roomId) {
          const game = games[roomId];
          if (!game) return;
          notifySessionEndedForRemaining(io, game, socket.id);
          game.players = game.players.filter((p) => p.id !== socket.id);
          socket.leave(roomId);
          if (game.players.length === 0) {
            delete games[roomId];
          }
          return;
        }
        // Fallback for older clients that do not send roomId.
        removePlayerFromGames(io, socket.id);
      });

      socket.on("disconnect", () => {
        removePlayerFromGames(io, socket.id);
      });
    });

    res.socket.server.io = io;
  }
  res.end();
}

function countBulls(code: string, guess: string) {
  let bulls = 0;
  for (let i = 0; i < 4; i++) if (code[i] === guess[i]) bulls++;
  return bulls;
}

function countCows(code: string, guess: string) {
  let cows = 0;
  for (let i = 0; i < 4; i++) {
    if (code[i] !== guess[i] && code.includes(guess[i])) cows++;
  }
  return cows;
}