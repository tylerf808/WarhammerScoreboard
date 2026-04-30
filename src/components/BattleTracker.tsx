interface BattleTrackerProps {
  battleRound: number;
  maxRounds: number;
  currentTurn: 'attacker' | 'defender';
  gameOver: boolean;
}

export default function BattleTracker({
  battleRound,
  maxRounds,
  currentTurn,
  gameOver,
}: BattleTrackerProps) {
  return (
    <div className="battle-tracker">
      <div className="round-display">
        <span className="round-label">BATTLE ROUND</span>
        <div className="round-indicators">
          {Array.from({ length: maxRounds }, (_, i) => (
            <div
              key={i}
              className={`round-pip ${i + 1 < battleRound ? 'completed' : ''} ${
                i + 1 === battleRound ? 'current' : ''
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      <div className="turn-display">
        {gameOver ? (
          <span className="game-over-text">GAME OVER</span>
        ) : (
          <>
            <span className="turn-label">CURRENT TURN</span>
            <span className={`turn-value ${currentTurn}`}>
              {currentTurn.toUpperCase()}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
