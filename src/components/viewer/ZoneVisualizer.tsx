import React from 'react';
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
  const color = zone.color
    ? `rgb(${Math.round(zone.color.r * 255)},${Math.round(zone.color.g * 255)},${Math.round(zone.color.b * 255)})`
    : zone.walkable
      ? '#22c55e'
      : '#ef4444';

  const opacity = zone.color?.a ?? 0.15;

  return (
    <mesh
      position={[center.x, center.y + zone.size.y / 2, center.z]}
    >
      <boxGeometry args={[zone.size.x, zone.size.y, zone.size.z]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </mesh>
  );
};
