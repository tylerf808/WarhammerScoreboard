import type { GameState } from '../types/game';

interface RollPhaseScreenProps {
  game: GameState;
  myRole: 'attacker' | 'defender' | null;
  isAdmin: boolean;
  roomCode: string;
  onRoll: () => void;
  onAdvance: () => void;
}

export default function RollPhaseScreen({
  game,
  myRole,
  isAdmin,
  roomCode,
  onRoll,
  onAdvance,
}: RollPhaseScreenProps) {
  const { phase, rolls } = game;
  const aRoll = rolls.attacker;
  const dRoll = rolls.defender;

  const bothRolled = aRoll !== null && dRoll !== null;
  const isTied = bothRolled && aRoll === dRoll;
  const hasWinner = bothRolled && !isTied;

  // Which role card is the winner (for highlight)
  const winnerRole: 'attacker' | 'defender' | null = hasWinner
    ? phase === 'roll-attacker'
      ? 'attacker' // server already swapped so attacker.name is always the winner
      : aRoll! > dRoll! ? 'attacker' : 'defender'
    : null;

  const title = phase === 'roll-attacker' ? 'DETERMINE ATTACKER' : 'DETERMINE FIRST PLAYER';

  // Result message
  let resultMsg = '';
  let resultType: 'tie' | 'winner' | '' = '';
  if (isTied) {
    resultMsg = 'Tie! Roll Again';
    resultType = 'tie';
  } else if (hasWinner) {
    if (phase === 'roll-attacker') {
      resultMsg = `${game.attacker.name} is the Attacker!`;
    } else {
      const firstName = winnerRole === 'attacker' ? game.attacker.name : game.defender.name;
      resultMsg = `${firstName} goes first!`;
    }
    resultType = 'winner';
  }

  const myRoll = myRole ? rolls[myRole] : null;
  const canRoll = !isAdmin && myRole !== null && (myRoll === null || isTied);
  const canAdvance = hasWinner;

  return (
    <div className="roll-phase">
      <h1 className="lobby-title">WARHAMMER 40K</h1>

      <div className="roll-phase-title">{title}</div>

      <div className="roll-players">
        {/* Attacker slot card */}
        <div className={`roll-player-card ${winnerRole === 'attacker' ? 'roll-winner' : ''}`}>
          <span className="roll-player-name">{game.attacker.name}</span>
          <span className="roll-player-faction">{game.attacker.faction}</span>
          <div className="roll-result-number">
            {aRoll !== null ? aRoll : '—'}
          </div>
          {myRole === 'attacker' && (
            <button
              className="btn btn-next roll-btn"
              onClick={onRoll}
              disabled={!canRoll}
            >
              {myRoll !== null && !isTied ? 'ROLLED' : 'ROLL'}
            </button>
          )}
        </div>

        <div className="roll-vs">VS</div>

        {/* Defender slot card */}
        <div className={`roll-player-card ${winnerRole === 'defender' ? 'roll-winner' : ''}`}>
          <span className="roll-player-name">{game.defender.name}</span>
          <span className="roll-player-faction">{game.defender.faction}</span>
          <div className="roll-result-number">
            {dRoll !== null ? dRoll : '—'}
          </div>
          {myRole === 'defender' && (
            <button
              className="btn btn-next roll-btn"
              onClick={onRoll}
              disabled={!canRoll}
            >
              {myRoll !== null && !isTied ? 'ROLLED' : 'ROLL'}
            </button>
          )}
        </div>
      </div>

      {resultMsg && (
        <p className={`roll-result-message roll-result-${resultType}`}>{resultMsg}</p>
      )}

      {phase === 'roll-attacker' && hasWinner && (
        <p className="roll-deploy-message">Deploy armies before moving to next step</p>
      )}

      <button
        className={`btn btn-next roll-advance-btn ${!canAdvance ? 'disabled' : ''}`}
        onClick={onAdvance}
        disabled={!canAdvance}
      >
        NEXT
      </button>

      <div className="game-code-display small" style={{ marginTop: 'auto' }}>
        <span className="game-code-label">GAME CODE</span>
        <span className="game-code-value">{roomCode}</span>
      </div>
    </div>
  );
}
