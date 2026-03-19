import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { TransformControls, Html, Text as DreiText } from '@react-three/drei';
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
        <SceneObjectMesh key={obj.id} object={obj} sceneId={scene.id} />
      ))}
    </group>
  );
};

const toolToMode = (tool: string): 'translate' | 'rotate' | 'scale' | null => {
  switch (tool) {
    case 'move': return 'translate';
    case 'rotate': return 'rotate';
    case 'scale': return 'scale';
    default: return null;
  }
};

const SceneObjectMesh: React.FC<{ object: SceneObject; sceneId: string }> = ({ object: obj, sceneId }) => {
  const [meshReady, setMeshReady] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  const transformRef = useRef<any>(null);
  const selectObject = useProjectStore((s) => s.selectObject);
  const setObjectTransform = useProjectStore((s) => s.setObjectTransform);
  const selectedObjectId = useProjectStore((s) => s.editor.selectedObjectId);
  const activeTool = useProjectStore((s) => s.editor.activeTool);
  const isSelected = selectedObjectId === obj.id;

  const gizmoMode = toolToMode(activeTool);
  const showGizmo = isSelected && gizmoMode !== null && meshReady;

  const meshCallback = useCallback((node: THREE.Mesh | null) => {
    (meshRef as any).current = node;
    setMeshReady(!!node);
  }, []);

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
  const rotation: [number, number, number] = [
    obj.transform.rotation.x,
    obj.transform.rotation.y,
    obj.transform.rotation.z,
  ];

  useEffect(() => {
    const controls = transformRef.current;
    if (!controls) return;
    const handleChange = () => {
      if (!meshRef.current) return;
      const m = meshRef.current;
      setObjectTransform(sceneId, obj.id, {
        position: { x: m.position.x, y: m.position.y, z: m.position.z },
        rotation: { x: m.rotation.x, y: m.rotation.y, z: m.rotation.z, w: 1 },
        scale: { x: m.scale.x, y: m.scale.y, z: m.scale.z },
      });
    };
    controls.addEventListener('mouseUp', handleChange);
    return () => controls.removeEventListener('mouseUp', handleChange);
  }, [showGizmo, sceneId, obj.id, setObjectTransform]);

  const handleClick = (e: any) => {
    e.stopPropagation();
    selectObject(obj.id);
  };

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
    if (obj.type === 'label' || obj.type === 'text') return '#66aaff';
    if (obj.type === 'video') return '#a855f7';
    if (obj.type === 'audio') return '#f97316';
    if (obj.type === 'camera') return '#06b6d4';
    return '#6b7280';
  };

  const gizmoElement = showGizmo && meshRef.current ? (
    <TransformControls
      ref={transformRef}
      object={meshRef.current}
      mode={gizmoMode!}
      size={0.75}
    />
  ) : null;

  const selectionOutline = isSelected ? (
    <lineSegments>
      <edgesGeometry args={[new THREE.BoxGeometry(1.02, 1.02, 1.02)]} />
      <lineBasicMaterial color="#3b82f6" linewidth={2} />
    </lineSegments>
  ) : null;

  // --- Light ---
  if (obj.type === 'light') {
    return (
      <group position={pos}>
        <pointLight intensity={1} distance={10} color="#fff5e0" />
        <mesh ref={meshCallback as any} scale={scale} onClick={handleClick}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial color="#ffe066" />
        </mesh>
        {isSelected && (
          <Html center style={{ pointerEvents: 'none' }}>
            <div style={labelStyle('#ffe066')}>Light</div>
          </Html>
        )}
        {gizmoElement}
      </group>
    );
  }

  // --- Camera ---
  if (obj.type === 'camera') {
    return (
      <>
        <group position={pos} rotation={rotation}>
          <mesh ref={meshCallback as any} scale={scale} onClick={handleClick}>
            <coneGeometry args={[0.2, 0.4, 4]} />
            <meshStandardMaterial color="#06b6d4" roughness={0.5} />
          </mesh>
          {/* Lens indicator */}
          <mesh position={[0, -0.25, 0]}>
            <cylinderGeometry args={[0.08, 0.12, 0.1, 16]} />
            <meshBasicMaterial color="#0891b2" />
          </mesh>
          {isSelected && (
            <Html center position={[0, 0.5, 0]} style={{ pointerEvents: 'none' }}>
              <div style={labelStyle('#06b6d4')}>{obj.name}</div>
            </Html>
          )}
        </group>
        {gizmoElement}
      </>
    );
  }

  // --- Text ---
  if (obj.type === 'text' || obj.type === 'label') {
    const displayText = (obj.metadata?.text as string) || obj.name;
    return (
      <>
        <group position={pos} rotation={rotation}>
          <DreiText
            ref={meshCallback as any}
            fontSize={0.4}
            color="#e2e8f0"
            anchorX="center"
            anchorY="middle"
            onClick={handleClick}
          >
            {displayText}
          </DreiText>
          {isSelected && (
            <mesh position={[0, 0, -0.05]} scale={[displayText.length * 0.25 + 0.4, 0.6, 0.05]}>
              <boxGeometry />
              <meshBasicMaterial color="#3b82f6" transparent opacity={0.15} />
            </mesh>
          )}
        </group>
        {gizmoElement}
      </>
    );
  }

  // --- Video ---
  if (obj.type === 'video') {
    return (
      <>
        <mesh
          ref={meshCallback as any}
          position={pos}
          scale={[scale[0] * 1.6, scale[1] * 0.9, 0.05]}
          rotation={rotation}
          onClick={handleClick}
          castShadow
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#1a1a2e" roughness={0.3} metalness={0.6} />
          {selectionOutline}
        </mesh>
        {/* Play icon overlay */}
        <group position={[pos[0], pos[1], pos[2] + 0.03]}>
          <mesh rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.15, 0.25, 3]} />
            <meshBasicMaterial color="#a855f7" transparent opacity={0.8} />
          </mesh>
        </group>
        {isSelected && (
          <Html center position={[pos[0], pos[1] + scale[1] * 0.55, pos[2]]} style={{ pointerEvents: 'none' }}>
            <div style={labelStyle('#a855f7')}>{obj.name}</div>
          </Html>
        )}
        {gizmoElement}
      </>
    );
  }

  // --- Audio ---
  if (obj.type === 'audio') {
    return (
      <>
        <group position={pos}>
          <mesh ref={meshCallback as any} scale={[0.25, 0.25, 0.25]} onClick={handleClick}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial color="#f97316" roughness={0.4} />
          </mesh>
          {/* Sound wave rings */}
          {[0.5, 0.8, 1.1].map((r, i) => (
            <mesh key={i} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[r, 0.01, 8, 32]} />
              <meshBasicMaterial color="#f97316" transparent opacity={0.3 - i * 0.08} />
            </mesh>
          ))}
          {isSelected && (
            <Html center position={[0, 0.5, 0]} style={{ pointerEvents: 'none' }}>
              <div style={labelStyle('#f97316')}>{obj.name}</div>
            </Html>
          )}
        </group>
        {gizmoElement}
      </>
    );
  }

  // --- Default mesh ---
  return (
    <>
      <mesh
        ref={meshCallback as any}
        position={pos}
        scale={scale}
        rotation={rotation}
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
        {selectionOutline}
      </mesh>
      {gizmoElement}
    </>
  );
};

const labelStyle = (color: string): React.CSSProperties => ({
  background: 'rgba(15, 23, 42, 0.85)',
  color,
  padding: '2px 8px',
  borderRadius: 4,
  fontSize: 10,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  border: `1px solid ${color}33`,
});
