import type { GroundMaterial } from '@/types';

export interface GroundMaterialConfig {
  id: GroundMaterial;
  label: string;
  color: string;        // fallback color
  roughness: number;
  metalness: number;
  pattern?: 'solid' | 'checker' | 'stripe';
  patternColor?: string; // secondary color for patterns
  patternScale?: number;
  textureGenerator?: () => HTMLCanvasElement;
  tileRepeat?: number;   // how many times to repeat across ground
}

/**
 * Generates a seamless grass texture on a canvas.
 * Draws thousands of tiny grass blade strokes with color variation
 * to mimic the dense, bright-green turf look from the reference image.
 */
function generateGrassTexture(): HTMLCanvasElement {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base fill — dark green ground
  ctx.fillStyle = '#2d6b1e';
  ctx.fillRect(0, 0, size, size);

  // Seed-based pseudo-random for consistency
  let seed = 42;
  const rand = () => {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // Draw grass blades in multiple passes for depth
  const bladeCount = 8000;
  const greens = [
    '#3a8c28', '#45a030', '#2e7a1a', '#50b038',
    '#35721c', '#4d9e2e', '#5cb840', '#3e8822',
    '#2a6518', '#48a432', '#55b53a', '#327020',
  ];

  for (let i = 0; i < bladeCount; i++) {
    // Wrap coordinates so blades at edges seamlessly connect
    const bx = rand() * size;
    const by = rand() * size;
    const bladeLen = 6 + rand() * 14;
    const bladeWidth = 1 + rand() * 2;
    const angle = -Math.PI / 2 + (rand() - 0.5) * 1.2; // mostly upward, some tilt
    const color = greens[Math.floor(rand() * greens.length)];

    // Draw the blade at the primary position and wrapped positions for seamlessness
    const positions = [[bx, by]];
    if (bx < bladeLen) positions.push([bx + size, by]);
    if (bx > size - bladeLen) positions.push([bx - size, by]);
    if (by < bladeLen) positions.push([bx, by + size]);
    if (by > size - bladeLen) positions.push([bx, by - size]);

    for (const [px, py] of positions) {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.7 + rand() * 0.3;
      // Tapered blade shape
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-bladeWidth / 2, -bladeLen * 0.4);
      ctx.lineTo(0, -bladeLen);
      ctx.lineTo(bladeWidth / 2, -bladeLen * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // Add subtle noise/variation overlay
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  seed = 7;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (rand() - 0.5) * 20;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);

  return canvas;
}

export const GROUND_MATERIALS: GroundMaterialConfig[] = [
  { id: 'grass',      label: 'Grass',      color: '#5a8a3c', roughness: 0.95, metalness: 0, textureGenerator: generateGrassTexture, tileRepeat: 10 },
  { id: 'stone',      label: 'Stone',      color: '#8a8a85', roughness: 0.85, metalness: 0.05, pattern: 'checker', patternColor: '#7a7a75', patternScale: 1.5 },
  { id: 'concrete',   label: 'Concrete',   color: '#b0b0aa', roughness: 0.75, metalness: 0 },
  { id: 'gravel',     label: 'Gravel',     color: '#9a9080', roughness: 1.0, metalness: 0, pattern: 'checker', patternColor: '#8a8070', patternScale: 0.5 },
  { id: 'wood-deck',  label: 'Wood Deck',  color: '#8b6842', roughness: 0.6, metalness: 0, pattern: 'stripe', patternColor: '#7a5832', patternScale: 0.8 },
  { id: 'pavers',     label: 'Pavers',     color: '#c4a882', roughness: 0.7, metalness: 0, pattern: 'checker', patternColor: '#b09872', patternScale: 1 },
  { id: 'mulch',      label: 'Mulch',      color: '#5c3d2e', roughness: 1.0, metalness: 0, pattern: 'checker', patternColor: '#4c2d1e', patternScale: 0.4 },
  { id: 'sand',       label: 'Sand',       color: '#d4c4a0', roughness: 0.9, metalness: 0 },
  { id: 'dirt',       label: 'Dirt',       color: '#7a6040', roughness: 0.95, metalness: 0, pattern: 'checker', patternColor: '#6a5030', patternScale: 1.2 },
  { id: 'custom',     label: 'Custom',     color: '#888888', roughness: 0.7, metalness: 0 },
];

export function getGroundMaterial(id: GroundMaterial): GroundMaterialConfig {
  return GROUND_MATERIALS.find((m) => m.id === id) ?? GROUND_MATERIALS[0];
}
