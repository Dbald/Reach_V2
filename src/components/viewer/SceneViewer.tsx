/**
 * SceneViewer — Standalone published scene viewer.
 * Decodes compressed scene data from URL hash and renders an immersive VR-ready view.
 * No editor UI, no store dependency.
 */

import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import { SceneObjects } from './SceneObjects';
import { ZoneVisualizer } from './ZoneVisualizer';
import { ReferenceOverlays } from './ReferenceOverlays';
import type { Scene } from '@/types/scene';

/** Decode scene from URL hash: #scene=<base64 JSON> */
function decodeSceneFromHash(): Scene | null {
  try {
    const hash = window.location.hash;
    const match = hash.match(/scene=([^&]+)/);
    if (!match) return null;
    const json = atob(decodeURIComponent(match[1]));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Encode scene to a URL hash string */
export function encodeSceneToHash(scene: Scene, baseUrl: string): string {
  const json = JSON.stringify(scene);
  const encoded = encodeURIComponent(btoa(json));
  return `${baseUrl}#scene=${encoded}`;
}

export const SceneViewer: React.FC = () => {
  const scene = useMemo(() => decodeSceneFromHash(), []);

  if (!scene) {
    return (
      <div style={styles.error}>
        <h2 style={{ margin: 0, fontSize: 20 }}>No scene data found</h2>
        <p style={{ color: '#94a3b8', fontSize: 13 }}>
          This link may be invalid or expired. Ask the creator to re-publish.
        </p>
      </div>
    );
  }

  const env = scene.environment;

  return (
    <div style={styles.container}>
      <Canvas
        camera={{ position: [0, 1.6, 5], fov: 60 }}
        shadows
      >
        <ambientLight intensity={env.ambientLightIntensity} />
        <directionalLight position={[10, 15, 10]} intensity={0.8} castShadow />

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

        {env.groundPlane && env.groundSize && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.025, 0]} receiveShadow>
            <planeGeometry args={[env.groundSize.x, env.groundSize.z]} />
            <meshStandardMaterial
              color={env.groundColor ? `rgb(${Math.round(env.groundColor.r * 255)},${Math.round(env.groundColor.g * 255)},${Math.round(env.groundColor.b * 255)})` : '#8ca67a'}
            />
          </mesh>
        )}

        <SceneObjects scene={scene} />
        <ZoneVisualizer scene={scene} />
        <ReferenceOverlays scene={scene} />
        <OrbitControls />
        <Environment preset="sunset" background />
      </Canvas>

      {/* Overlay */}
      <div style={styles.overlay}>
        <div style={styles.titleBar}>
          <span style={styles.title}>{scene.name}</span>
          <span style={styles.badge}>Reach V2</span>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100vw',
    height: '100vh',
    background: '#0a0a1a',
    position: 'relative',
  },
  error: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0a1a',
    color: '#e2e8f0',
    gap: 8,
    fontFamily: 'system-ui, sans-serif',
  },
  overlay: {
    position: 'absolute',
    top: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    pointerEvents: 'none',
  },
  titleBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    borderRadius: 8,
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(8px)',
  },
  title: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'system-ui, sans-serif',
  },
  badge: {
    fontSize: 10,
    color: '#0ea5e9',
    padding: '2px 6px',
    borderRadius: 4,
    background: 'rgba(14, 165, 233, 0.15)',
    fontFamily: 'system-ui, sans-serif',
  },
};
