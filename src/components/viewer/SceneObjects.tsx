import React, { useRef } from 'react';
import * as THREE from 'three';
import { useProjectStore } from '@/store';
import type { Scene, SceneObject } from '@/types';

interface SceneObjectsProps {
  scene: Scene;
}

export const SceneObjects: React.FC<SceneObjectsProps> = ({ scene }) => {
  const objects = Object.values(scene.objects).filter((obj) => obj.visible);

  return (
    <group>
      {objects.map((obj) => (
        <SceneObjectMesh key={obj.id} object={obj} />
      ))}
    </group>
  );
};

const SceneObjectMesh: React.FC<{ object: SceneObject }> = ({ object: obj }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const selectObject = useProjectStore((s) => s.selectObject);
  const selectedObjectId = useProjectStore((s) => s.editor.selectedObjectId);
  const isSelected = selectedObjectId === obj.id;

  const pos: [number, number, number] = [
    obj.transform.position.x,
    obj.transform.position.y,
    obj.transform.position.z,
  ];
  const scale: [number, number, number] = [
    obj.transform.scale.x,
    obj.transform.scale.y,
    obj.transform.scale.z,
  ];

  const handleClick = (e: THREE.Event) => {
    e.stopPropagation();
    selectObject(obj.id);
  };

  // Color based on tags/type for template objects
  const getColor = (): string => {
    if (obj.material?.color) {
      const c = obj.material.color;
      return `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`;
    }
    if (obj.tags.includes('structure')) return '#8b7355';
    if (obj.tags.includes('path') || obj.tags.includes('hardscape') || obj.tags.includes('driveway')) return '#a0a0a0';
    if (obj.tags.includes('plant') || obj.tags.includes('tree')) return '#4a7c3f';
    if (obj.tags.includes('garden') || obj.tags.includes('planting') || obj.tags.includes('garden-bed')) return '#5a3a1a';
    if (obj.tags.includes('boundary') || obj.tags.includes('fence')) return '#6b5b4a';
    if (obj.tags.includes('water')) return '#4a8bb5';
    if (obj.tags.includes('seating') || obj.tags.includes('furniture')) return '#8b6e5a';
    if (obj.tags.includes('wall')) return '#d4c8b8';
    if (obj.tags.includes('stage')) return '#5a5a5a';
    if (obj.tags.includes('entrance') || obj.tags.includes('signage')) return '#cc8844';
    if (obj.type === 'light') return '#ffe066';
    if (obj.type === 'label') return '#66aaff';
    return '#6b7280';
  };

  if (obj.type === 'light') {
    return (
      <group position={pos}>
        <pointLight intensity={1} distance={10} color="#fff5e0" />
        <mesh ref={meshRef} scale={scale} onClick={handleClick}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshBasicMaterial color="#ffe066" />
        </mesh>
      </group>
    );
  }

  return (
    <mesh
      ref={meshRef}
      position={pos}
      scale={scale}
      onClick={handleClick}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={getColor()}
        transparent={isSelected}
        opacity={isSelected ? 0.85 : 1}
        roughness={0.7}
        metalness={0.1}
      />
      {isSelected && (
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(1.02, 1.02, 1.02)]} />
          <lineBasicMaterial color="#3b82f6" linewidth={2} />
        </lineSegments>
      )}
    </mesh>
  );
};
