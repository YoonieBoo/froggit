// Growth stages. The stage is always derived from total XP, never stored separately,
// so the two can't disagree.

export type StageId = 'egg' | 'baby' | 'developer' | 'senior';

export interface Stage {
  id: StageId;
  name: string;
  minXp: number;
}

export const STAGES: readonly Stage[] = [
  { id: 'egg', name: 'Egg', minXp: 0 },
  { id: 'baby', name: 'Baby Frog', minXp: 40 },
  { id: 'developer', name: 'Developer Frog', minXp: 600 },
  { id: 'senior', name: 'Senior Frog', minXp: 2500 },
];

/** What the pond needs to draw the XP bar. */
export interface ProgressView {
  xp: number;
  stage: StageId;
  stageName: string;
  stageStartXp: number;
  /** null at the final stage */
  nextStageXp: number | null;
}

export function describeProgress(xp: number): ProgressView {
  let index = 0;
  STAGES.forEach((stage, i) => {
    if (xp >= stage.minXp) index = i;
  });
  const stage = STAGES[index];
  const next = STAGES[index + 1];
  return {
    xp,
    stage: stage.id,
    stageName: stage.name,
    stageStartXp: stage.minXp,
    nextStageXp: next ? next.minXp : null,
  };
}
