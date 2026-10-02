// Baby frog, side view, facing right. 16×14 pixels per frame.
// Codes are defined in palette.ts; '.' is transparent.

export const FROG_IDLE_0 = [
  '.......kkk.kkkk.',
  '......kwwbkwwwwk',
  '......kwbbkwwbbk',
  '.....kkgwkkwwbbk',
  '....kgggggkkwwk.',
  '...khhggggggggk.',
  '..khggggggggggk.',
  '..kgggggggggpgk.',
  '.kGggggkkkkkkk..',
  'kGGggggkllllk...',
  'kGGGggglllllk...',
  'kGGGGgglllllk...',
  '.kGGGkkglkkglk..',
  '..kkk..kk..kkk..',
];

// Throat puffs out: the "breathing" frame.
export const FROG_IDLE_1 = [
  '.......kkk.kkkk.',
  '......kwwbkwwwwk',
  '......kwbbkwwbbk',
  '.....kkgwkkwwbbk',
  '....kgggggkkwwk.',
  '...khhggggggggk.',
  '..khggggggggggk.',
  '..kgggggggggpgk.',
  '.kGggggkkkkkkkk.',
  'kGGggggklllllllk',
  'kGGGggglllllllk.',
  'kGGGGgglllllk...',
  '.kGGGkkglkkglk..',
  '..kkk..kk..kkk..',
];

// Squashed down, about to jump (also used for landing).
export const FROG_CROUCH = [
  '................',
  '.......kkk.kkkk.',
  '......kwwbkwwwwk',
  '......kwbbkwwbbk',
  '.....kkgwkkwwbbk',
  '...kkgggggkkwwk.',
  '..khhgggggggggk.',
  '.khggggggggggpgk',
  'kGgggggkkkkkkkk.',
  'kGGgggggllllllk.',
  'kGGGggglllllllk.',
  'kGGGGgglllllllk.',
  'kkGGGkkglkkkglkk',
  '.kkkk..kkk..kkk.',
];

// Mid-air: back legs stretched out behind.
export const FROG_JUMP = [
  '........kkk.kkkk',
  '.......kwwbkwwwk',
  '.......kwbbkwwbk',
  '......kkgwkkwwbk',
  '....kkgggggkkwk.',
  '...khhggggggggk.',
  '..khggggggggpgk.',
  '.kGgggggkkkkkk..',
  'kGGgggggllllk...',
  'kGGGgggglllk....',
  '.kGGGGkkkllk....',
  'kGGGkk..kglk....',
  'kGkk.....kk.....',
  'kk..............',
];

export const FROG_BLINK = [
  '................',
  '.......kkk.kkkk.',
  '......kgggkggggk',
  '.....kkkkkkkkkkk',
  '....kgggggggggk.',
  '...khhggggggggk.',
  '..khggggggggggk.',
  '..kgggggggggpgk.',
  '.kGggggkkkkkkk..',
  'kGGggggkllllk...',
  'kGGGggglllllk...',
  'kGGGGgglllllk...',
  '.kGGGkkglkkglk..',
  '..kkk..kk..kkk..',
];
