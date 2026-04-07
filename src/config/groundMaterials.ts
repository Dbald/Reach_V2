import type { GroundMaterial } from '@/types';

export interface GroundMaterialConfig {
  id: GroundMaterial;
  label: string;
  color: string;        // fallback color
  roughness: number;
  metalness: number;
  pattern?: 'solid' | 'checker' | 'stripe';
  patternColor?: string;
  patternScale?: number;
  textureGenerator?: () => HTMLCanvasElement;
  tileRepeat?: number;
}

// ---------- helpers ----------

function makeCanvas(size = 512): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return [c, c.getContext('2d')!];
}

function seededRand(initial = 42) {
  let s = initial;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/** Adds per-pixel noise for organic feel */
function applyNoise(ctx: CanvasRenderingContext2D, size: number, amount: number, seed = 7) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  const rand = seededRand(seed);
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * amount;
    d[i]   = Math.max(0, Math.min(255, d[i]   + n));
    d[i+1] = Math.max(0, Math.min(255, d[i+1] + n));
    d[i+2] = Math.max(0, Math.min(255, d[i+2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

// ---------- texture generators ----------

function generateGrassTexture(): HTMLCanvasElement {
  const size = 512;
  const [canvas, ctx] = makeCanvas(size);
  ctx.fillStyle = '#2d6b1e';
  ctx.fillRect(0, 0, size, size);

  const rand = seededRand(42);
  const greens = [
    '#3a8c28', '#45a030', '#2e7a1a', '#50b038',
    '#35721c', '#4d9e2e', '#5cb840', '#3e8822',
    '#2a6518', '#48a432', '#55b53a', '#327020',
  ];

  for (let i = 0; i < 8000; i++) {
    const bx = rand() * size;
    const by = rand() * size;
    const len = 6 + rand() * 14;
    const w = 1 + rand() * 2;
    const angle = -Math.PI / 2 + (rand() - 0.5) * 1.2;
    const color = greens[Math.floor(rand() * greens.length)];

    const positions: number[][] = [[bx, by]];
    if (bx < len) positions.push([bx + size, by]);
    if (bx > size - len) positions.push([bx - size, by]);
    if (by < len) positions.push([bx, by + size]);
    if (by > size - len) positions.push([bx, by - size]);

    for (const [px, py] of positions) {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.7 + rand() * 0.3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-w / 2, -len * 0.4);
      ctx.lineTo(0, -len);
      ctx.lineTo(w / 2, -len * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
  applyNoise(ctx, size, 20);
  return canvas;
}

function generateStoneTexture(): HTMLCanvasElement {
  const size = 512;
  const [canvas, ctx] = makeCanvas(size);
  ctx.fillStyle = '#8a8a85';
  ctx.fillRect(0, 0, size, size);

  const rand = seededRand(101);
  const grays = ['#7a7a75', '#929289', '#6e6e68', '#9e9e96', '#858580', '#7070696'];

  // Irregular stone shapes
  for (let i = 0; i < 120; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 15 + rand() * 40;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rand() * Math.PI * 2);
    ctx.fillStyle = grays[Math.floor(rand() * grays.length)];
    ctx.globalAlpha = 0.3 + rand() * 0.4;
    ctx.beginPath();
    // Irregular polygon
    const sides = 5 + Math.floor(rand() * 4);
    for (let s = 0; s < sides; s++) {
      const a = (s / sides) * Math.PI * 2;
      const rr = r * (0.7 + rand() * 0.6);
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Subtle crack/gap lines
    ctx.strokeStyle = '#5a5a55';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    ctx.stroke();
    ctx.restore();

    // Wrap edges
    if (x < r) { ctx.save(); ctx.translate(x + size, y); ctx.fillStyle = grays[Math.floor(rand() * grays.length)]; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    if (x > size - r) { ctx.save(); ctx.translate(x - size, y); ctx.fillStyle = grays[Math.floor(rand() * grays.length)]; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    if (y < r) { ctx.save(); ctx.translate(x, y + size); ctx.fillStyle = grays[Math.floor(rand() * grays.length)]; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    if (y > size - r) { ctx.save(); ctx.translate(x, y - size); ctx.fillStyle = grays[Math.floor(rand() * grays.length)]; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  }
  applyNoise(ctx, size, 25);
  return canvas;
}

function generateConcreteTexture(): HTMLCanvasElement {
  const size = 512;
  const [canvas, ctx] = makeCanvas(size);
  ctx.fillStyle = '#b0b0aa';
  ctx.fillRect(0, 0, size, size);

  const rand = seededRand(200);
  // Subtle speckles and surface imperfections
  for (let i = 0; i < 3000; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 1 + rand() * 3;
    ctx.fillStyle = rand() > 0.5 ? '#a0a09a' : '#bcbcb6';
    ctx.globalAlpha = 0.2 + rand() * 0.3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Hairline cracks
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    let cx = rand() * size;
    let cy = rand() * size;
    ctx.moveTo(cx, cy);
    for (let s = 0; s < 6; s++) {
      cx += (rand() - 0.5) * 80;
      cy += (rand() - 0.5) * 80;
      ctx.lineTo(cx, cy);
    }
    ctx.strokeStyle = '#9a9a94';
    ctx.lineWidth = 0.5 + rand();
    ctx.globalAlpha = 0.15 + rand() * 0.15;
    ctx.stroke();
  }
  applyNoise(ctx, size, 15);
  return canvas;
}

function generateGravelTexture(): HTMLCanvasElement {
  const size = 512;
  const [canvas, ctx] = makeCanvas(size);
  ctx.fillStyle = '#9a9080';
  ctx.fillRect(0, 0, size, size);

  const rand = seededRand(303);
  const colors = ['#8a8070', '#a09888', '#7a7068', '#b0a898', '#887860', '#9a8878'];

  for (let i = 0; i < 1500; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 2 + rand() * 6;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rand() * Math.PI * 2);
    ctx.scale(1, 0.6 + rand() * 0.8);
    ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
    ctx.globalAlpha = 0.5 + rand() * 0.5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Wrap
    for (const [ox, oy] of [[size, 0], [-size, 0], [0, size], [0, -size]] as const) {
      if ((ox > 0 && x > size - r * 2) || (ox < 0 && x < r * 2) || (oy > 0 && y > size - r * 2) || (oy < 0 && y < r * 2)) {
        ctx.save(); ctx.translate(x + ox, y + oy); ctx.fillStyle = colors[Math.floor(rand() * colors.length)]; ctx.globalAlpha = 0.4; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    }
  }
  applyNoise(ctx, size, 20);
  return canvas;
}

function generateWoodDeckTexture(): HTMLCanvasElement {
  const size = 512;
  const [canvas, ctx] = makeCanvas(size);
  ctx.fillStyle = '#8b6842';
  ctx.fillRect(0, 0, size, size);

  const rand = seededRand(404);
  const plankWidth = size / 6;

  for (let p = 0; p < 6; p++) {
    const px = p * plankWidth;
    // Plank base color variation
    const shade = Math.floor(rand() * 30) - 15;
    const r = 0x8b + shade, g = 0x68 + shade, b = 0x42 + shade;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(px, 0, plankWidth - 2, size);

    // Wood grain lines running vertically
    for (let i = 0; i < 30; i++) {
      const gx = px + rand() * plankWidth;
      ctx.strokeStyle = rand() > 0.5 ? '#7a5832' : '#9a7852';
      ctx.lineWidth = 0.5 + rand() * 1.5;
      ctx.globalAlpha = 0.15 + rand() * 0.2;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      let gy = 0;
      while (gy < size) {
        gy += 10 + rand() * 20;
        ctx.lineTo(gx + (rand() - 0.5) * 4, gy);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Gap between planks
    ctx.fillStyle = '#3a2a18';
    ctx.fillRect(px + plankWidth - 2, 0, 2, size);
  }

  // Knots
  for (let i = 0; i < 5; i++) {
    const kx = rand() * size;
    const ky = rand() * size;
    const kr = 4 + rand() * 8;
    ctx.fillStyle = '#5a3a22';
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(kx, ky, kr, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  applyNoise(ctx, size, 12);
  return canvas;
}

function generatePaversTexture(): HTMLCanvasElement {
  const size = 512;
  const [canvas, ctx] = makeCanvas(size);
  ctx.fillStyle = '#5a4a3a'; // grout color
  ctx.fillRect(0, 0, size, size);

  const rand = seededRand(505);
  const gap = 4;
  const cols = 6;
  const rows = 6;
  const pw = (size - gap) / cols;
  const ph = (size - gap) / rows;
  const colors = ['#c4a882', '#b89872', '#d0b898', '#bca078', '#c8b08a', '#b49468'];

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (pw / 2); // brick pattern offset
    for (let c = -1; c <= cols; c++) {
      const x = c * pw + offset + gap / 2;
      const y = r * ph + gap / 2;
      const color = colors[Math.floor(rand() * colors.length)];
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.9;
      ctx.fillRect(x, y, pw - gap, ph - gap);
      // Subtle bevel highlight
      ctx.fillStyle = '#d8c8a8';
      ctx.globalAlpha = 0.15;
      ctx.fillRect(x, y, pw - gap, 2);
      ctx.fillRect(x, y, 2, ph - gap);
      ctx.globalAlpha = 1;
    }
  }
  applyNoise(ctx, size, 18);
  return canvas;
}

function generateMulchTexture(): HTMLCanvasElement {
  const size = 512;
  const [canvas, ctx] = makeCanvas(size);
  ctx.fillStyle = '#5c3d2e';
  ctx.fillRect(0, 0, size, size);

  const rand = seededRand(606);
  const browns = ['#4c2d1e', '#6a4232', '#3e2218', '#785038', '#5a3828', '#7a5a42'];

  // Wood chip shapes
  for (let i = 0; i < 2000; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const w = 3 + rand() * 12;
    const h = 1 + rand() * 4;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rand() * Math.PI);
    ctx.fillStyle = browns[Math.floor(rand() * browns.length)];
    ctx.globalAlpha = 0.4 + rand() * 0.5;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();

    // Wrap edges
    if (x < w) { ctx.save(); ctx.translate(x + size, y); ctx.rotate(rand() * Math.PI); ctx.fillStyle = browns[Math.floor(rand() * browns.length)]; ctx.globalAlpha = 0.4; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.restore(); }
    if (x > size - w) { ctx.save(); ctx.translate(x - size, y); ctx.rotate(rand() * Math.PI); ctx.fillStyle = browns[Math.floor(rand() * browns.length)]; ctx.globalAlpha = 0.4; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.restore(); }
    if (y < h) { ctx.save(); ctx.translate(x, y + size); ctx.rotate(rand() * Math.PI); ctx.fillStyle = browns[Math.floor(rand() * browns.length)]; ctx.globalAlpha = 0.4; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.restore(); }
    if (y > size - h) { ctx.save(); ctx.translate(x, y - size); ctx.rotate(rand() * Math.PI); ctx.fillStyle = browns[Math.floor(rand() * browns.length)]; ctx.globalAlpha = 0.4; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.restore(); }
  }
  applyNoise(ctx, size, 15);
  return canvas;
}

function generateSandTexture(): HTMLCanvasElement {
  const size = 512;
  const [canvas, ctx] = makeCanvas(size);
  ctx.fillStyle = '#d4c4a0';
  ctx.fillRect(0, 0, size, size);

  const rand = seededRand(707);
  // Fine sand grains
  for (let i = 0; i < 6000; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 0.5 + rand() * 1.5;
    ctx.fillStyle = rand() > 0.5 ? '#c8b890' : '#ddd0b0';
    ctx.globalAlpha = 0.2 + rand() * 0.3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Soft wind ripple lines
  for (let i = 0; i < 12; i++) {
    const y = rand() * size;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= size; x += 20) {
      ctx.lineTo(x, y + Math.sin(x * 0.02 + rand() * 3) * 6);
    }
    ctx.strokeStyle = '#c4b490';
    ctx.lineWidth = 1 + rand() * 2;
    ctx.globalAlpha = 0.08 + rand() * 0.08;
    ctx.stroke();
  }
  applyNoise(ctx, size, 12);
  return canvas;
}

function generateDirtTexture(): HTMLCanvasElement {
  const size = 512;
  const [canvas, ctx] = makeCanvas(size);
  ctx.fillStyle = '#7a6040';
  ctx.fillRect(0, 0, size, size);

  const rand = seededRand(808);
  const browns = ['#6a5030', '#8a7050', '#5a4020', '#947858', '#6e5438'];

  // Clumps and variation
  for (let i = 0; i < 800; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 3 + rand() * 15;
    ctx.fillStyle = browns[Math.floor(rand() * browns.length)];
    ctx.globalAlpha = 0.15 + rand() * 0.25;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Small pebbles
  for (let i = 0; i < 400; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 1 + rand() * 3;
    ctx.fillStyle = rand() > 0.5 ? '#9a8868' : '#5a4a30';
    ctx.globalAlpha = 0.3 + rand() * 0.4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  applyNoise(ctx, size, 22);
  return canvas;
}

// ---------- material list ----------

export const GROUND_MATERIALS: GroundMaterialConfig[] = [
  { id: 'grass',      label: 'Grass',      color: '#5a8a3c', roughness: 0.95, metalness: 0,    textureGenerator: generateGrassTexture,    tileRepeat: 10 },
  { id: 'stone',      label: 'Stone',      color: '#8a8a85', roughness: 0.85, metalness: 0.05, textureGenerator: generateStoneTexture,    tileRepeat: 6 },
  { id: 'concrete',   label: 'Concrete',   color: '#b0b0aa', roughness: 0.75, metalness: 0,    textureGenerator: generateConcreteTexture,  tileRepeat: 4 },
  { id: 'gravel',     label: 'Gravel',     color: '#9a9080', roughness: 1.0,  metalness: 0,    textureGenerator: generateGravelTexture,   tileRepeat: 8 },
  { id: 'wood-deck',  label: 'Wood Deck',  color: '#8b6842', roughness: 0.6,  metalness: 0,    textureGenerator: generateWoodDeckTexture,  tileRepeat: 5 },
  { id: 'pavers',     label: 'Pavers',     color: '#c4a882', roughness: 0.7,  metalness: 0,    textureGenerator: generatePaversTexture,   tileRepeat: 4 },
  { id: 'mulch',      label: 'Mulch',      color: '#5c3d2e', roughness: 1.0,  metalness: 0,    textureGenerator: generateMulchTexture,    tileRepeat: 8 },
  { id: 'sand',       label: 'Sand',       color: '#d4c4a0', roughness: 0.9,  metalness: 0,    textureGenerator: generateSandTexture,     tileRepeat: 6 },
  { id: 'dirt',       label: 'Dirt',       color: '#7a6040', roughness: 0.95, metalness: 0,    textureGenerator: generateDirtTexture,     tileRepeat: 7 },
  { id: 'custom',     label: 'Custom',     color: '#888888', roughness: 0.7,  metalness: 0 },
];

export function getGroundMaterial(id: GroundMaterial): GroundMaterialConfig {
  return GROUND_MATERIALS.find((m) => m.id === id) ?? GROUND_MATERIALS[0];
}
