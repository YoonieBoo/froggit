// A tiny lowercase pixel font, for words drawn into the pond itself (holiday
// messages in the sky) and for the README GIFs. 'x' is a lit pixel.
// Row 0 is for ascenders, rows 1-4 are the body of the letter, row 5 is for
// descenders. Only the letters the messages use are here; add more as needed.

export const GLYPHS: Record<string, string[]> = {
  ' ': ['..', '..', '..', '..', '..', '..'],
  '!': ['x', 'x', 'x', '.', 'x', '.'],
  '♡': ['.....', '.x.x.', 'x.x.x', 'x...x', '.x.x.', '..x..'],
  a: ['...', 'xx.', '.xx', 'x.x', '.xx', '...'],
  b: ['x..', 'x..', 'xx.', 'x.x', 'xx.', '...'],
  c: ['...', '.xx', 'x..', 'x..', '.xx', '...'],
  e: ['...', '.x.', 'xxx', 'x..', '.xx', '...'],
  g: ['...', '.xx', 'x.x', '.xx', '..x', 'xx.'],
  h: ['x..', 'x..', 'xx.', 'x.x', 'x.x', '...'],
  i: ['x', '.', 'x', 'x', 'x', '.'],
  k: ['x..', 'x..', 'x.x', 'xx.', 'x.x', '...'],
  m: ['.....', 'xx.x.', 'x.x.x', 'x.x.x', 'x.x.x', '.....'],
  n: ['...', 'xx.', 'x.x', 'x.x', 'x.x', '...'],
  o: ['...', '.x.', 'x.x', 'x.x', '.x.', '...'],
  p: ['...', 'xx.', 'x.x', 'x.x', 'xx.', 'x..'],
  r: ['...', 'x.x', 'xx.', 'x..', 'x..', '...'],
  s: ['...', '.xx', 'x..', '..x', 'xx.', '...'],
  t: ['.x.', 'xxx', '.x.', '.x.', '..x', '...'],
  u: ['...', 'x.x', 'x.x', 'x.x', '.xx', '...'],
  w: ['.....', 'x...x', 'x...x', 'x.x.x', '.x.x.', '.....'],
  y: ['...', 'x.x', 'x.x', '.xx', '..x', 'xx.'],
};

export const GLYPH_HEIGHT = 6;

/** Width in pixels, with one blank column between letters. */
export function textWidth(text: string): number {
  return [...text].reduce((w, ch) => w + GLYPHS[ch][0].length, 0) + [...text].length - 1;
}

/** Calls `pixel` for every lit pixel of `text`, with its letter index. */
export function forEachTextPixel(
  text: string,
  left: number,
  top: number,
  pixel: (x: number, y: number, letter: number) => void,
): void {
  let x = left;
  [...text].forEach((ch, letter) => {
    const glyph = GLYPHS[ch];
    glyph.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) if (row[rx] === 'x') pixel(x + rx, top + ry, letter);
    });
    x += glyph[0].length + 1;
  });
}
