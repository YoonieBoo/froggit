// Froggit Whispers: the little things the frog says when you click it.
// No DOM here, so it can be unit tested.

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
