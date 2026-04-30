import { useState } from 'react';

interface JoinScreenProps {
  connected: boolean;
  error: string | null;
  onJoin: (code: string) => void;
  onBack: () => void;
}

export default function JoinScreen({ connected, error, onJoin, onBack }: JoinScreenProps) {
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 4) return;
    onJoin(trimmed);
  };

  return (
    <div className="lobby-screen">
      <h1 className="lobby-title">WARHAMMER 40K</h1>
      <p className="lobby-subtitle">SCOREBOARD</p>

      {!connected && <p className="lobby-status">Connecting to server...</p>}
      {error && <p className="lobby-error">{error}</p>}

      {connected && (
        <form className="lobby-form" onSubmit={handleSubmit}>
          <div className="lobby-field">
            <label className="lobby-label" htmlFor="gameCode">GAME CODE</label>
            <input
              id="gameCode"
              className="lobby-input game-code-input"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
              maxLength={4}
              placeholder="XXXX"
              autoFocus
              autoComplete="off"
            />
          </div>
          <button
            className="btn btn-next lobby-join-btn"
            type="submit"
            disabled={code.trim().length !== 4}
          >
            JOIN
          </button>
          <button className="btn btn-reset lobby-back-btn" type="button" onClick={onBack}>
            BACK
          </button>
        </form>
      )}
    </div>
  );
}
