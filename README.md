# CodeHunt

CodeHunt is a real-time 2-player code deduction game (Bulls and Cows style), built with Next.js and Socket.IO.

Players create/join a room, set a secret 4-digit code, and take turns guessing until one player gets all 4 exact digits.

## Features

- Real-time multiplayer room system via Socket.IO
- Create room / Join room by code
- Turn-based gameplay with live updates
- Secret code locking phase for both players
- Guess feedback (`Bulls` and `Cows` style)
- Leave-game handling with session-end modal for opponent
- Light/Dark theme toggle
- App-wide footer and in-app rules/help

## Game Rules

- Secret code must be exactly 4 digits
- Digits can be `0-9`
- Digits must be unique (no repeats)
- Code cannot start with `0`
- Players alternate turns
- First player to get 4 exact matches wins

### Feedback Meaning

- **Bull (exact):** correct digit in the correct position
- **Cow (misplaced):** correct digit in the wrong position

## Tech Stack

- [Next.js](https://nextjs.org/) (App Router + Pages API route for socket server)
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Socket.IO](https://socket.io/)
- [Tailwind CSS](https://tailwindcss.com/)

## Project Structure

```text
src/
  app/
    page.tsx                  # Home screen (create/join game)
    game/[roomId]/page.tsx    # Game room UI and gameplay flow
    layout.tsx                # Global providers + app footer
    globals.css               # Theme tokens and global styles
  context/
    SocketContext.tsx         # Socket connection lifecycle
    ThemeContext.tsx          # Light/dark theme state
  components/
    ThemeToggle.tsx           # Theme toggle button
  pages/api/
    socket.ts                 # Socket.IO server events/game state
  types/
    game.ts
    next.d.ts
```

## Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 3) Lint

```bash
npm run lint
```

## How to Play Locally

1. Open the app in two browser tabs (or two different browsers).
2. In tab A, enter your name and click **Create a game**.
3. Copy the room code.
4. In tab B, enter a name, paste code, and click **Join**.
5. Both players lock their secret code.
6. Take turns guessing until someone wins.

## Socket Events (Overview)

### Client -> Server

- `createGame`
- `joinGame`
- `setCode`
- `makeGuess`
- `leaveGame`

### Server -> Client

- `gameCreated`
- `gameStarted`
- `codeSet`
- `playPhase`
- `updateGame`
- `playerLeft`
- `sessionEnded`
- `gameError`

## Notes

- Room state is currently in-memory in the API route process.
- Restarting the dev server resets active rooms.

## Scripts

- `npm run dev` - run development server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - run ESLint
