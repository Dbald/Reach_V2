/**
 * Template Engine
 * Bootstraps projects from predefined templates.
 * Maps to PRD sections FR-01 and 2.3.
 */

import { v4 as uuid } from 'uuid';
import type { Project, TemplateType, SceneObject, Zone } from '@/types';
import { createProject, vec3, quat, color, defaultTransform } from '@/utils/defaults';

export interface TemplateInfo {
  type: TemplateType;
  name: string;
  description: string;
  icon: string;
  tags: string[];
}

export const TEMPLATES: TemplateInfo[] = [
  {
    type: 'yard-plan',
    name: 'Yard Plan',
    description: 'Plan a yard or property layout with boundaries, plants, paths, and structures.',
    icon: '🏡',
    tags: ['landscaping', 'outdoor', 'property'],
  },
  {
    type: 'garden-layout',
    name: 'Garden Layout',
    description: 'Design a garden with planting beds, paths, water features, and seating.',
    icon: '🌿',
    tags: ['garden', 'plants', 'outdoor'],
  },
  {
    type: 'event-space',
    name: 'Event Space',
    description: 'Set up an event venue with seating, stages, signage, and flow zones.',
    icon: '🎪',
    tags: ['events', 'venue', 'indoor'],
  },
  {
    type: 'room-layout',
    name: 'Room Layout',
    description: 'Plan an interior room with furniture, lighting, and spatial arrangement.',
    icon: '🛋️',
    tags: ['interior', 'room', 'furniture'],
  },
  {
    type: 'blank',
    name: 'Blank Scene',
    description: 'Start from scratch with a ground plane and camera.',
    icon: '📐',
    tags: ['custom', 'blank'],
  },
];

/** Get template info by type */
export function getTemplateInfo(type: TemplateType): TemplateInfo | undefined {
  return TEMPLATES.find((t) => t.type === type);
}

/** Create a project from a template, pre-populated with starter content */
export function createFromTemplate(name: string, templateType: TemplateType): Project {
  const project = createProject(name, templateType);
  const sceneId = Object.keys(project.scenes)[0];
  const scene = project.scenes[sceneId];

  switch (templateType) {
    case 'yard-plan':
      applyYardPlanTemplate(scene, sceneId);
      break;
    case 'garden-layout':
      applyGardenLayoutTemplate(scene, sceneId);
      break;
    case 'event-space':
      applyEventSpaceTemplate(scene, sceneId);
      break;
    case 'room-layout':
      applyRoomLayoutTemplate(scene, sceneId);
      break;
    case 'blank':
      // Blank scene - just ground plane + camera (already in defaults)
      break;
  }

  return project;
}

function makeObject(
  name: string,
  type: SceneObject['type'],
  position: [number, number, number],
  scale: [number, number, number] = [1, 1, 1],
  tags: string[] = []
): SceneObject {
  return {
    id: uuid(),
    name,
    type,
    parentId: null,
    transform: {
      position: vec3(...position),
      rotation: quat(),
      scale: vec3(...scale),
    },
    tags,
    metadata: {},
    visible: true,
    locked: false,
  };
}

function makeZone(
  name: string,
  position: [number, number, number],
  size: [number, number, number],
  walkable: boolean,
  hasCollision: boolean
): Zone {
  return {
    id: uuid(),
    name,
    shape: 'box',
    points: [vec3(...position)],
    size: vec3(...size),
    walkable,
    hasCollision,
    color: walkable ? color(0.2, 0.8, 0.3, 0.15) : color(0.8, 0.2, 0.2, 0.15),
  };
}

function applyYardPlanTemplate(scene: ReturnType<typeof Object.values<Project['scenes']>>[number], _sceneId: string) {
  scene.name = 'Yard Plan';
  scene.environment.groundColor = color(0.45, 0.55, 0.3);
  scene.environment.groundSize = vec3(30, 0.05, 30);

  const objects: SceneObject[] = [
    makeObject('House Footprint', 'mesh', [0, 0.5, -5], [8, 1, 6], ['structure']),
    makeObject('Front Path', 'mesh', [0, 0.02, 2], [1.5, 0.04, 8], ['path', 'hardscape']),
    makeObject('Driveway', 'mesh', [-6, 0.02, 0], [4, 0.04, 10], ['driveway', 'hardscape']),
    makeObject('Tree - Front Left', 'mesh', [-4, 2, 5], [2, 4, 2], ['plant', 'tree']),
    makeObject('Tree - Front Right', 'mesh', [4, 2, 6], [1.5, 3, 1.5], ['plant', 'tree']),
    makeObject('Garden Bed - North', 'mesh', [6, 0.15, -2], [3, 0.3, 6], ['garden', 'planting']),
    makeObject('Fence - East', 'mesh', [14, 0.6, 0], [0.1, 1.2, 28], ['boundary', 'fence']),
    makeObject('Fence - West', 'mesh', [-14, 0.6, 0], [0.1, 1.2, 28], ['boundary', 'fence']),
  ];

  for (const obj of objects) {
    scene.objects[obj.id] = obj;
  }

  const zones: Zone[] = [
    makeZone('Front Yard Walk Zone', [0, 0, 4], [28, 2, 12], true, false),
    makeZone('House Boundary', [0, 0, -5], [9, 3, 7], false, true),
  ];
  for (const zone of zones) {
    scene.zones[zone.id] = zone;
  }
}

function applyGardenLayoutTemplate(scene: ReturnType<typeof Object.values<Project['scenes']>>[number], _sceneId: string) {
  scene.name = 'Garden Layout';
  scene.environment.groundColor = color(0.35, 0.5, 0.25);
  scene.environment.groundSize = vec3(20, 0.05, 20);

  const objects: SceneObject[] = [
    makeObject('Central Path', 'mesh', [0, 0.02, 0], [1.2, 0.04, 18], ['path']),
    makeObject('Raised Bed - Left', 'mesh', [-4, 0.3, -3], [4, 0.6, 3], ['garden-bed']),
    makeObject('Raised Bed - Right', 'mesh', [4, 0.3, -3], [4, 0.6, 3], ['garden-bed']),
    makeObject('Water Feature', 'mesh', [0, 0.2, -7], [2, 0.4, 2], ['water']),
    makeObject('Bench', 'mesh', [5, 0.4, 5], [1.5, 0.8, 0.6], ['seating']),
    makeObject('Pergola', 'mesh', [0, 1.5, 6], [4, 3, 3], ['structure']),
  ];
  for (const obj of objects) scene.objects[obj.id] = obj;

  const walkZone = makeZone('Garden Walk', [0, 0, 0], [18, 2, 18], true, false);
  scene.zones[walkZone.id] = walkZone;
}

function applyEventSpaceTemplate(scene: ReturnType<typeof Object.values<Project['scenes']>>[number], _sceneId: string) {
  scene.name = 'Event Space';
  scene.environment.groundColor = color(0.7, 0.7, 0.7);
  scene.environment.groundSize = vec3(40, 0.05, 30);

  const objects: SceneObject[] = [
    makeObject('Stage', 'mesh', [0, 0.4, -10], [8, 0.8, 4], ['stage']),
    makeObject('Seating Block - Left', 'mesh', [-5, 0.3, 0], [6, 0.6, 8], ['seating']),
    makeObject('Seating Block - Right', 'mesh', [5, 0.3, 0], [6, 0.6, 8], ['seating']),
    makeObject('Entrance Gate', 'mesh', [0, 1.5, 12], [4, 3, 0.3], ['entrance']),
    makeObject('Sign - Welcome', 'label', [0, 3, 12], [3, 1, 0.1], ['signage']),
  ];
  for (const obj of objects) scene.objects[obj.id] = obj;

  const zones: Zone[] = [
    makeZone('Main Floor', [0, 0, 0], [36, 2, 24], true, false),
    makeZone('Stage Area', [0, 0, -10], [9, 3, 5], false, true),
  ];
  for (const zone of zones) scene.zones[zone.id] = zone;
}

function applyRoomLayoutTemplate(scene: ReturnType<typeof Object.values<Project['scenes']>>[number], _sceneId: string) {
  scene.name = 'Room Layout';
  scene.environment.groundColor = color(0.82, 0.76, 0.66);
  scene.environment.groundSize = vec3(8, 0.05, 6);
  scene.environment.ambientLightIntensity = 0.8;

  const objects: SceneObject[] = [
    makeObject('Wall - North', 'mesh', [0, 1.3, -3], [8, 2.6, 0.15], ['wall']),
    makeObject('Wall - South', 'mesh', [0, 1.3, 3], [8, 2.6, 0.15], ['wall']),
    makeObject('Wall - East', 'mesh', [4, 1.3, 0], [0.15, 2.6, 6], ['wall']),
    makeObject('Wall - West', 'mesh', [-4, 1.3, 0], [0.15, 2.6, 6], ['wall']),
    makeObject('Sofa', 'mesh', [0, 0.4, 1.5], [2.2, 0.8, 0.8], ['furniture', 'seating']),
    makeObject('Coffee Table', 'mesh', [0, 0.25, 0.2], [1.2, 0.5, 0.6], ['furniture']),
    makeObject('Bookshelf', 'mesh', [-3.5, 0.9, 0], [0.5, 1.8, 1.5], ['furniture', 'storage']),
    makeObject('Ceiling Light', 'light', [0, 2.5, 0], [0.3, 0.1, 0.3], ['lighting']),
  ];
  for (const obj of objects) scene.objects[obj.id] = obj;

  const roomZone = makeZone('Room Floor', [0, 0, 0], [7.5, 2.6, 5.5], true, false);
  scene.zones[roomZone.id] = roomZone;
}
