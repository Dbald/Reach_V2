/**
 * Built-in Asset Catalog
 * Provides browsable categories of assets including procedural primitives
 * and Sketchfab search integration.
 */

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
  { id: 'tree-oak',        name: 'Oak Tree',          category: 'plants', type: 'primitive', primitive: { shape: 'sphere', scale: [2, 4, 2], color: '#3a7a2a', yOffset: 2 }, tags: ['tree', 'large'] },
  { id: 'tree-pine',       name: 'Pine Tree',         category: 'plants', type: 'primitive', primitive: { shape: 'cylinder', scale: [1, 5, 1], color: '#2d5a1e', yOffset: 2.5 }, tags: ['tree', 'evergreen'] },
  { id: 'shrub-round',     name: 'Round Shrub',       category: 'plants', type: 'primitive', primitive: { shape: 'sphere', scale: [1, 0.8, 1], color: '#4a8a3a', yOffset: 0.4 }, tags: ['shrub', 'hedge'] },
  { id: 'shrub-tall',      name: 'Tall Hedge',        category: 'plants', type: 'primitive', primitive: { shape: 'box', scale: [0.5, 1.5, 2], color: '#3d7a2d', yOffset: 0.75 }, tags: ['hedge', 'privacy'] },
  { id: 'flower-bed',      name: 'Flower Bed',        category: 'plants', type: 'primitive', primitive: { shape: 'box', scale: [2, 0.15, 1], color: '#d4a0c0', yOffset: 0.08 }, tags: ['flowers', 'ground'] },
  { id: 'planter-box',     name: 'Raised Planter',    category: 'plants', type: 'primitive', primitive: { shape: 'box', scale: [2, 0.6, 1], color: '#8b6842', yOffset: 0.3 }, tags: ['planter', 'raised-bed'] },

  // Furniture
  { id: 'chair-outdoor',   name: 'Outdoor Chair',     category: 'furniture', type: 'primitive', primitive: { shape: 'box', scale: [0.6, 0.8, 0.6], color: '#6a5040', yOffset: 0.4 }, tags: ['seating', 'chair'] },
  { id: 'bench-park',      name: 'Park Bench',        category: 'furniture', type: 'primitive', primitive: { shape: 'box', scale: [1.5, 0.5, 0.5], color: '#7a5a3a', yOffset: 0.25 }, tags: ['seating', 'bench'] },
  { id: 'table-patio',     name: 'Patio Table',       category: 'furniture', type: 'primitive', primitive: { shape: 'cylinder', scale: [1, 0.75, 1], color: '#8a8a85', yOffset: 0.38 }, tags: ['table', 'dining'] },
  { id: 'table-rectangular', name: 'Dining Table',    category: 'furniture', type: 'primitive', primitive: { shape: 'box', scale: [1.8, 0.75, 0.9], color: '#7a6a50', yOffset: 0.38 }, tags: ['table', 'dining'] },
  { id: 'lounge-chair',    name: 'Lounge Chair',      category: 'furniture', type: 'primitive', primitive: { shape: 'box', scale: [0.7, 0.4, 1.8], color: '#c4b090', yOffset: 0.2 }, tags: ['seating', 'lounge'] },
  { id: 'hammock-stand',   name: 'Hammock',           category: 'furniture', type: 'primitive', primitive: { shape: 'box', scale: [1, 1, 3], color: '#e8d8c0', yOffset: 0.5 }, tags: ['relaxation'] },

  // Structures
  { id: 'deck-platform',   name: 'Deck / Patio',      category: 'structures', type: 'primitive', primitive: { shape: 'box', scale: [4, 0.15, 3], color: '#8b6842', yOffset: 0.08 }, tags: ['deck', 'patio', 'platform'] },
  { id: 'pergola',         name: 'Pergola',           category: 'structures', type: 'primitive', primitive: { shape: 'box', scale: [3, 2.5, 3], color: '#9a7a5a', yOffset: 1.25 }, tags: ['pergola', 'shade'] },
  { id: 'shed-small',      name: 'Small Shed',        category: 'structures', type: 'primitive', primitive: { shape: 'box', scale: [2.5, 2.2, 2], color: '#7a6a55', yOffset: 1.1 }, tags: ['shed', 'storage'] },
  { id: 'gazebo',          name: 'Gazebo',            category: 'structures', type: 'primitive', primitive: { shape: 'cylinder', scale: [2, 2.5, 2], color: '#f0f0e8', yOffset: 1.25 }, tags: ['gazebo', 'shelter'] },

  // Fences
  { id: 'fence-wood',      name: 'Wood Fence',        category: 'fences', type: 'primitive', primitive: { shape: 'box', scale: [3, 1.2, 0.08], color: '#8b6842', yOffset: 0.6 }, tags: ['fence', 'privacy'] },
  { id: 'fence-picket',    name: 'Picket Fence',      category: 'fences', type: 'primitive', primitive: { shape: 'box', scale: [3, 0.9, 0.05], color: '#f0f0e8', yOffset: 0.45 }, tags: ['fence', 'decorative'] },
  { id: 'wall-stone',      name: 'Stone Wall',        category: 'fences', type: 'primitive', primitive: { shape: 'box', scale: [3, 0.8, 0.25], color: '#8a8580', yOffset: 0.4 }, tags: ['wall', 'retaining'] },
  { id: 'gate-entry',      name: 'Garden Gate',       category: 'fences', type: 'primitive', primitive: { shape: 'box', scale: [1.2, 1.4, 0.08], color: '#3a3a3a', yOffset: 0.7 }, tags: ['gate', 'entry'] },

  // Surfaces
  { id: 'path-stone',      name: 'Stone Path',        category: 'surfaces', type: 'primitive', primitive: { shape: 'box', scale: [1.2, 0.03, 5], color: '#9a9080', yOffset: 0.015 }, tags: ['path', 'walkway'] },
  { id: 'patio-area',      name: 'Patio Pad',         category: 'surfaces', type: 'primitive', primitive: { shape: 'box', scale: [4, 0.05, 4], color: '#b0a890', yOffset: 0.025 }, tags: ['patio', 'ground'] },
  { id: 'mulch-bed',       name: 'Mulch Bed',         category: 'surfaces', type: 'primitive', primitive: { shape: 'box', scale: [3, 0.08, 2], color: '#5c3d2e', yOffset: 0.04 }, tags: ['mulch', 'garden'] },
  { id: 'gravel-area',     name: 'Gravel Area',       category: 'surfaces', type: 'primitive', primitive: { shape: 'box', scale: [3, 0.04, 3], color: '#b0a890', yOffset: 0.02 }, tags: ['gravel', 'drainage'] },

  // Lighting
  { id: 'path-light',      name: 'Path Light',        category: 'lighting', type: 'primitive', primitive: { shape: 'cylinder', scale: [0.08, 0.6, 0.08], color: '#2a2a2a', yOffset: 0.3 }, tags: ['light', 'path'] },
  { id: 'spot-light-post', name: 'Spot Light',        category: 'lighting', type: 'primitive', primitive: { shape: 'cylinder', scale: [0.1, 2, 0.1], color: '#3a3a3a', yOffset: 1 }, tags: ['light', 'spot'] },
  { id: 'string-light-post', name: 'String Light Post', category: 'lighting', type: 'primitive', primitive: { shape: 'cylinder', scale: [0.05, 3, 0.05], color: '#5a5a5a', yOffset: 1.5 }, tags: ['light', 'string', 'post'] },
  { id: 'lantern',         name: 'Lantern',           category: 'lighting', type: 'primitive', primitive: { shape: 'box', scale: [0.2, 0.3, 0.2], color: '#d4a050', yOffset: 0.15 }, tags: ['light', 'decorative'] },

  // Decor
  { id: 'fire-pit',        name: 'Fire Pit',          category: 'decor', type: 'primitive', primitive: { shape: 'cylinder', scale: [0.9, 0.35, 0.9], color: '#5a5a55', yOffset: 0.18 }, tags: ['fire', 'gathering'] },
  { id: 'fountain',        name: 'Fountain',          category: 'decor', type: 'primitive', primitive: { shape: 'cylinder', scale: [0.8, 0.7, 0.8], color: '#8a8a85', yOffset: 0.35 }, tags: ['water', 'feature'] },
  { id: 'planter-pot',     name: 'Large Pot',         category: 'decor', type: 'primitive', primitive: { shape: 'cylinder', scale: [0.4, 0.5, 0.4], color: '#b07040', yOffset: 0.25 }, tags: ['pot', 'planter'] },
  { id: 'rock-boulder',    name: 'Boulder',           category: 'decor', type: 'primitive', primitive: { shape: 'sphere', scale: [0.8, 0.6, 0.7], color: '#7a7a70', yOffset: 0.3 }, tags: ['rock', 'natural'] },
  { id: 'birdbath',        name: 'Birdbath',          category: 'decor', type: 'primitive', primitive: { shape: 'cylinder', scale: [0.5, 0.8, 0.5], color: '#c0c0b8', yOffset: 0.4 }, tags: ['garden', 'feature'] },

  // Utility
  { id: 'boundary-marker', name: 'Boundary Marker',   category: 'utility', type: 'primitive', primitive: { shape: 'cylinder', scale: [0.05, 1, 0.05], color: '#ff4444', yOffset: 0.5 }, tags: ['marker', 'boundary'] },
  { id: 'measurement-post', name: 'Measure Post',     category: 'utility', type: 'primitive', primitive: { shape: 'cylinder', scale: [0.03, 1.5, 0.03], color: '#ffaa00', yOffset: 0.75 }, tags: ['measure', 'reference'] },
];

export function getCatalogByCategory(category: AssetCategory): CatalogItem[] {
  return CATALOG_ITEMS.filter((item) => item.category === category);
}
