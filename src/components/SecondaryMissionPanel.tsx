import { useState } from 'react';
import type { SecondaryMission } from '../types/missions';
import type { PlayerMissionState } from '../types/missions';
import missionsData from '../data/missions.json';

interface SecondaryMissionPanelProps {
  role: 'attacker' | 'defender';
  missionState: PlayerMissionState;
  readOnly?: boolean;
  onSetPlaystyle: (playstyle: 'tactical' | 'fixed') => void;
  onDraw: () => void;
  onComplete: (missionId: string) => void;
  onSelectFixed: (missionId: string) => void;
}

const allSecondaries = missionsData.secondaryMissions as SecondaryMission[];

function getMission(id: string): SecondaryMission | undefined {
  return allSecondaries.find((m) => m.id === id);
}

function InlineExpanded({ mission, onCollapse, onAction, actionLabel }: {
  mission: SecondaryMission;
  onCollapse: () => void;
  onAction?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="mission-card secondary expanded" onClick={onCollapse}>
      <h3 className="mission-title">{mission.title}</h3>
      <p className="mission-flavor">{mission.flavor}</p>

      {mission.whenDrawn && (
        <p className="mission-rule"><strong>When Drawn:</strong> {mission.whenDrawn}</p>
      )}

      {mission.action && (
        <div className="mission-action">
          <span className="action-name">{mission.action.name} (ACTION)</span>
          <p><strong>Starts:</strong> {mission.action.starts}</p>
          <p><strong>Units:</strong> {mission.action.units}</p>
          <p><strong>Completes:</strong> {mission.action.completes}</p>
          <p><strong>If Completed:</strong> {mission.action.ifCompleted}</p>
        </div>
      )}

      <div className="mission-timing">
        <span>{mission.timing}</span>
        <span>{mission.when}</span>
      </div>

      <ul className="mission-scoring">
        {mission.scoring.map((s, i) => (
          <li key={i}>
            <span className="scoring-condition">{s.condition}</span>
            <span className="scoring-vp">{s.vp}</span>
          </li>
        ))}
      </ul>

      {mission.note && <p className="mission-note">{mission.note}</p>}
      {mission.designerNote && (
        <p className="mission-note">Designer's Note: {mission.designerNote}</p>
      )}

      {onAction && (
        <button className="btn btn-discard" onClick={(e) => { e.stopPropagation(); onAction(); onCollapse(); }}>
          {actionLabel ?? 'COMPLETE'}
        </button>
      )}
    </div>
  );
}

function CompactCard({ mission, onClick }: {
  mission: SecondaryMission;
  onClick: () => void;
}) {
  return (
    <div className="mission-card secondary compact" onClick={onClick}>
      <h3 className="mission-title">{mission.title}</h3>
      <p className="mission-flavor">{mission.flavor}</p>
    </div>
  );
}

export default function SecondaryMissionPanel({
  role,
  missionState,
  readOnly = false,
  onSetPlaystyle,
  onDraw,
  onComplete,
  onSelectFixed,
}: SecondaryMissionPanelProps) {
  const [fixedPickerOpen, setFixedPickerOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Playstyle not yet chosen
  if (!missionState.playstyle) {
    return (
      <div className={`secondary-mission-panel ${role}`}>
        <div className="secondary-header">
          <span className="mission-type-label">SECONDARY MISSIONS</span>
        </div>
        {readOnly ? (
          <div className="playstyle-chooser">
            <p className="playstyle-prompt">Waiting for playstyle choice...</p>
          </div>
        ) : (
          <div className="playstyle-chooser">
            <p className="playstyle-prompt">Choose playstyle:</p>
            <div className="playstyle-buttons">
              <button className="btn btn-playstyle" onClick={() => onSetPlaystyle('tactical')}>
                <span className="playstyle-name">TACTICAL</span>
                <span className="playstyle-desc">Draw randomly, replace on complete</span>
              </button>
              <button className="btn btn-playstyle" onClick={() => onSetPlaystyle('fixed')}>
                <span className="playstyle-name">FIXED</span>
                <span className="playstyle-desc">Choose 2 missions for the game</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const activeMissions = missionState.active
    .map(getMission)
    .filter((m): m is SecondaryMission => !!m);

  const canDraw = missionState.playstyle === 'tactical'
    && missionState.active.length < 2
    && missionState.deck.length > 0;

  // Fixed: missions available to pick (not already active or discarded)
  const usedIds = new Set([...missionState.active, ...missionState.discarded]);
  const availableForFixed = allSecondaries.filter((m) => m.fixed && !usedIds.has(m.id));
  const canPickFixed = missionState.playstyle === 'fixed' && missionState.active.length < 2;

  return (
    <div className={`secondary-mission-panel ${role}`}>
      <div className="secondary-header">
        <span className="mission-type-label">
          SECONDARY — {missionState.playstyle.toUpperCase()}
        </span>
        {missionState.playstyle === 'tactical' && (
          <span className="deck-count">{missionState.deck.length} cards left</span>
        )}
      </div>

      <div className="secondary-slots">
        {activeMissions.map((mission) => (
          expandedId === mission.id ? (
            <InlineExpanded
              key={mission.id}
              mission={mission}
              onCollapse={() => setExpandedId(null)}
              onAction={readOnly ? undefined : () => onComplete(mission.id)}
              actionLabel="COMPLETE"
            />
          ) : (
            <CompactCard
              key={mission.id}
              mission={mission}
              onClick={() => setExpandedId(mission.id)}
            />
          )
        ))}

        {/* Empty slot(s) */}
        {missionState.active.length < 2 && (
          <div className="mission-card secondary empty">
            <p className="no-mission-text">
              {missionState.active.length === 0 ? 'No active missions' : 'One slot open'}
            </p>
            {!readOnly && canDraw && (
              <button className="btn btn-draw" onClick={onDraw}>
                DRAW MISSION
              </button>
            )}
            {!readOnly && canPickFixed && (
              <button
                className="btn btn-draw"
                onClick={() => setFixedPickerOpen(!fixedPickerOpen)}
              >
                {fixedPickerOpen ? 'CLOSE PICKER' : 'CHOOSE MISSION'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Fixed mission picker */}
      {!readOnly && fixedPickerOpen && canPickFixed && (
        <div className="fixed-picker">
          <p className="picker-label">Select a mission:</p>
          <div className="picker-list">
            {availableForFixed.map((m) => (
              <button
                key={m.id}
                className="btn btn-pick-mission"
                onClick={() => {
                  onSelectFixed(m.id);
                  if (missionState.active.length >= 1) setFixedPickerOpen(false);
                }}
              >
                {m.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Expanded inline is rendered within slots above */}
    </div>
  );
}
