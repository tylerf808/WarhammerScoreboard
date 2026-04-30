import { useState } from 'react';
import type { RoomState } from '../types/game';

interface LobbyScreenProps {
  onSetInfo: (name: string, faction: string) => void;
  room: RoomState | null;
  roomCode: string;
  error: string | null;
  isAdmin: boolean;
}

export default function LobbyScreen({ onSetInfo, room, roomCode, error, isAdmin }: LobbyScreenProps) {
  const [name, setName] = useState('');
  const [faction, setFaction] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !faction.trim()) return;
    onSetInfo(name.trim(), faction.trim());
    setSubmitted(true);
  };

  return (
    <div className="lobby-screen">
      <h1 className="lobby-title">WARHAMMER 40K</h1>
      <p className="lobby-subtitle">SCOREBOARD</p>

      <div className="game-code-display">
        <span className="game-code-label">GAME CODE</span>
        <span className="game-code-value">{roomCode}</span>
      </div>

      {error && <p className="lobby-error">{error}</p>}

      {!submitted && !isAdmin && (
        <form className="lobby-form" onSubmit={handleSubmit}>
          <div className="lobby-field">
            <label className="lobby-label" htmlFor="playerName">PLAYER NAME</label>
            <input
              id="playerName"
              className="lobby-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              placeholder="Enter your name"
              autoFocus
            />
          </div>
          <div className="lobby-field">
            <label className="lobby-label" htmlFor="playerFaction">FACTION</label>
            <input
              id="playerFaction"
              className="lobby-input"
              type="text"
              value={faction}
              onChange={(e) => setFaction(e.target.value)}
              maxLength={30}
              placeholder="e.g. Space Marines"
            />
          </div>
          <button
            className="btn btn-next lobby-join-btn"
            type="submit"
            disabled={!name.trim() || !faction.trim()}
          >
            READY
          </button>
        </form>
      )}

      {(submitted || isAdmin) && !room?.gameStarted && (
        <div className="lobby-waiting">
          <p className="lobby-status">{isAdmin ? 'Waiting for players...' : 'Waiting for opponent...'}</p>
          <div className="lobby-players">
            {room?.players.map((p, i) => (
              <div key={i} className="lobby-player-card">
                <span className="lobby-player-name">{p.name}</span>
                <span className="lobby-player-faction">{p.faction}</span>
              </div>
            ))}
          </div>
          <p className="lobby-share-hint">Share the code above with your opponent</p>
        </div>
      )}
    </div>
  );
}

