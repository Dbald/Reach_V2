/**
 * ReferenceOverlays
 * Renders reference images/PDFs as textured planes on the ground in the 3D scene.
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import type { Scene } from '@/types';

interface ReferenceOverlayPlaneProps {
  overlay: {
    id: string;
    imageUrl: string;
    position: { x: number; z: number };
    rotation: number;
    size: { width: number; height: number };
    opacity: number;
    visible: boolean;
  };
}

const ReferenceOverlayPlane: React.FC<ReferenceOverlayPlaneProps> = ({ overlay }) => {
  const texture = useLoader(THREE.TextureLoader, overlay.imageUrl);

  useMemo(() => {
    if (texture) {
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.colorSpace = THREE.SRGBColorSpace;
    }
  }, [texture]);

  if (!overlay.visible) return null;

  return (
    <mesh
      position={[overlay.position.x, 0.005, overlay.position.z]}
      rotation={[-Math.PI / 2, 0, overlay.rotation]}
    >
      <planeGeometry args={[overlay.size.width, overlay.size.height]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={overlay.opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-1}
      />
    </mesh>
  );
};

interface ReferenceOverlaysProps {
  scene: Scene;
}

export const ReferenceOverlays: React.FC<ReferenceOverlaysProps> = ({ scene }) => {
  const overlays = scene.referenceOverlays;
  if (!overlays) return null;

  const visibleOverlays = Object.values(overlays).filter((o) => o.visible);
  if (visibleOverlays.length === 0) return null;

  return (
    <>
      {visibleOverlays.map((overlay) => (
        <React.Suspense key={overlay.id} fallback={null}>
          <ReferenceOverlayPlane overlay={overlay} />
        </React.Suspense>
      ))}
    </>
  );
};
