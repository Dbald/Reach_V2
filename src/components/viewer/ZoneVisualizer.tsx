import React from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { Scene, Zone } from '@/types';

interface ZoneVisualizerProps {
  scene: Scene;
}

export const ZoneVisualizer: React.FC<ZoneVisualizerProps> = ({ scene }) => {
  const zones = Object.values(scene.zones);

  return (
    <group>
      {zones.map((zone) => (
        <ZoneMesh key={zone.id} zone={zone} />
      ))}
    </group>
  );
};

const ZoneMesh: React.FC<{ zone: Zone }> = ({ zone }) => {
  const center = zone.points[0] ?? { x: 0, y: 0, z: 0 };

  const fillColor = zone.color
    ? `rgb(${Math.round(zone.color.r * 255)},${Math.round(zone.color.g * 255)},${Math.round(zone.color.b * 255)})`
    : zone.walkable
      ? '#22c55e'
      : '#ef4444';

  const wireColor = zone.walkable ? '#4ade80' : '#f87171';
  const opacity = zone.color?.a ?? 0.18;

  const posY = center.y + zone.size.y / 2;

  return (
    <group position={[center.x, posY, center.z]}>
      {/* Semi-transparent fill */}
      <mesh>
        <boxGeometry args={[zone.size.x, zone.size.y, zone.size.z]} />
        <meshBasicMaterial
          color={fillColor}
          transparent
          opacity={opacity}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Wireframe outline */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(zone.size.x, zone.size.y, zone.size.z)]} />
        <lineBasicMaterial color={wireColor} transparent opacity={0.6} />
      </lineSegments>

      {/* Dashed ground outline for walkable zones */}
      {zone.walkable && (
        <lineSegments position={[0, -zone.size.y / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <edgesGeometry args={[new THREE.PlaneGeometry(zone.size.x, zone.size.z)]} />
          <lineDashedMaterial color="#4ade80" dashSize={0.3} gapSize={0.15} opacity={0.8} transparent />
        </lineSegments>
      )}

      {/* Floating label */}
      <Html
        position={[0, zone.size.y / 2 + 0.3, 0]}
        center
        style={{ pointerEvents: 'none' }}
      >
        <div style={{
          background: 'rgba(15, 23, 42, 0.85)',
          color: zone.walkable ? '#4ade80' : '#f87171',
          padding: '2px 8px',
          borderRadius: 4,
          fontSize: 10,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          border: `1px solid ${zone.walkable ? 'rgba(74, 222, 128, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`,
        }}>
          {zone.label || zone.name}
          <span style={{ marginLeft: 6, opacity: 0.7, fontSize: 9 }}>
            {zone.walkable ? 'WALK' : 'COLLIDE'}
          </span>
        </div>
      </Html>
    </group>
  );
};
