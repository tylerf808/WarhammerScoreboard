import { useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type { GameState, RoomState } from '../types/game';

export interface CreateOptions {
  includePrimary: boolean;
  includeSecondary: boolean;
  isAdmin: boolean;
}

// Connect to same host (works in dev via proxy and in production)
const URL = import.meta.env.DEV
  ? `http://${window.location.hostname}:3000`
  : window.location.origin;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [myRole, setMyRole] = useState<'attacker' | 'defender' | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = io(URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('room:created', (data: { code: string }) => setRoomCode(data.code));
    socket.on('room:joined', (data: { code: string }) => setRoomCode(data.code));
    socket.on('room:state', (state: RoomState) => setRoom(state));
    socket.on('game:state', (state: GameState) => setGame(state));
    socket.on('game:assigned', (data: { role: 'attacker' | 'defender' | null; isAdmin: boolean }) => {
      setMyRole(data.role);
      setIsAdmin(data.isAdmin);
    });
    socket.on('error', (msg: string) => {
      setError(msg);
      setTimeout(() => setError(null), 4000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const createRoom = useCallback((options: CreateOptions) => {
    // Set isAdmin immediately so LobbyScreen skips the name/faction form
    if (options.isAdmin) setIsAdmin(true);
    socketRef.current?.emit('room:create', options);
  }, []);

  const joinRoom = useCallback((code: string) => {
    socketRef.current?.emit('room:join', { code });
  }, []);

  const setInfo = useCallback((name: string, faction: string) => {
    socketRef.current?.emit('room:setInfo', { name, faction });
  }, []);

  const updateStat = useCallback((role: 'attacker' | 'defender', stat: 'cp' | 'vp', delta: number) => {
    socketRef.current?.emit('game:updateStat', { role, stat, delta });
  }, []);

  const nextTurn = useCallback(() => {
    socketRef.current?.emit('game:nextTurn');
  }, []);

  const resetGame = useCallback(() => {
    socketRef.current?.emit('game:reset');
  }, []);

  const endGame = useCallback(() => {
    socketRef.current?.emit('game:end');
    setGame(null);
    setMyRole(null);
    setIsAdmin(false);
    setRoom(null);
    setRoomCode(null);
  }, []);

  const selectPrimary = useCallback((missionId: string) => {
    socketRef.current?.emit('game:selectPrimary', { missionId });
  }, []);

  const setPlaystyle = useCallback((role: 'attacker' | 'defender', playstyle: 'tactical' | 'fixed') => {
    socketRef.current?.emit('game:setPlaystyle', { role, playstyle });
  }, []);

  const drawSecondary = useCallback((role: 'attacker' | 'defender') => {
    socketRef.current?.emit('game:drawSecondary', { role });
  }, []);

  const completeSecondary = useCallback((role: 'attacker' | 'defender', missionId: string) => {
    socketRef.current?.emit('game:completeSecondary', { role, missionId });
  }, []);

  const selectFixed = useCallback((role: 'attacker' | 'defender', missionId: string) => {
    socketRef.current?.emit('game:selectFixed', { role, missionId });
  }, []);

  const adminSetRound = useCallback((round: number) => {
    socketRef.current?.emit('game:adminSetRound', { round });
  }, []);

  const roll = useCallback(() => {
    socketRef.current?.emit('game:roll');
  }, []);

  const advancePhase = useCallback(() => {
    socketRef.current?.emit('game:advancePhase');
  }, []);

  return {
    connected,
    roomCode,
    room,
    game,
    myRole,
    isAdmin,
    error,
    createRoom,
    joinRoom,
    setInfo,
    updateStat,
    nextTurn,
    resetGame,
    endGame,
    selectPrimary,
    setPlaystyle,
    drawSecondary,
    completeSecondary,
    selectFixed,
    adminSetRound,
    roll,
    advancePhase,
  };
}
