import * as THREE from 'three';

export const GLYPHS = [
  'Σ', '∫', 'π', '√', '∞', 'Δ', '≈', '±',
  '=SUM(', '=NPV(', 'f(x)', '%', 'σ', 'μ', '∂', 'λ',
];

const GRID_COLS = 4;
const GRID_ROWS = 4;
const CELL_PX = 128;

export interface GlyphAtlas {
  texture: THREE.CanvasTexture;
  cols: number;
  rows: number;
  count: number;
}

export function buildGlyphAtlas(): GlyphAtlas {
  const canvas = document.createElement('canvas');
  canvas.width = GRID_COLS * CELL_PX;
  canvas.height = GRID_ROWS * CELL_PX;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';

  GLYPHS.forEach((glyph, i) => {
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);
    const cx = col * CELL_PX + CELL_PX / 2;
    const cy = row * CELL_PX + CELL_PX / 2;
    const fontSize = glyph.length > 2 ? CELL_PX * 0.26 : CELL_PX * 0.55;
    ctx.font = `${glyph.length > 2 ? '600' : '400'} ${fontSize}px "SF Mono", "Courier New", monospace`;
    ctx.fillText(glyph, cx, cy);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  return { texture, cols: GRID_COLS, rows: GRID_ROWS, count: GLYPHS.length };
}
