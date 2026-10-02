import type { ProgressView } from '../shared/stages';

/**
 * The HTML overlay on top of the canvas: stage name, XP bar and floating "+XP" text.
 * Plain DOM rather than canvas so the text stays sharp and readable.
 */
export class Hud {
  private readonly root = document.getElementById('hud')!;
  private readonly stageName = document.getElementById('stage-name')!;
  private readonly fill = document.getElementById('xp-fill')!;
  private readonly text = document.getElementById('xp-text')!;
  private readonly floaters = document.getElementById('floaters')!;

  show(progress: ProgressView): void {
    this.root.hidden = false;
    this.stageName.textContent = progress.stageName;

    if (progress.nextStageXp === null) {
      this.fill.style.width = '100%';
      this.text.textContent = `${progress.xp} XP`;
      return;
    }
    const into = progress.xp - progress.stageStartXp;
    const span = progress.nextStageXp - progress.stageStartXp;
    this.fill.style.width = `${Math.min(100, (into / span) * 100)}%`;
    this.text.textContent = `${into}/${span} XP`;
  }

  /** Text that drifts up and fades out at a position in CSS pixels. */
  float(message: string, x: number, y: number, big = false): void {
    const el = document.createElement('div');
    el.className = big ? 'floater big' : 'floater';
    el.textContent = message;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.addEventListener('animationend', () => el.remove());
    this.floaters.appendChild(el);
  }
}
