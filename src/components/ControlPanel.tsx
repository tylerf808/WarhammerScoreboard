interface ControlPanelProps {
  onNextTurn: () => void;
  onReset: () => void;
  gameOver: boolean;
  canEndTurn: boolean;
  isAdmin: boolean;
}

export default function ControlPanel({
  onNextTurn,
  onReset,
  gameOver,
  canEndTurn,
  isAdmin,
}: ControlPanelProps) {
  return (
    <div className="control-panel">
      {!gameOver ? (
        <button
          className={`btn btn-next ${!canEndTurn ? 'disabled' : ''}`}
          onClick={onNextTurn}
          disabled={!canEndTurn}
        >
          {canEndTurn ? 'END TURN ▶' : 'OPPONENT\'S TURN'}
        </button>
      ) : (
        <button className="btn btn-next disabled" disabled>
          GAME COMPLETE
        </button>
      )}
      {isAdmin && (
        <button className="btn btn-reset" onClick={onReset}>
          RESET GAME
        </button>
      )}
    </div>
  );
}
