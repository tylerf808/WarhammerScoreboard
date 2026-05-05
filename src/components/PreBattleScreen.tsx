import type { GameState } from '../types/game';

interface PreBattleScreenProps {
  game: GameState;
  roomCode: string;
  onAdvance: () => void;
}

export default function PreBattleScreen({ game, roomCode, onAdvance }: PreBattleScreenProps) {
  const firstPlayerName =
    game.currentTurn === 'attacker' ? game.attacker.name : game.defender.name;

  return (
    <div className="roll-phase">
      <h1 className="lobby-title">WARHAMMER 40K</h1>

      <div className="roll-phase-title">PRE-BATTLE</div>

      <div className="pre-battle-card">
        <p className="pre-battle-message">
          Resolve prebattle rules starting with{' '}
          <span className="pre-battle-name">{firstPlayerName}</span>.
        </p>
        <p className="pre-battle-first-player">
          <span className="pre-battle-name">{firstPlayerName}</span> goes first in battle.
        </p>
      </div>

      <button className="btn btn-next roll-advance-btn" onClick={onAdvance}>
        BEGIN BATTLE
      </button>

      <div className="game-code-display small" style={{ marginTop: 'auto' }}>
        <span className="game-code-label">GAME CODE</span>
        <span className="game-code-value">{roomCode}</span>
      </div>
    </div>
  );
}
