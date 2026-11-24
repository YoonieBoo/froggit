// Growth stages. The stage is always derived from total XP, never stored separately,
// so the two can't disagree.

export type StageId = 'baby' | 'developer' | 'senior';

export interface Stage {
  id: StageId;
  name: string;
  minXp: number;
}

export const STAGES: readonly Stage[] = [
  // Everyone starts as a frog; the egg is only a quick welcome animation.
  { id: 'baby', name: 'Baby Frog', minXp: 0 },
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
