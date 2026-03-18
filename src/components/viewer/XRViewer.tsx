/**
 * WebXR Runtime Viewer
 * Handles VR preview with collision zones, locomotion, and immersive navigation.
 * Maps to PRD sections FR-06 and 2.3 (Runtime viewer component).
 */

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { useProjectStore } from '@/store';
import { SceneObjects } from './SceneObjects';
import { ZoneVisualizer } from './ZoneVisualizer';
import { getEntryViewpoint } from '@/services/sceneGraph';

export const XRViewer: React.FC = () => {
  const project = useProjectStore((s) => s.project);
  const activeSceneId = useProjectStore((s) => s.editor.activeSceneId);

  if (!project || !activeSceneId) {
    return (
      <div style={styles.empty}>
        <h2>No scene to preview</h2>
        <p>Create a project first to enter VR preview.</p>
      </div>
    );
  }

  const scene = project.scenes[activeSceneId];
  if (!scene) return null;

  const entry = getEntryViewpoint(scene);
  const cameraPos: [number, number, number] = entry
    ? [entry.transform.position.x, entry.transform.position.y, entry.transform.position.z]
    : [0, 1.6, 5];

  const env = scene.environment;

  return (
    <div style={{ width: '100%', height: '100%', background: '#0a0a1a' }}>
      <Canvas
        camera={{ position: cameraPos, fov: entry?.fov ?? 60 }}
        shadows
      >
        {/* Lighting */}
        <ambientLight intensity={env.ambientLightIntensity} />
        <directionalLight position={[10, 15, 10]} intensity={0.8} castShadow />

        {/* Fog */}
        {env.fogEnabled && env.fogColor && (
          <fog
            attach="fog"
            args={[
              `rgb(${Math.round(env.fogColor.r * 255)},${Math.round(env.fogColor.g * 255)},${Math.round(env.fogColor.b * 255)})`,
              env.fogNear ?? 10,
              env.fogFar ?? 50,
            ]}
          />
        )}

        {/* Ground */}
        {env.groundPlane && env.groundSize && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.025, 0]} receiveShadow>
            <planeGeometry args={[env.groundSize.x, env.groundSize.z]} />
            <meshStandardMaterial
              color={env.groundColor ? `rgb(${Math.round(env.groundColor.r * 255)},${Math.round(env.groundColor.g * 255)},${Math.round(env.groundColor.b * 255)})` : '#8ca67a'}
            />
          </mesh>
        )}

        {/* Scene content */}
        <SceneObjects scene={scene} />
        <ZoneVisualizer scene={scene} />

        <Environment preset="sunset" background />
      </Canvas>

      {/* VR controls overlay */}
      <div style={styles.overlay}>
        <div style={styles.vrInfo}>
          <span>VR Preview</span>
          <span style={styles.hint}>
            {Object.keys(scene.zones).length > 0
              ? `${Object.values(scene.zones).filter((z) => z.walkable).length} walkable zone(s)`
              : 'No walkable zones - add zones for VR navigation'}
          </span>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  empty: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0a1a',
    color: '#64748b',
    textAlign: 'center',
    gap: 8,
  },
  overlay: {
    position: 'absolute',
    bottom: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    pointerEvents: 'none',
  },
  vrInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '8px 16px',
    borderRadius: 8,
    background: 'rgba(15, 23, 42, 0.85)',
    color: '#e2e8f0',
    fontSize: 12,
  },
  hint: {
    fontSize: 10,
    color: '#94a3b8',
  },
};
