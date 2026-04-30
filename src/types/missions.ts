export interface MissionScoring {
  condition: string;
  vp: string;
}

export interface MissionAction {
  name: string;
  starts: string;
  units: string;
  completes: string;
  ifCompleted: string;
}

export interface PrimaryMission {
  id: string;
  title: string;
  flavor: string;
  timing: string;
  when: string;
  scoring: MissionScoring[];
  action?: MissionAction;
  specialRule?: string;
  designerNote?: string;
}

export interface SecondaryMission {
  id: string;
  fixed: boolean;
  title: string;
  flavor: string;
  timing: string;
  when: string;
  scoring: MissionScoring[];
  action?: MissionAction;
  whenDrawn?: string;
  designerNote?: string;
  note?: string;
}

export interface PlayerMissionState {
  playstyle: 'tactical' | 'fixed' | null;
  deck: string[];        // ids remaining in deck (tactical only)
  active: string[];      // currently active secondary mission ids (up to 2)
  discarded: string[];   // completed/discarded ids
}
