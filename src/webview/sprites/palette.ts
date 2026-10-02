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
};
