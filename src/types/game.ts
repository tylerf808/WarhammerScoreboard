import type { PlayerMissionState } from './missions';

export interface GameOptions {
  includePrimary: boolean;
  includeSecondary: boolean;
}

export interface PlayerState {
  name: string;
  faction: string;
  cp: number;
  vp: number;
  missions: PlayerMissionState;
}

export interface GameState {
  phase: 'roll-attacker' | 'roll-first' | 'pre-battle' | 'battle';
  rolls: { attacker: number | null; defender: number | null };
  battleRound: number;
  currentTurn: 'attacker' | 'defender';
  firstTurn: 'attacker' | 'defender';
  attacker: PlayerState;
  defender: PlayerState;
  maxRounds: number;
  gameOver: boolean;
  primaryMissionId: string | null;
  options: GameOptions;
}

export interface RoomState {
  code: string;
  players: { name: string; faction: string; connected: boolean; role: 'attacker' | 'defender' | null }[];
  gameStarted: boolean;
}
