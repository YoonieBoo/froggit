// One-character color codes used by every sprite grid. '.' is transparent.
// Keep codes unique across sprites so grids stay easy to read and edit.
export const PALETTE: Record<string, string> = {
  // Frog
  k: '#1f3a24', // outline
  g: '#6cc04a', // body
  G: '#469a3c', // body shade
  h: '#9be36a', // body highlight
  l: '#d9ef9a', // belly
  w: '#f7f7ea', // eye white
  b: '#16161a', // pupil
  p: '#ef8a9a', // blush

  // Egg
  e: '#f3ecd2', // shell
  E: '#d8cba3', // shell shade
  s: '#8fcf6a', // spots
  o: '#5c5340', // shell outline

  // Bugs
  d: '#2b1d22', // bug outline / head
  r: '#e0524c', // beetle shell
  R: '#a8323a', // beetle shell shade
  n: '#e6f1f7', // wings
  Y: '#f2c94c', // gnat body

  // Accessories
  M: '#d9473f', // mushroom cap
  O: '#f5c542', // gold
  q: '#c99a2e', // gold shade
  u: '#fff3b0', // gold highlight, wizard star
  v: '#7a5cc9', // wizard hat
  V: '#53408f', // wizard hat shade
  c: '#4a86d6', // cap
  C: '#2f5f9e', // cap shade
  a: '#9a6532', // glasses frame
  z: '#3a3f5e', // sunglasses lens
  x: '#b4c3dc', // lens glint

  // Wooden UI buttons
  K: '#3e2617', // outline, icons
  i: '#d39a5c', // light edge
  j: '#b07440', // wood
  J: '#7d4e2b', // dark edge

  // Whisper bubble (light ponds use the frog outline 'k')
  f: '#fffaf0', // bubble
  F: '#26315f', // bubble on night ponds
  t: '#c9d3f5', // bubble outline on night ponds
};
