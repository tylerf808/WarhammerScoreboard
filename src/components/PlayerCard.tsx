import type { PlayerState } from '../types/game';

interface PlayerCardProps {
  player: PlayerState;
  role: 'attacker' | 'defender';
  isActive: boolean;
  isWinner: boolean;
  readOnly?: boolean;
  onCpChange: (delta: number) => void;
  onVpChange: (delta: number) => void;
}

export default function PlayerCard({
  player,
  role,
  isActive,
  isWinner,
  readOnly = false,
  onCpChange,
  onVpChange,
}: PlayerCardProps) {
  return (
    <div className={`player-card ${role} ${isActive ? 'active' : ''} ${isWinner ? 'winner' : ''}`}>
      <div className="player-role">{role.toUpperCase()}</div>
      <div className="player-name">{player.name}</div>
      {player.faction && <div className="player-faction">{player.faction}</div>}

      <div className={`active-indicator ${isActive ? '' : 'hidden'}`}>⚔ ACTIVE TURN ⚔</div>

      <div className="stat-group">
        <div className="stat vp-stat">
          <span className="stat-label">Victory Points</span>
          <div className="stat-controls">
            {!readOnly && (
              <button onClick={() => onVpChange(-5)} disabled={player.vp <= 0}>
                −5
              </button>
            )}
            {!readOnly && (
              <button onClick={() => onVpChange(-1)} disabled={player.vp <= 0}>
                −
              </button>
            )}
            <span className="stat-value vp-value">{player.vp}</span>
            {!readOnly && <button onClick={() => onVpChange(1)}>+</button>}
            {!readOnly && <button onClick={() => onVpChange(5)}>+5</button>}
          </div>
        </div>

        <div className="stat cp-stat">
          <span className="stat-label">Command Points</span>
          <div className="stat-controls">
            {!readOnly && (
              <button onClick={() => onCpChange(-1)} disabled={player.cp <= 0}>
                −
              </button>
            )}
            <span className="stat-value cp-value">{player.cp}</span>
            {!readOnly && <button onClick={() => onCpChange(1)}>+</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
