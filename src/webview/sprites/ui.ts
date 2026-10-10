// Wooden buttons for the pond's controls. Codes are defined in palette.ts.
// Icons are drawn in the outline color ('K'); '.' becomes wood.

export const HANGER_ICON = [
  '....K....',
  '...K.K...',
  '.....K...',
  '....K....',
  '...K.K...',
  '..K...K..',
  '.K.....K.',
  'KKKKKKKKK',
];

export const CLOSE_ICON = [
  'K...K',
  '.K.K.',
  '..K..',
  '.K.K.',
  'K...K',
];

/**
 * Puts an icon on a beveled wooden plank. The pressed version swaps the light and
 * dark edges and nudges the icon down a pixel, so a click looks like a push.
 * Both versions are the same size.
 */
export function woodButton(icon: string[], pressed = false): string[] {
  const inner = icon[0].length + 2;
  const wood = (row: string) => '.' + row + '.';
  const blank = '.'.repeat(icon[0].length);
  const outline = '.' + 'K'.repeat(inner + 2) + '.';
  const edge = (code: string) => 'K' + code.repeat(inner + 2) + 'K';
  const [left, right] = pressed ? ['J', 'j'] : ['i', 'J'];
  const body = (pressed ? [blank, blank, ...icon, blank] : [blank, ...icon, blank]).map(
    (row) => 'K' + left + wood(row).replace(/\./g, 'j') + right + 'K',
  );
  return pressed
    ? [outline, edge('J'), ...body, edge('j'), outline]
    : [outline, edge('i'), ...body, edge('J'), edge('J'), outline];
}

// The speech bubble's tail, pointing down at the frog. Its top row sits on the
// bubble's bottom outline and opens it up into the tail.
export const WHISPER_TAIL = ['kfffk', '.kfk.', '..k..'];
export const WHISPER_TAIL_NIGHT = ['tFFFt', '.tFt.', '..t..'];
