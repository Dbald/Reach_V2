/**
 * Built-in Asset Catalog
 * Provides browsable categories of assets including procedural primitives
 * and Sketchfab search integration.
 */

import type { GrowthStage } from '@/types';

export type AssetCategory =
  | 'surfaces'
  | 'plants'
  | 'furniture'
  | 'fences'
  | 'decor'
  | 'lighting'
  | 'structures'
  | 'utility';

export interface CatalogCategory {
  id: AssetCategory;
  label: string;
  icon: string;
  desc: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  category: AssetCategory;
  type: 'primitive' | 'sketchfab';
  /** For primitives: shape + default scale + color */
  primitive?: {
    shape: 'box' | 'sphere' | 'cylinder' | 'plane';
    scale: [number, number, number];
    color: string;
    yOffset: number;
  };
  /** For sketchfab: UID for embedding/download */
  sketchfabUid?: string;
  tags: string[];
  /** Growth stages for time-based visualization */
  growthStages?: GrowthStage[];
  /** Ground material ID for textured surfaces */
  groundMaterial?: string;
}

export const CATALOG_CATEGORIES: CatalogCategory[] = [
  { id: 'plants',     label: 'Plants',      icon: '\u{1F331}', desc: 'Trees, shrubs, flowers' },
  { id: 'furniture',  label: 'Furniture',    icon: '\u{1FA91}', desc: 'Chairs, tables, benches' },
  { id: 'structures', label: 'Structures',   icon: '\u{1F3D7}', desc: 'Decks, pergolas, sheds' },
  { id: 'fences',     label: 'Fences',       icon: '\u{1F3DA}', desc: 'Fences, walls, gates' },
  { id: 'surfaces',   label: 'Surfaces',     icon: '\u{1F7EB}', desc: 'Paths, patios, beds' },
  { id: 'lighting',   label: 'Lighting',     icon: '\u{1F4A1}', desc: 'Path lights, string lights' },
  { id: 'decor',      label: 'Decor',        icon: '\u{1F3A8}', desc: 'Pots, fire pits, features' },
  { id: 'utility',    label: 'Utility',      icon: '\u{1F527}', desc: 'Markers, boundaries' },
];

/** Built-in procedural assets that don't require downloading */
export const CATALOG_ITEMS: CatalogItem[] = [
  // Plants
  { id: 'tree-oak', name: 'Oak Tree', category: 'plants', type: 'primitive', primitive: { shape: 'sphere', scale: [2, 4, 2], color: '#3a7a2a', yOffset: 0 }, tags: ['tree', 'large', 'growth'], growthStages: [
    { year: 1,  label: '1 Year — Sapling',     shape: 'cylinder', scale: [0.2, 1.2, 0.2], color: '#5a9a3a', yOffset: 0, info: { height: '1.2m', water: 'High', type: 'Quercus robur' } },
    { year: 3,  label: '3 Years — Young Tree',  shape: 'sphere',   scale: [0.8, 2.0, 0.8], color: '#4a8a2a', yOffset: 0, info: { height: '2.0m', water: 'Moderate', type: 'Quercus robur' } },
    { year: 5,  label: '5 Years — Juvenile',     shape: 'sphere',   scale: [1.2, 3.0, 1.2], color: '#3a7a2a', yOffset: 0, info: { height: '4m', water: 'Moderate', type: 'Quercus robur' } },
    { year: 10, label: '10 Years — Mature',      shape: 'sphere',   scale: [2.0, 4.0, 2.0], color: '#2a6a1a', yOffset: 0, info: { height: '8m', water: 'Low', type: 'Quercus robur' } },
  ] },
  { id: 'tree-pine', name: 'Pine Tree', category: 'plants', type: 'primitive', primitive: { shape: 'cylinder', scale: [1, 5, 1], color: '#2d5a1e', yOffset: 0 }, tags: ['tree', 'evergreen', 'growth'], growthStages: [
    { year: 1,  label: '1 Year — Seedling',   shape: 'cylinder', scale: [0.15, 0.8, 0.15], color: '#4d7a3e', yOffset: 0, info: { height: '0.8m', water: 'High', type: 'Pinus sylvestris' } },
    { year: 3,  label: '3 Years — Young Pine', shape: 'cylinder', scale: [0.4, 2.0, 0.4],  color: '#3d6a2e', yOffset: 0, info: { height: '2m', water: 'Moderate', type: 'Pinus sylvestris' } },
    { year: 5,  label: '5 Years — Growing',    shape: 'cylinder', scale: [0.7, 3.5, 0.7],  color: '#2d5a1e', yOffset: 0, info: { height: '5m', water: 'Low', type: 'Pinus sylvestris' } },
    { year: 10, label: '10 Years — Tall Pine',  shape: 'cylinder', scale: [1.0, 5.0, 1.0],  color: '#1d4a0e', yOffset: 0, info: { height: '10m', water: 'Low', type: 'Pinus sylvestris' } },
  ] },
  { id: 'shrub-round', name: 'Round Shrub', category: 'plants', type: 'primitive', primitive: { shape: 'sphere', scale: [1, 0.8, 1], color: '#4a8a3a', yOffset: 0 }, tags: ['shrub', 'hedge', 'growth'], growthStages: [
    { year: 1,  label: '1 Year — Small Shrub',  shape: 'sphere', scale: [0.3, 0.25, 0.3], color: '#5a9a4a', yOffset: 0, info: { height: '0.25m', water: 'Moderate' } },
    { year: 3,  label: '3 Years — Medium Shrub', shape: 'sphere', scale: [0.6, 0.5, 0.6],  color: '#4a8a3a', yOffset: 0, info: { height: '0.5m', water: 'Low' } },
    { year: 5,  label: '5 Years — Full Shrub',   shape: 'sphere', scale: [1.0, 0.8, 1.0],  color: '#3a7a2a', yOffset: 0, info: { height: '0.8m', water: 'Low' } },
  ] },
  { id: 'shrub-tall',      name: 'Tall Hedge',        category: 'plants', type: 'primitive', primitive: { shape: 'box', scale: [0.5, 1.5, 2], color: '#3d7a2d', yOffset: 0 }, tags: ['hedge', 'privacy', 'growth'], growthStages: [
    { year: 1,  label: '1 Year — New Hedge',    shape: 'box', scale: [0.3, 0.5, 1.5],  color: '#5d9a4d', yOffset: 0, info: { height: '0.5m', water: 'Moderate' } },
    { year: 3,  label: '3 Years — Growing',      shape: 'box', scale: [0.4, 1.0, 1.8],  color: '#4d8a3d', yOffset: 0, info: { height: '1m', water: 'Moderate' } },
    { year: 5,  label: '5 Years — Full Height',  shape: 'box', scale: [0.5, 1.5, 2.0],  color: '#3d7a2d', yOffset: 0, info: { height: '1.5m', water: 'Low' } },
  ] },
  { id: 'flower-bed',      name: 'Flower Bed',        category: 'plants', type: 'primitive', primitive: { shape: 'box', scale: [2, 0.15, 1], color: '#d4a0c0', yOffset: 0 }, tags: ['flowers', 'ground'] },
  { id: 'planter-box',     name: 'Raised Planter',    category: 'plants', type: 'primitive', primitive: { shape: 'box', scale: [2, 0.6, 1], color: '#8b6842', yOffset: 0 }, tags: ['planter', 'raised-bed'] },

  // Furniture
  { id: 'chair-outdoor',   name: 'Outdoor Chair',     category: 'furniture', type: 'primitive', primitive: { shape: 'box', scale: [0.6, 0.8, 0.6], color: '#6a5040', yOffset: 0 }, tags: ['seating', 'chair'] },
  { id: 'bench-park',      name: 'Park Bench',        category: 'furniture', type: 'primitive', primitive: { shape: 'box', scale: [1.5, 0.5, 0.5], color: '#7a5a3a', yOffset: 0 }, tags: ['seating', 'bench'] },
  { id: 'table-patio',     name: 'Patio Table',       category: 'furniture', type: 'primitive', primitive: { shape: 'cylinder', scale: [1, 0.75, 1], color: '#8a8a85', yOffset: 0 }, tags: ['table', 'dining'] },
  { id: 'table-rectangular', name: 'Dining Table',    category: 'furniture', type: 'primitive', primitive: { shape: 'box', scale: [1.8, 0.75, 0.9], color: '#7a6a50', yOffset: 0 }, tags: ['table', 'dining'] },
  { id: 'lounge-chair',    name: 'Lounge Chair',      category: 'furniture', type: 'primitive', primitive: { shape: 'box', scale: [0.7, 0.4, 1.8], color: '#c4b090', yOffset: 0 }, tags: ['seating', 'lounge'] },
  { id: 'hammock-stand',   name: 'Hammock',           category: 'furniture', type: 'primitive', primitive: { shape: 'box', scale: [1, 1, 3], color: '#e8d8c0', yOffset: 0 }, tags: ['relaxation'] },

  // Structures
  { id: 'deck-platform',   name: 'Deck / Patio',      category: 'structures', type: 'primitive', primitive: { shape: 'box', scale: [4, 0.15, 3], color: '#8b6842', yOffset: 0 }, tags: ['deck', 'patio', 'platform'] },
  { id: 'pergola',         name: 'Pergola',           category: 'structures', type: 'primitive', primitive: { shape: 'box', scale: [3, 2.5, 3], color: '#9a7a5a', yOffset: 0 }, tags: ['pergola', 'shade'] },
  { id: 'shed-small',      name: 'Small Shed',        category: 'structures', type: 'primitive', primitive: { shape: 'box', scale: [2.5, 2.2, 2], color: '#7a6a55', yOffset: 0 }, tags: ['shed', 'storage'] },
  { id: 'gazebo',          name: 'Gazebo',            category: 'structures', type: 'primitive', primitive: { shape: 'cylinder', scale: [2, 2.5, 2], color: '#f0f0e8', yOffset: 0 }, tags: ['gazebo', 'shelter'] },

  // Fences
  { id: 'fence-wood',      name: 'Wood Fence',        category: 'fences', type: 'primitive', primitive: { shape: 'box', scale: [3, 1.2, 0.08], color: '#8b6842', yOffset: 0 }, tags: ['fence', 'privacy'] },
  { id: 'fence-picket',    name: 'Picket Fence',      category: 'fences', type: 'primitive', primitive: { shape: 'box', scale: [3, 0.9, 0.05], color: '#f0f0e8', yOffset: 0 }, tags: ['fence', 'decorative'] },
  { id: 'wall-stone',      name: 'Stone Wall',        category: 'fences', type: 'primitive', primitive: { shape: 'box', scale: [3, 0.8, 0.25], color: '#8a8580', yOffset: 0 }, tags: ['wall', 'retaining'] },
  { id: 'gate-entry',      name: 'Garden Gate',       category: 'fences', type: 'primitive', primitive: { shape: 'box', scale: [1.2, 1.4, 0.08], color: '#3a3a3a', yOffset: 0 }, tags: ['gate', 'entry'] },

  // Surfaces — textured ground material pads
  { id: 'surface-grass',     name: 'Grass Pad',       category: 'surfaces', type: 'primitive', primitive: { shape: 'box', scale: [4, 0.04, 4], color: '#5a8a3c', yOffset: 0 }, tags: ['grass', 'ground'], groundMaterial: 'grass' },
  { id: 'surface-stone',     name: 'Stone Pad',       category: 'surfaces', type: 'primitive', primitive: { shape: 'box', scale: [4, 0.04, 4], color: '#8a8a85', yOffset: 0 }, tags: ['stone', 'ground'], groundMaterial: 'stone' },
  { id: 'surface-concrete',  name: 'Concrete Pad',    category: 'surfaces', type: 'primitive', primitive: { shape: 'box', scale: [4, 0.05, 4], color: '#b0b0aa', yOffset: 0 }, tags: ['concrete', 'patio'], groundMaterial: 'concrete' },
  { id: 'surface-gravel',    name: 'Gravel Area',     category: 'surfaces', type: 'primitive', primitive: { shape: 'box', scale: [3, 0.04, 3], color: '#9a9080', yOffset: 0 }, tags: ['gravel', 'drainage'], groundMaterial: 'gravel' },
  { id: 'surface-wooddeck',  name: 'Wood Deck',       category: 'surfaces', type: 'primitive', primitive: { shape: 'box', scale: [4, 0.12, 3], color: '#8b6842', yOffset: 0 }, tags: ['deck', 'wood'], groundMaterial: 'wood-deck' },
  { id: 'surface-pavers',    name: 'Paver Patio',     category: 'surfaces', type: 'primitive', primitive: { shape: 'box', scale: [4, 0.05, 4], color: '#c4a882', yOffset: 0 }, tags: ['pavers', 'patio'], groundMaterial: 'pavers' },
  { id: 'surface-mulch',     name: 'Mulch Bed',       category: 'surfaces', type: 'primitive', primitive: { shape: 'box', scale: [3, 0.08, 2], color: '#5c3d2e', yOffset: 0 }, tags: ['mulch', 'garden'], groundMaterial: 'mulch' },
  { id: 'surface-sand',      name: 'Sand Area',       category: 'surfaces', type: 'primitive', primitive: { shape: 'box', scale: [3, 0.04, 3], color: '#d4c4a0', yOffset: 0 }, tags: ['sand', 'beach'], groundMaterial: 'sand' },
  { id: 'surface-dirt',      name: 'Dirt Patch',      category: 'surfaces', type: 'primitive', primitive: { shape: 'box', scale: [3, 0.04, 3], color: '#7a6040', yOffset: 0 }, tags: ['dirt', 'earth'], groundMaterial: 'dirt' },
  // Paths (straight segments)
  { id: 'path-stone',        name: 'Stone Path',      category: 'surfaces', type: 'primitive', primitive: { shape: 'box', scale: [1.2, 0.03, 5], color: '#8a8a85', yOffset: 0 }, tags: ['path', 'walkway'], groundMaterial: 'stone' },
  { id: 'path-concrete',     name: 'Concrete Path',   category: 'surfaces', type: 'primitive', primitive: { shape: 'box', scale: [1.2, 0.03, 5], color: '#b0b0aa', yOffset: 0 }, tags: ['path', 'walkway'], groundMaterial: 'concrete' },
  { id: 'path-gravel',       name: 'Gravel Path',     category: 'surfaces', type: 'primitive', primitive: { shape: 'box', scale: [1.2, 0.03, 5], color: '#9a9080', yOffset: 0 }, tags: ['path', 'walkway'], groundMaterial: 'gravel' },
  { id: 'path-pavers',       name: 'Paver Path',      category: 'surfaces', type: 'primitive', primitive: { shape: 'box', scale: [1.2, 0.03, 5], color: '#c4a882', yOffset: 0 }, tags: ['path', 'walkway'], groundMaterial: 'pavers' },
  // Curve path tool
  { id: 'curve-path',        name: 'Curve Path',      category: 'surfaces', type: 'primitive', primitive: { shape: 'box', scale: [1, 0.03, 1], color: '#8a8a85', yOffset: 0 }, tags: ['path', 'curve', 'walkway'], groundMaterial: 'stone' },

  // Lighting
  { id: 'path-light',      name: 'Path Light',        category: 'lighting', type: 'primitive', primitive: { shape: 'cylinder', scale: [0.08, 0.6, 0.08], color: '#2a2a2a', yOffset: 0 }, tags: ['light', 'path'] },
  { id: 'spot-light-post', name: 'Spot Light',        category: 'lighting', type: 'primitive', primitive: { shape: 'cylinder', scale: [0.1, 2, 0.1], color: '#3a3a3a', yOffset: 0 }, tags: ['light', 'spot'] },
  { id: 'string-light-post', name: 'String Light Post', category: 'lighting', type: 'primitive', primitive: { shape: 'cylinder', scale: [0.05, 3, 0.05], color: '#5a5a5a', yOffset: 0 }, tags: ['light', 'string', 'post'] },
  { id: 'lantern',         name: 'Lantern',           category: 'lighting', type: 'primitive', primitive: { shape: 'box', scale: [0.2, 0.3, 0.2], color: '#d4a050', yOffset: 0 }, tags: ['light', 'decorative'] },

  // Decor
  { id: 'fire-pit',        name: 'Fire Pit',          category: 'decor', type: 'primitive', primitive: { shape: 'cylinder', scale: [0.9, 0.35, 0.9], color: '#5a5a55', yOffset: 0 }, tags: ['fire', 'gathering'] },
  { id: 'fountain',        name: 'Fountain',          category: 'decor', type: 'primitive', primitive: { shape: 'cylinder', scale: [0.8, 0.7, 0.8], color: '#8a8a85', yOffset: 0 }, tags: ['water', 'feature'] },
  { id: 'planter-pot',     name: 'Large Pot',         category: 'decor', type: 'primitive', primitive: { shape: 'cylinder', scale: [0.4, 0.5, 0.4], color: '#b07040', yOffset: 0 }, tags: ['pot', 'planter'] },
  { id: 'rock-boulder',    name: 'Boulder',           category: 'decor', type: 'primitive', primitive: { shape: 'sphere', scale: [0.8, 0.6, 0.7], color: '#7a7a70', yOffset: 0 }, tags: ['rock', 'natural'] },
  { id: 'birdbath',        name: 'Birdbath',          category: 'decor', type: 'primitive', primitive: { shape: 'cylinder', scale: [0.5, 0.8, 0.5], color: '#c0c0b8', yOffset: 0 }, tags: ['garden', 'feature'] },

  // Utility
  { id: 'boundary-marker', name: 'Boundary Marker',   category: 'utility', type: 'primitive', primitive: { shape: 'cylinder', scale: [0.05, 1, 0.05], color: '#ff4444', yOffset: 0 }, tags: ['marker', 'boundary'] },
  { id: 'measurement-post', name: 'Measure Post',     category: 'utility', type: 'primitive', primitive: { shape: 'cylinder', scale: [0.03, 1.5, 0.03], color: '#ffaa00', yOffset: 0 }, tags: ['measure', 'reference'] },
];

export function getCatalogByCategory(category: AssetCategory): CatalogItem[] {
  return CATALOG_ITEMS.filter((item) => item.category === category);
}
