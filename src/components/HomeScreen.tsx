import { useState } from 'react';

export interface CreateOptions {
  includePrimary: boolean;
  includeSecondary: boolean;
  isAdmin: boolean;
}

interface HomeScreenProps {
  connected: boolean;
  error: string | null;
  onCreate: (options: CreateOptions) => void;
  onJoin: () => void;
}

export default function HomeScreen({ connected, error, onCreate, onJoin }: HomeScreenProps) {
  const [includePrimary, setIncludePrimary] = useState(true);
  const [includeSecondary, setIncludeSecondary] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const handleCreate = () => {
    onCreate({ includePrimary, includeSecondary, isAdmin });
  };

  return (
    <div className="lobby-screen">
      <h1 className="lobby-title">WARHAMMER 40K</h1>
      <p className="lobby-subtitle">SCOREBOARD</p>

      {!connected && <p className="lobby-status">Connecting to server...</p>}
      {error && <p className="lobby-error">{error}</p>}

      {connected && (
        <>
          <div className="game-options">
            <p className="game-options-label">GAME OPTIONS</p>
            <label className="game-option-row">
              <input
                type="checkbox"
                checked={includePrimary}
                onChange={(e) => setIncludePrimary(e.target.checked)}
              />
              <span>Include Primary Missions</span>
            </label>
            <label className="game-option-row">
              <input
                type="checkbox"
                checked={includeSecondary}
                onChange={(e) => setIncludeSecondary(e.target.checked)}
              />
              <span>Include Secondary Missions</span>
            </label>
            <label className="game-option-row">
              <input
                type="checkbox"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
              />
              <span>Join as Admin (scorekeeper)</span>
            </label>
          </div>

          <div className="home-buttons">
            <button className="btn btn-next home-btn" onClick={handleCreate}>
              CREATE GAME
            </button>
            <button className="btn btn-next home-btn" onClick={onJoin}>
              JOIN GAME
            </button>
          </div>
        </>
      )}
    </div>
  );
}
