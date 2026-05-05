// Shared event types between client and server

export interface GameOptions {
  includePrimary: boolean;
  includeSecondary: boolean;
}

export interface PlayerMissionState {
  playstyle: 'tactical' | 'fixed' | null;
  deck: string[];
  active: string[];
  discarded: string[];
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

export interface RoomPlayer {
  socketId: string | null;
  name: string;
  faction: string;
  role: 'attacker' | 'defender' | null;
  connected: boolean;
}

export interface RoomState {
  code: string;
  players: { name: string; faction: string; connected: boolean; role: 'attacker' | 'defender' | null }[];
  gameStarted: boolean;
}

// Client -> Server events
export interface ClientEvents {
  'room:create': (data: { includePrimary: boolean; includeSecondary: boolean; isAdmin: boolean }) => void;
  'room:join': (data: { code: string }) => void;
  'room:setInfo': (data: { name: string; faction: string }) => void;
  'game:updateStat': (data: { role: 'attacker' | 'defender'; stat: 'cp' | 'vp'; delta: number }) => void;
  'game:nextTurn': () => void;
  'game:reset': () => void;
  'game:end': () => void;
  'game:selectPrimary': (data: { missionId: string }) => void;
  'game:setPlaystyle': (data: { role: 'attacker' | 'defender'; playstyle: 'tactical' | 'fixed' }) => void;
  'game:drawSecondary': (data: { role: 'attacker' | 'defender' }) => void;
  'game:completeSecondary': (data: { role: 'attacker' | 'defender'; missionId: string }) => void;
  'game:selectFixed': (data: { role: 'attacker' | 'defender'; missionId: string }) => void;
  'game:adminSetRound': (data: { round: number }) => void;
  'game:roll': () => void;
  'game:advancePhase': () => void;
}

// Server -> Client events
export interface ServerEvents {
  'room:created': (data: { code: string }) => void;
  'room:joined': (data: { code: string }) => void;
  'room:state': (state: RoomState) => void;
  'game:assigned': (data: { role: 'attacker' | 'defender'; isAdmin: boolean }) => void;
  'game:state': (state: GameState) => void;
  'error': (msg: string) => void;
}
