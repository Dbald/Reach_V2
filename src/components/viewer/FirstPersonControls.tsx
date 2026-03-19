import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const MOVE_SPEED = 5;
const LOOK_SPEED = 0.002;
const EYE_HEIGHT = 1.7;

/**
 * WASD + mouse first-person controls for preview mode.
 * Click the canvas to lock the pointer; Escape to release.
 */
export const FirstPersonControls: React.FC = () => {
  const { camera, gl } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const locked = useRef(false);

  // Set initial camera to eye height
  useEffect(() => {
    camera.position.set(0, EYE_HEIGHT, 5);
    euler.current.setFromQuaternion(camera.quaternion, 'YXZ');
  }, [camera]);

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

  // Movement each frame
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
      camera.position.add(move);
    }

    // Keep at eye height
    camera.position.y = EYE_HEIGHT;
  });

  return null;
};
