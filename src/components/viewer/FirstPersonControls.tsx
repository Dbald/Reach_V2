import { useRef, useEffect, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Scene } from '@/types';

const MOVE_SPEED = 5;
const LOOK_SPEED = 0.002;
const EYE_HEIGHT = 1.7;
const PLAYER_RADIUS = 0.3;

/**
 * WASD + mouse first-person controls for preview mode.
 * Click the canvas to lock the pointer; Escape to release.
 * Respects collision on objects and zones that have hasCollision enabled.
 */
export const FirstPersonControls: React.FC<{ scene?: Scene }> = ({ scene }) => {
  const { camera, gl } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const locked = useRef(false);

  // Build collision boxes from scene objects and zones
  const colliders = useMemo(() => {
    if (!scene) return [];
    const boxes: THREE.Box3[] = [];

    // Objects with hasCollision metadata
    for (const obj of Object.values(scene.objects)) {
      if (!obj.visible || !obj.metadata?.hasCollision) continue;

      const pos = obj.transform.position;
      const scl = obj.transform.scale;
      const shape = (obj.metadata?.collisionShape as string) || 'auto';

      // Determine half-extents based on collision shape or object shape
      let hx = (scl.x || 1) * 0.5;
      let hy = (scl.y || 1) * 0.5;
      let hz = (scl.z || 1) * 0.5;

      if (shape === 'sphere') {
        const r = Math.max(hx, hy, hz);
        hx = hy = hz = r;
      }

      // For GLTF assets, use a larger default box (~2 units tall from auto-scale)
      if (obj.assetId) {
        hx = Math.max(hx, 0.5);
        hy = Math.max(hy, 1);
        hz = Math.max(hz, 0.5);
      }

      const box = new THREE.Box3(
        new THREE.Vector3(pos.x - hx, pos.y - hy, pos.z - hz),
        new THREE.Vector3(pos.x + hx, pos.y + hy, pos.z + hz),
      );
      boxes.push(box);
    }

    // Zones with hasCollision
    for (const zone of Object.values(scene.zones)) {
      if (!zone.hasCollision) continue;
      const origin = zone.points[0] || { x: 0, y: 0, z: 0 };
      const size = zone.size;
      const hx = (size.x || 4) * 0.5;
      const hy = (size.y || 2.5) * 0.5;
      const hz = (size.z || 4) * 0.5;
      const box = new THREE.Box3(
        new THREE.Vector3(origin.x - hx, origin.y, origin.z - hz),
        new THREE.Vector3(origin.x + hx, origin.y + hy * 2, origin.z + hz),
      );
      boxes.push(box);
    }

    return boxes;
  }, [scene]);

  // Set initial camera to active camera position or default
  useEffect(() => {
    if (scene) {
      const activeCamera = Object.values(scene.objects).find(
        (obj) => obj.type === 'camera' && obj.metadata?.isEntry
      );
      if (activeCamera) {
        const pos = activeCamera.transform.position;
        const rot = activeCamera.transform.rotation;
        camera.position.set(pos.x, EYE_HEIGHT, pos.z);
        euler.current.set(rot.x, rot.y, rot.z, 'YXZ');
        camera.quaternion.setFromEuler(euler.current);
        return;
      }
    }
    camera.position.set(0, EYE_HEIGHT, 5);
    euler.current.setFromQuaternion(camera.quaternion, 'YXZ');
  }, [camera, scene]);

  // Pointer lock on click
  useEffect(() => {
    const canvas = gl.domElement;

    const requestLock = () => {
      canvas.requestPointerLock();
    };

    const onLockChange = () => {
      locked.current = document.pointerLockElement === canvas;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!locked.current) return;
      euler.current.y -= e.movementX * LOOK_SPEED;
      euler.current.x -= e.movementY * LOOK_SPEED;
      euler.current.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, euler.current.x));
      camera.quaternion.setFromEuler(euler.current);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };

    canvas.addEventListener('click', requestLock);
    document.addEventListener('pointerlockchange', onLockChange);
    document.addEventListener('mousemove', onMouseMove);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      canvas.removeEventListener('click', requestLock);
      document.removeEventListener('pointerlockchange', onLockChange);
      document.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (document.pointerLockElement === canvas) {
        document.exitPointerLock();
      }
    };
  }, [camera, gl]);

  // Movement each frame with collision detection
  useFrame((_, delta) => {
    const k = keys.current;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, camera.up).normalize();

    const move = new THREE.Vector3();

    if (k['w'] || k['arrowup']) move.add(forward);
    if (k['s'] || k['arrowdown']) move.sub(forward);
    if (k['a'] || k['arrowleft']) move.sub(right);
    if (k['d'] || k['arrowright']) move.add(right);

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(MOVE_SPEED * delta);

      const newPos = camera.position.clone().add(move);
      newPos.y = EYE_HEIGHT;

      // Check collision — model the player as a small sphere at foot level
      const playerBox = new THREE.Box3(
        new THREE.Vector3(newPos.x - PLAYER_RADIUS, 0, newPos.z - PLAYER_RADIUS),
        new THREE.Vector3(newPos.x + PLAYER_RADIUS, EYE_HEIGHT, newPos.z + PLAYER_RADIUS),
      );

      let blocked = false;
      for (const collider of colliders) {
        if (playerBox.intersectsBox(collider)) {
          blocked = true;
          break;
        }
      }

      if (!blocked) {
        camera.position.copy(newPos);
      } else {
        // Try sliding along each axis independently
        const slideX = camera.position.clone();
        slideX.x += move.x;
        slideX.y = EYE_HEIGHT;
        const slideBoxX = new THREE.Box3(
          new THREE.Vector3(slideX.x - PLAYER_RADIUS, 0, slideX.z - PLAYER_RADIUS),
          new THREE.Vector3(slideX.x + PLAYER_RADIUS, EYE_HEIGHT, slideX.z + PLAYER_RADIUS),
        );
        let xBlocked = false;
        for (const collider of colliders) {
          if (slideBoxX.intersectsBox(collider)) { xBlocked = true; break; }
        }

        const slideZ = camera.position.clone();
        slideZ.z += move.z;
        slideZ.y = EYE_HEIGHT;
        const slideBoxZ = new THREE.Box3(
          new THREE.Vector3(slideZ.x - PLAYER_RADIUS, 0, slideZ.z - PLAYER_RADIUS),
          new THREE.Vector3(slideZ.x + PLAYER_RADIUS, EYE_HEIGHT, slideZ.z + PLAYER_RADIUS),
        );
        let zBlocked = false;
        for (const collider of colliders) {
          if (slideBoxZ.intersectsBox(collider)) { zBlocked = true; break; }
        }

        if (!xBlocked) camera.position.x = slideX.x;
        if (!zBlocked) camera.position.z = slideZ.z;
      }
    }

    // Keep at eye height
    camera.position.y = EYE_HEIGHT;
  });

  return null;
};
