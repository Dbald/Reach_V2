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
}

export const GROUND_MATERIALS: GroundMaterialConfig[] = [
  { id: 'grass',      label: 'Grass',      color: '#5a8a3c', roughness: 0.95, metalness: 0, pattern: 'checker', patternColor: '#4d7a33', patternScale: 2 },
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
