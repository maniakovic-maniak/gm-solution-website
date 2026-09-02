// glyphAtlas.ts — draws a grid of math glyphs onto a canvas at runtime
// and returns a THREE.CanvasTexture plus the grid metadata needed to
// address individual cells from the particle shader. No external image
// assets, so nothing to license or source.

import * as THREE from 'three';

export const GLYPHS = [
  'Σ', '∫', 'π', '√', '∞', 'Δ', '≈', '±',
  '=SUM(', '=NPV(', 'f(x)', '%', 'σ', 'μ', '∂', 'λ',
  '[F1]',
];

const GRID_COLS = 5;
const GRID_ROWS = 5;
const CELL_PX = 128; // atlas cell size in source pixels

export interface GlyphAtlas {
  texture: THREE.CanvasTexture;
  cols: number;
  rows: number;
  count: number;
}

function fontSizeFor(glyph: string): number {
  const len = glyph.length;
  if (len <= 1) return CELL_PX * 0.55;
  if (len <= 4) return CELL_PX * 0.26;
  if (len <= 6) return CELL_PX * 0.2;
  return CELL_PX * 0.15; // long strings like "Solutions"
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
    const fontSize = fontSizeFor(glyph);
    ctx.font = `${glyph.length > 2 ? '600' : '400'} ${fontSize}px "SF Mono", "Courier New", monospace`;
    ctx.fillText(glyph, cx, cy);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  return { texture, cols: GRID_COLS, rows: GRID_ROWS, count: GLYPHS.length };
}
