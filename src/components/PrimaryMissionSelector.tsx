import { useState } from 'react';
import type { PrimaryMission } from '../types/missions';
import missionsData from '../data/missions.json';

interface PrimaryMissionSelectorProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const primaryMissions = missionsData.primaryMissions as PrimaryMission[];

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '…';
}

export default function PrimaryMissionSelector({
  selectedId,
  onSelect,
}: PrimaryMissionSelectorProps) {
  const [expanded, setExpanded] = useState(false);
  const selected = primaryMissions.find((m) => m.id === selectedId);

  return (
    <div className="primary-mission-section">
      <div className="mission-header">
        <span className="mission-type-label">PRIMARY MISSION</span>
        <select
          className="mission-select"
          value={selectedId ?? ''}
          onChange={(e) => onSelect(e.target.value)}
        >
          <option value="" disabled>
            Select a mission...
          </option>
          {primaryMissions.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
      </div>

      {selected && !expanded && (
        <div className="mission-card primary compact" onClick={() => setExpanded(true)}>
          <h3 className="mission-title">{selected.title}</h3>
          <ul className="mission-scoring compact-scoring">
            {selected.scoring.map((s, i) => (
              <li key={i}>
                <span className="scoring-condition">{truncate(s.condition, 60)}</span>
                <span className="scoring-vp">{s.vp}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {expanded && selected && (
        <div className="mission-card primary expanded" onClick={() => setExpanded(false)}>
          <h3 className="mission-title">{selected.title}</h3>
          <p className="mission-flavor">{selected.flavor}</p>

          {selected.specialRule && (
            <p className="mission-rule">{selected.specialRule}</p>
          )}

          {selected.action && (
            <div className="mission-action">
              <span className="action-name">{selected.action.name} (ACTION)</span>
              <p><strong>Starts:</strong> {selected.action.starts}</p>
              <p><strong>Units:</strong> {selected.action.units}</p>
              <p><strong>Completes:</strong> {selected.action.completes}</p>
              <p><strong>If Completed:</strong> {selected.action.ifCompleted}</p>
            </div>
          )}

          <div className="mission-timing">
            <span>{selected.timing}</span>
            <span>{selected.when}</span>
          </div>

          <ul className="mission-scoring">
            {selected.scoring.map((s, i) => (
              <li key={i}>
                <span className="scoring-condition">{s.condition}</span>
                <span className="scoring-vp">{s.vp}</span>
              </li>
            ))}
          </ul>

          {selected.designerNote && (
            <p className="mission-note">Designer's Note: {selected.designerNote}</p>
          )}
        </div>
      )}
    </div>
  );
}
