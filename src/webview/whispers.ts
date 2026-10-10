// Froggit Whispers: the little things the frog says now and then.
// No DOM here, so the timing rules can be unit tested.

export const WHISPERS: readonly string[] = [
  'you got this ♡',
  'one bug at a time!',
  'proud of you!',
  'keep going, human!',
  'ribbit! nice work',
  'little steps count',
  "you're doing amazing",
  "don't forget water!",
  'bugs fear us hehe',
  'we make a good team ♡',
  'rest your eyes a little',
  "you're getting better!",
  'take your time ♡',
  'i believe in you!',
  "look how far you've come",
];

/** Picks a message at random, never the same one twice in a row. */
export function pickWhisper(last: string | null, rand: () => number = Math.random): string {
  const choices = WHISPERS.filter((w) => w !== last);
  return choices[Math.floor(rand() * choices.length)];
}

/**
 * Decides when the frog speaks. Driven by the pond's animation loop, which only
 * runs while the pond is on screen, so hidden time never counts and missed
 * messages never pile up: at most one is ever waiting.
 */
export class WhisperClock {
  private waited = 0;

  constructor(private intervalSeconds: number) {}

  setInterval(seconds: number): void {
    this.intervalSeconds = seconds;
  }

  /** Starts the wait over, e.g. right after the frog spoke. */
  restart(): void {
    this.waited = 0;
  }

  /**
   * Advances time. Returns true when a message is due and the frog is free to
   * say it; if it's busy, the message simply waits.
   */
  update(dt: number, canSpeak: boolean): boolean {
    this.waited = Math.min(this.waited + dt, this.intervalSeconds);
    if (this.waited < this.intervalSeconds || !canSpeak) return false;
    this.waited = 0;
    return true;
  }
}
