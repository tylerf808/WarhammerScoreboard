import { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import type { CreateOptions } from './hooks/useSocket';
import BattleTracker from './components/BattleTracker';
import PlayerCard from './components/PlayerCard';
import ControlPanel from './components/ControlPanel';
import PrimaryMissionSelector from './components/PrimaryMissionSelector';
import SecondaryMissionPanel from './components/SecondaryMissionPanel';
import HomeScreen from './components/HomeScreen';
import JoinScreen from './components/JoinScreen';
import LobbyScreen from './components/LobbyScreen';
import './App.css';

type Screen = 'home' | 'joining' | 'lobby' | 'playing';

function App() {
  const {
    connected,
    roomCode,
    room,
    game,
    myRole,
    isAdmin,
    error,
    createRoom,
    joinRoom,
    setInfo,
    updateStat,
    nextTurn,
    resetGame,
    endGame,
    selectPrimary,
    setPlaystyle,
    drawSecondary,
    completeSecondary,
    selectFixed,
    adminSetRound,
  } = useSocket();

  const [screen, setScreen] = useState<Screen>('home');

  // Auto-advance screens based on server state
  useEffect(() => {
    if (game && (myRole || isAdmin) && screen !== 'playing') {
      setScreen('playing');
    } else if (roomCode && !game && (screen === 'home' || screen === 'joining')) {
      setScreen('lobby');
    }
  }, [game, myRole, roomCode, screen]);

  const handleCreate = (options: CreateOptions) => {
    createRoom(options);
    // useEffect will advance to lobby once roomCode arrives
  };

  const handleJoinNav = () => {
    setScreen('joining');
  };

  const handleJoinSubmit = (code: string) => {
    joinRoom(code);
    // Will advance to lobby once room:joined fires and roomCode is set
  };

  const handleBack = () => {
    setScreen('home');
  };

  const handleEndGame = () => {
    endGame();
    setScreen('home');
  };

  // ── Screen: Home ──────────────────────────────────────────
  if (screen === 'home') {
    return (
      <HomeScreen
        connected={connected}
        error={error}
        onCreate={handleCreate}
        onJoin={handleJoinNav}
      />
    );
  }

  // ── Screen: Join (code input) ─────────────────────────────
  if (screen === 'joining') {
    // useEffect auto-advances to lobby/playing when roomCode or game arrives
    return (
      <JoinScreen
        connected={connected}
        error={error}
        onJoin={handleJoinSubmit}
        onBack={handleBack}
      />
    );
  }

  // ── Screen: Lobby (name/faction entry + waiting) ──────────
  if (screen === 'lobby' && roomCode) {
    return (
      <LobbyScreen
        onSetInfo={setInfo}
        room={room}
        roomCode={roomCode}
        error={error}
        isAdmin={isAdmin}
      />
    );
  }

  // ── Screen: Playing ───────────────────────────────────────
  if (screen === 'playing' && game && (myRole || isAdmin)) {
    const canEndTurn = !game.gameOver && (isAdmin || game.currentTurn === myRole);

    return (
      <div className="scoreboard">
        {error && <div className="socket-error">{error}</div>}

        <BattleTracker
          battleRound={game.battleRound}
          maxRounds={game.maxRounds}
          currentTurn={game.currentTurn}
          gameOver={game.gameOver}
        />

        {isAdmin && (
          <div className="admin-panel">
            <span className="admin-panel-label">ADMIN — BATTLE ROUND</span>
            <div className="admin-round-controls">
              <button
                className="btn-admin-round"
                onClick={() => adminSetRound(game.battleRound - 1)}
                disabled={game.battleRound <= 1}
              >−</button>
              <span className="admin-round-value">{game.battleRound}</span>
              <button
                className="btn-admin-round"
                onClick={() => adminSetRound(game.battleRound + 1)}
                disabled={game.battleRound >= game.maxRounds}
              >+</button>
            </div>
          </div>
        )}

        <div className="main-row">
          {(game.options?.includeSecondary ?? true) && (
            <div className="secondary-col">
              <SecondaryMissionPanel
                role="attacker"
                missionState={game.attacker.missions}
                readOnly={myRole !== 'attacker'}
                onSetPlaystyle={(ps) => setPlaystyle('attacker', ps)}
                onDraw={() => drawSecondary('attacker')}
                onComplete={(id) => completeSecondary('attacker', id)}
                onSelectFixed={(id) => selectFixed('attacker', id)}
              />
            </div>
          )}

          <div className="players">
            <PlayerCard
              player={game.attacker}
              role="attacker"
              isActive={!game.gameOver && game.currentTurn === 'attacker'}
              isWinner={game.gameOver && game.attacker.vp > game.defender.vp}
              readOnly={!isAdmin && myRole !== 'attacker'}
              onCpChange={(d) => updateStat('attacker', 'cp', d)}
              onVpChange={(d) => updateStat('attacker', 'vp', d)}
            />
            <div className="vs-divider">VS</div>
            <PlayerCard
              player={game.defender}
              role="defender"
              isActive={!game.gameOver && game.currentTurn === 'defender'}
              isWinner={game.gameOver && game.defender.vp > game.attacker.vp}
              readOnly={!isAdmin && myRole !== 'defender'}
              onCpChange={(d) => updateStat('defender', 'cp', d)}
              onVpChange={(d) => updateStat('defender', 'vp', d)}
            />
          </div>

          {(game.options?.includeSecondary ?? true) && (
            <div className="secondary-col">
              <SecondaryMissionPanel
                role="defender"
                missionState={game.defender.missions}
                readOnly={myRole !== 'defender'}
                onSetPlaystyle={(ps) => setPlaystyle('defender', ps)}
                onDraw={() => drawSecondary('defender')}
                onComplete={(id) => completeSecondary('defender', id)}
                onSelectFixed={(id) => selectFixed('defender', id)}
              />
            </div>
          )}
        </div>

        <ControlPanel
          onNextTurn={nextTurn}
          onReset={resetGame}
          gameOver={game.gameOver}
          canEndTurn={canEndTurn}
        />

        {(game.options?.includePrimary ?? true) && (
          <PrimaryMissionSelector
            selectedId={game.primaryMissionId}
            onSelect={selectPrimary}
          />
        )}

        <div className="game-footer">
          <div className="game-code-display small">
            <span className="game-code-label">GAME CODE</span>
            <span className="game-code-value">{roomCode}</span>
          </div>
          {game.gameOver && (
            <button className="btn btn-reset end-game-btn" onClick={handleEndGame}>
              END GAME
            </button>
          )}
        </div>
      </div>
    );
  }
  // Fallback
  return (
    <HomeScreen
      connected={connected}
      error={error}
      onCreate={handleCreate}
      onJoin={handleJoinNav}
    />
  );
}

export default App;
