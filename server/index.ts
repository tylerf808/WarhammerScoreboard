import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import type { GameState, GameOptions, PlayerState, RoomPlayer, RoomState, ClientEvents, ServerEvents } from './shared.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientEvents, ServerEvents>(httpServer, {
  cors: { origin: '*' },
});

// Serve built frontend
app.use(express.static(path.join(__dirname, '..', 'dist')));
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

// ── Game helpers ────────────────────────────────────────────

function buildInitialDeck(): string[] {
  return [
    'behind-enemy-lines', 'storm-hostile-objective', 'engage-on-all-fronts',
    'establish-locus', 'cleanse', 'assassination', 'no-prisoners',
    'cull-the-horde', 'bring-it-down', 'defend-stronghold',
    'marked-for-death', 'secure-no-mans-land', 'sabotage',
    'area-denial', 'recover-assets', 'a-tempting-target',
    'extend-battle-lines', 'overwhelming-force', 'display-of-might',
  ];
}

function makePlayer(name: string, faction: string): PlayerState {
  return {
    name, faction, cp: 1, vp: 0,
    missions: { playstyle: null, deck: buildInitialDeck(), active: [], discarded: [] },
  };
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ── Room system ─────────────────────────────────────────────

interface GameRoom {
  code: string;
  players: [RoomPlayer | null, RoomPlayer | null];
  game: GameState | null;
  adminSocketId: string | null;
  admin: RoomPlayer | null;
  options: GameOptions;
}

const rooms = new Map<string, GameRoom>();
// Maps socketId -> room code for quick lookup
const socketToRoom = new Map<string, string>();

function getRoomForSocket(socketId: string): GameRoom | null {
  const code = socketToRoom.get(socketId);
  return code ? rooms.get(code) ?? null : null;
}

function getRoleForSocket(room: GameRoom, socketId: string): 'attacker' | 'defender' | null {
  for (const p of room.players) {
    if (p?.socketId === socketId) return p.role;
  }
  return null;
}

function toRoomState(room: GameRoom): RoomState {
  return {
    code: room.code,
    players: room.players
      .filter((p): p is RoomPlayer => p !== null && p.name !== '')
      .map((p) => ({ name: p.name, faction: p.faction, connected: p.connected, role: p.role })),
    gameStarted: room.game !== null,
  };
}

function broadcastRoom(room: GameRoom) {
  const state = toRoomState(room);
  for (const p of room.players) {
    if (p?.socketId && p.connected) {
      io.to(p.socketId).emit('room:state', state);
    }
  }
  if (room.admin?.socketId && room.admin.connected) {
    io.to(room.admin.socketId).emit('room:state', state);
  }
}

function broadcastGame(room: GameRoom) {
  if (!room.game) return;
  for (const p of room.players) {
    if (p?.socketId && p.connected) {
      io.to(p.socketId).emit('game:state', room.game);
    }
  }
  if (room.admin?.socketId && room.admin.connected) {
    io.to(room.admin.socketId).emit('game:state', room.game);
  }
}

function tryStartGame(room: GameRoom) {
  // Need exactly 2 players with name set
  const ready = room.players.filter(
    (p): p is RoomPlayer => p !== null && p.name !== '' && p.connected
  );
  if (ready.length !== 2 || room.game !== null) return;

  // Assign slots: p0 = attacker slot, p1 = defender slot (rolls determine final roles)
  ready[0].role = 'attacker';
  ready[1].role = 'defender';

  room.game = {
    phase: 'roll-attacker',
    rolls: { attacker: null, defender: null },
    battleRound: 1,
    currentTurn: 'attacker',
    firstTurn: 'attacker',
    attacker: makePlayer(ready[0].name, ready[0].faction),
    defender: makePlayer(ready[1].name, ready[1].faction),
    maxRounds: 5,
    gameOver: false,
    primaryMissionId: null,
    options: room.options,
  };

  for (const p of ready) {
    if (p.socketId) {
      io.to(p.socketId).emit('game:assigned', { role: p.role!, isAdmin: false });
    }
  }
  // Notify admin spectator that the game has started
  if (room.admin?.socketId && room.admin.connected) {
    io.to(room.admin.socketId).emit('game:assigned', { role: null, isAdmin: true });
  }

  broadcastRoom(room);
  broadcastGame(room);
}

// ── Socket handlers ─────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);

  // ── Room events ───────────────────────────────────────────

  socket.on('room:create', ({ includePrimary, includeSecondary, isAdmin }) => {
    // Don't allow if already in a room
    if (socketToRoom.has(socket.id)) {
      socket.emit('error', 'Already in a room');
      return;
    }
    let code: string;
    do { code = generateCode(); } while (rooms.has(code));

    const room: GameRoom = {
      code,
      players: isAdmin
        ? [null, null]
        : [{ socketId: socket.id, name: '', faction: '', role: null, connected: true }, null],
      game: null,
      adminSocketId: isAdmin ? socket.id : null,
      admin: isAdmin
        ? { socketId: socket.id, name: 'Admin', faction: 'Spectator', role: null, connected: true }
        : null,
      options: { includePrimary, includeSecondary },
    };
    rooms.set(code, room);
    socketToRoom.set(socket.id, code);

    socket.emit('room:created', { code });
    broadcastRoom(room);
    console.log(`[room:create] ${socket.id} created room ${code}`);
  });

  socket.on('room:join', ({ code }) => {
    const upperCode = code.toUpperCase().trim();
    const room = rooms.get(upperCode);

    if (!room) {
      socket.emit('error', 'Invalid game code');
      return;
    }

    // Check if this socket is already in this room as a player (same socketId)
    const existingSlot = room.players.find((p) => p?.socketId === socket.id);
    if (existingSlot) {
      existingSlot.connected = true;
      socketToRoom.set(socket.id, upperCode);
      socket.emit('room:joined', { code: upperCode });
      if (room.game && existingSlot.role) {
        socket.emit('game:assigned', { role: existingSlot.role, isAdmin: false });
        socket.emit('game:state', room.game);
      }
      broadcastRoom(room);
      return;
    }

    // Check if this socket is already the admin (same socketId)
    if (room.admin?.socketId === socket.id) {
      room.admin.connected = true;
      socketToRoom.set(socket.id, upperCode);
      socket.emit('room:joined', { code: upperCode });
      if (room.game) {
        socket.emit('game:assigned', { role: null, isAdmin: true });
        socket.emit('game:state', room.game);
      }
      broadcastRoom(room);
      return;
    }

    // Check for a disconnected player slot to take over (player reconnecting with new socket)
    const disconnected = room.players.find((p) => p !== null && !p.connected);
    if (disconnected) {
      const oldSocketId = disconnected.socketId;
      if (oldSocketId) socketToRoom.delete(oldSocketId);
      disconnected.socketId = socket.id;
      disconnected.connected = true;
      socketToRoom.set(socket.id, upperCode);
      socket.emit('room:joined', { code: upperCode });
      if (room.game && disconnected.role) {
        socket.emit('game:assigned', { role: disconnected.role, isAdmin: false });
        socket.emit('game:state', room.game);
      }
      broadcastRoom(room);
      console.log(`[room:join] ${socket.id} reconnected to room ${upperCode}`);
      return;
    }

    // Check for a disconnected admin slot to take over (admin reconnecting with new socket)
    if (room.admin && !room.admin.connected) {
      const oldSocketId = room.admin.socketId;
      if (oldSocketId) socketToRoom.delete(oldSocketId);
      room.admin.socketId = socket.id;
      room.admin.connected = true;
      room.adminSocketId = socket.id;
      socketToRoom.set(socket.id, upperCode);
      socket.emit('room:joined', { code: upperCode });
      if (room.game) {
        socket.emit('game:assigned', { role: null, isAdmin: true });
        socket.emit('game:state', room.game);
      }
      broadcastRoom(room);
      console.log(`[room:join] ${socket.id} admin reconnected to room ${upperCode}`);
      return;
    }

    // Check for an empty player slot (new player joining)
    const emptyIdx = room.players.indexOf(null);
    if (emptyIdx === -1) {
      socket.emit('error', 'Game is full');
      return;
    }

    if (socketToRoom.has(socket.id)) {
      socket.emit('error', 'Already in a room');
      return;
    }

    room.players[emptyIdx] = {
      socketId: socket.id, name: '', faction: '', role: null, connected: true,
    };
    socketToRoom.set(socket.id, upperCode);

    socket.emit('room:joined', { code: upperCode });
    broadcastRoom(room);
    console.log(`[room:join] ${socket.id} joined room ${upperCode}`);
  });

  socket.on('room:setInfo', ({ name, faction }) => {
    const room = getRoomForSocket(socket.id);
    if (!room) { socket.emit('error', 'Not in a room'); return; }

    // Admin is a spectator, not a player — ignore setInfo
    if (socket.id === room.adminSocketId) return;

    const player = room.players.find((p) => p?.socketId === socket.id);
    if (!player) return;

    player.name = name;
    player.faction = faction;

    broadcastRoom(room);
    tryStartGame(room);
  });

  // ── Game action events ────────────────────────────────────

  socket.on('game:updateStat', ({ role, stat, delta }) => {
    const room = getRoomForSocket(socket.id);
    if (!room?.game) return;
    const myRole = getRoleForSocket(room, socket.id);
    const isAdmin = socket.id === room.adminSocketId;
    if (!isAdmin && myRole !== role) {
      socket.emit('error', 'Cannot modify opponent stats');
      return;
    }
    room.game[role][stat] = Math.max(0, room.game[role][stat] + delta);
    broadcastGame(room);
  });

  socket.on('game:nextTurn', () => {
    const room = getRoomForSocket(socket.id);
    if (!room?.game || room.game.gameOver) return;
    const myRole = getRoleForSocket(room, socket.id);
    const isAdmin = socket.id === room.adminSocketId;
    if (!isAdmin && myRole !== room.game.currentTurn) {
      socket.emit('error', 'Not your turn');
      return;
    }

    room.game.attacker.cp += 1;
    room.game.defender.cp += 1;

    const { firstTurn } = room.game;
    const secondTurn: 'attacker' | 'defender' = firstTurn === 'attacker' ? 'defender' : 'attacker';

    if (room.game.currentTurn !== secondTurn) {
      // First player just ended — move to second player
      room.game.currentTurn = secondTurn;
    } else {
      // Second player just ended — advance round, back to first player
      const nextRound = room.game.battleRound + 1;
      if (nextRound > room.game.maxRounds) {
        room.game.gameOver = true;
      } else {
        room.game.battleRound = nextRound;
        room.game.currentTurn = firstTurn;
      }
    }
    broadcastGame(room);
  });

  socket.on('game:reset', () => {
    const room = getRoomForSocket(socket.id);
    if (!room?.game) return;

    const p0 = room.players[0];
    const p1 = room.players[1];
    if (!p0 || !p1) return;

    const firstTurnReset = room.game.firstTurn;
    room.game = {
      phase: 'battle',
      rolls: { attacker: null, defender: null },
      battleRound: 1,
      currentTurn: firstTurnReset,
      firstTurn: firstTurnReset,
      attacker: makePlayer(
        (p0.role === 'attacker' ? p0 : p1).name,
        (p0.role === 'attacker' ? p0 : p1).faction,
      ),
      defender: makePlayer(
        (p0.role === 'defender' ? p0 : p1).name,
        (p0.role === 'defender' ? p0 : p1).faction,
      ),
      maxRounds: 5,
      gameOver: false,
      primaryMissionId: null,
      options: room.options,
    };
    broadcastGame(room);
  });

  socket.on('game:roll', () => {
    const room = getRoomForSocket(socket.id);
    if (!room?.game) return;
    const { phase } = room.game;
    if (phase !== 'roll-attacker' && phase !== 'roll-first') return;

    const myRole = getRoleForSocket(room, socket.id);
    if (!myRole) return; // admin cannot roll

    const { attacker: aRoll, defender: dRoll } = room.game.rolls;
    // If both rolled and tied, reset so both can roll again
    if (aRoll !== null && dRoll !== null && aRoll === dRoll) {
      room.game.rolls = { attacker: null, defender: null };
    }

    if (room.game.rolls[myRole] !== null) return; // already rolled

    room.game.rolls[myRole] = Math.floor(Math.random() * 6) + 1;

    // Check if both have now rolled
    const newA = room.game.rolls.attacker;
    const newD = room.game.rolls.defender;
    if (newA !== null && newD !== null && newA !== newD && phase === 'roll-attacker') {
      if (newD > newA) {
        // Defender slot rolled higher — they become the real attacker; swap player data and roles
        const tmpPlayer = room.game.attacker;
        room.game.attacker = room.game.defender;
        room.game.defender = tmpPlayer;
        room.game.rolls = { attacker: newD, defender: newA };
        for (const p of room.players) {
          if (p) p.role = p.role === 'attacker' ? 'defender' : 'attacker';
        }
        // Re-send updated roles to each player
        for (const p of room.players) {
          if (p?.socketId && p.connected && p.role) {
            io.to(p.socketId).emit('game:assigned', { role: p.role, isAdmin: false });
          }
        }
      }
      // else attacker slot already has higher roll — no change needed
    }

    broadcastGame(room);
  });

  socket.on('game:advancePhase', () => {
    const room = getRoomForSocket(socket.id);
    if (!room?.game) return;
    const myRole = getRoleForSocket(room, socket.id);
    const isAdmin = socket.id === room.adminSocketId;
    if (!myRole && !isAdmin) return;

    const { phase, rolls } = room.game;
    if (phase === 'roll-attacker') {
      if (rolls.attacker === null || rolls.defender === null || rolls.attacker === rolls.defender) return;
      room.game.phase = 'roll-first';
      room.game.rolls = { attacker: null, defender: null };
    } else if (phase === 'roll-first') {
      if (rolls.attacker === null || rolls.defender === null || rolls.attacker === rolls.defender) return;
      const first: 'attacker' | 'defender' = rolls.attacker > rolls.defender ? 'attacker' : 'defender';
      room.game.currentTurn = first;
      room.game.firstTurn = first;
      room.game.phase = 'pre-battle';
      room.game.rolls = { attacker: null, defender: null };
    } else if (phase === 'pre-battle') {
      room.game.phase = 'battle';
    }

    broadcastGame(room);
  });

  socket.on('game:adminSetRound', ({ round }) => {
    const room = getRoomForSocket(socket.id);
    if (!room?.game) return;
    if (socket.id !== room.adminSocketId) return;
    const clamped = Math.max(1, Math.min(room.game.maxRounds, round));
    room.game.battleRound = clamped;
    room.game.gameOver = false;
    broadcastGame(room);
  });

  socket.on('game:end', () => {
    const room = getRoomForSocket(socket.id);
    if (!room) return;

    // Clean up: remove room and all socket mappings
    for (const p of room.players) {
      if (p?.socketId) socketToRoom.delete(p.socketId);
    }
    if (room.admin?.socketId) socketToRoom.delete(room.admin.socketId);
    rooms.delete(room.code);
    console.log(`[game:end] Room ${room.code} deleted`);
  });

  socket.on('game:selectPrimary', ({ missionId }) => {
    const room = getRoomForSocket(socket.id);
    if (!room?.game) return;
    room.game.primaryMissionId = missionId;
    broadcastGame(room);
  });

  socket.on('game:setPlaystyle', ({ role, playstyle }) => {
    const room = getRoomForSocket(socket.id);
    if (!room?.game) return;
    const myRole = getRoleForSocket(room, socket.id);
    if (myRole !== role) return;

    const missions = room.game[role].missions;
    missions.playstyle = playstyle;

    if (playstyle === 'tactical') {
      const drawn: string[] = [];
      for (let i = 0; i < 2 && missions.deck.length > 0; i++) {
        const idx = Math.floor(Math.random() * missions.deck.length);
        drawn.push(missions.deck.splice(idx, 1)[0]);
      }
      missions.active = drawn;
    }
    broadcastGame(room);
  });

  socket.on('game:drawSecondary', ({ role }) => {
    const room = getRoomForSocket(socket.id);
    if (!room?.game) return;
    const myRole = getRoleForSocket(room, socket.id);
    if (myRole !== role) return;

    const missions = room.game[role].missions;
    if (missions.active.length >= 2 || missions.deck.length === 0) return;

    const idx = Math.floor(Math.random() * missions.deck.length);
    missions.active.push(missions.deck.splice(idx, 1)[0]);
    broadcastGame(room);
  });

  socket.on('game:completeSecondary', ({ role, missionId }) => {
    const room = getRoomForSocket(socket.id);
    if (!room?.game) return;
    const myRole = getRoleForSocket(room, socket.id);
    if (myRole !== role) return;

    const missions = room.game[role].missions;
    missions.active = missions.active.filter((id) => id !== missionId);
    missions.discarded.push(missionId);

    if (missions.playstyle === 'tactical' && missions.deck.length > 0) {
      const idx = Math.floor(Math.random() * missions.deck.length);
      missions.active.push(missions.deck.splice(idx, 1)[0]);
    }
    broadcastGame(room);
  });

  socket.on('game:selectFixed', ({ role, missionId }) => {
    const room = getRoomForSocket(socket.id);
    if (!room?.game) return;
    const myRole = getRoleForSocket(room, socket.id);
    if (myRole !== role) return;

    const missions = room.game[role].missions;
    if (missions.active.length >= 2 || missions.active.includes(missionId)) return;
    missions.active.push(missionId);
    broadcastGame(room);
  });

  // ── Disconnect ────────────────────────────────────────────

  socket.on('disconnect', () => {
    console.log(`[disconnect] ${socket.id}`);
    const room = getRoomForSocket(socket.id);
    if (room) {
      const player = room.players.find((p) => p?.socketId === socket.id);
      if (player) player.connected = false;
      if (room.admin?.socketId === socket.id) room.admin.connected = false;
      socketToRoom.delete(socket.id);
      broadcastRoom(room);
    }
  });
});

// ── Start ───────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? '3000', 10);
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
