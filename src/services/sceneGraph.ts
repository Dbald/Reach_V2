/**
 * Scene Graph Service
 * Provides pure functions for querying and manipulating the scene graph.
 * Maps to PRD section 2.3 - Scene graph service component.
 */

import type { Scene, SceneObject, Zone, Viewpoint, Vector3 } from '@/types';

/** Get all root-level objects (no parent) */
export function getRootObjects(scene: Scene): SceneObject[] {
  return Object.values(scene.objects).filter((obj) => obj.parentId === null);
}

/** Get children of a given object */
export function getChildren(scene: Scene, parentId: string): SceneObject[] {
  return Object.values(scene.objects).filter((obj) => obj.parentId === parentId);
}

/** Build a flat ordered list representing the hierarchy (depth-first) */
export function getHierarchy(scene: Scene): Array<{ object: SceneObject; depth: number }> {
  const result: Array<{ object: SceneObject; depth: number }> = [];

  function walk(parentId: string | null, depth: number) {
    const children = Object.values(scene.objects)
      .filter((obj) => obj.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const child of children) {
      result.push({ object: child, depth });
      walk(child.id, depth + 1);
    }
  }

  walk(null, 0);
  return result;
}

/** Get the entry viewpoint for a scene */
export function getEntryViewpoint(scene: Scene): Viewpoint | undefined {
  return Object.values(scene.viewpoints).find((vp) => vp.isEntry);
}

/** Get all walkable zones */
export function getWalkableZones(scene: Scene): Zone[] {
  return Object.values(scene.zones).filter((z) => z.walkable);
}

/** Get all collision zones */
export function getCollisionZones(scene: Scene): Zone[] {
  return Object.values(scene.zones).filter((z) => z.hasCollision);
}

/** Compute bounding box of all objects (rough, position-based) */
export function getSceneBounds(scene: Scene): { min: Vector3; max: Vector3 } {
  const positions = Object.values(scene.objects).map((o) => o.transform.position);
  if (positions.length === 0) {
    return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
  }
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const p of positions) {
    min.x = Math.min(min.x, p.x);
    min.y = Math.min(min.y, p.y);
    min.z = Math.min(min.z, p.z);
    max.x = Math.max(max.x, p.x);
    max.y = Math.max(max.y, p.y);
    max.z = Math.max(max.z, p.z);
  }
  return { min, max };
}

/** Count objects by type */
export function getObjectCounts(scene: Scene): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const obj of Object.values(scene.objects)) {
    counts[obj.type] = (counts[obj.type] ?? 0) + 1;
  }
  return counts;
}
