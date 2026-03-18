import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport, Environment } from '@react-three/drei';
import { useProjectStore } from '@/store';
import { SceneObjects } from './SceneObjects';
import { ZoneVisualizer } from './ZoneVisualizer';

export const SceneViewport: React.FC = () => {
  const project = useProjectStore((s) => s.project);
  const activeSceneId = useProjectStore((s) => s.editor.activeSceneId);
  const showGrid = useProjectStore((s) => s.editor.showGrid);
  const viewMode = useProjectStore((s) => s.editor.viewMode);

  if (!project || !activeSceneId) return null;

  const scene = project.scenes[activeSceneId];
  if (!scene) return null;

  const env = scene.environment;

  return (
    <div style={{ flex: 1, position: 'relative', background: '#1a1a2e' }}>
      <Canvas
        camera={{ position: [0, 5, 10], fov: 60, near: 0.1, far: 1000 }}
        shadows
        style={{ width: '100%', height: '100%' }}
      >
        {/* Lighting */}
        <ambientLight
          intensity={env.ambientLightIntensity}
          color={`rgb(${Math.round(env.ambientLightColor.r * 255)},${Math.round(env.ambientLightColor.g * 255)},${Math.round(env.ambientLightColor.b * 255)})`}
        />
        <directionalLight position={[10, 15, 10]} intensity={0.8} castShadow />

        {/* Ground plane */}
        {env.groundPlane && env.groundSize && (
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -0.025, 0]}
            receiveShadow
          >
            <planeGeometry args={[env.groundSize.x, env.groundSize.z]} />
            <meshStandardMaterial
              color={env.groundColor ? `rgb(${Math.round(env.groundColor.r * 255)},${Math.round(env.groundColor.g * 255)},${Math.round(env.groundColor.b * 255)})` : '#8ca67a'}
            />
          </mesh>
        )}

        {/* Grid overlay */}
        {showGrid && (
          <Grid
            args={[50, 50]}
            position={[0, 0.01, 0]}
            cellSize={1}
            cellThickness={0.5}
            cellColor="#334155"
            sectionSize={5}
            sectionThickness={1}
            sectionColor="#475569"
            fadeDistance={30}
            infiniteGrid
          />
        )}

        {/* Background click to deselect */}
        <DeselectOnMiss />

        {/* Scene objects */}
        <SceneObjects scene={scene} />

        {/* Zone visualization */}
        <ZoneVisualizer scene={scene} />

        {/* Camera controls */}
        {viewMode === 'editor' && (
          <>
            <OrbitControls makeDefault />
            <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
              <GizmoViewport labelColor="white" axisHeadScale={1} />
            </GizmoHelper>
          </>
        )}

        {/* Environment/skybox */}
        <Environment preset="sunset" background={false} />
      </Canvas>

      {/* View mode indicator */}
      <div style={styles.modeIndicator}>
        {viewMode === 'editor' ? 'Edit Mode' : viewMode === 'preview' ? 'Preview Mode' : 'VR Mode'}
      </div>
    </div>
  );
};

/** Click on empty space to deselect, or place a zone if zone tool is active */
const DeselectOnMiss: React.FC = () => {
  const selectObject = useProjectStore((s) => s.selectObject);
  const activeTool = useProjectStore((s) => s.editor.activeTool);
  const activeSceneId = useProjectStore((s) => s.editor.activeSceneId);
  const addZone = useProjectStore((s) => s.addZone);

  return (
    <mesh
      position={[0, -0.05, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={(e) => {
        if (activeTool === 'zone' && activeSceneId) {
          const point = e.point;
          addZone(activeSceneId, {
            name: `Zone`,
            shape: 'box',
            points: [{ x: point.x, y: 0, z: point.z }],
            size: { x: 3, y: 2, z: 3 },
            walkable: true,
            hasCollision: false,
          });
          return;
        }
        selectObject(null);
      }}
    >
      <planeGeometry args={[500, 500]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  );
};

const styles: Record<string, React.CSSProperties> = {
  modeIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    padding: '4px 10px',
    borderRadius: 4,
    background: 'rgba(15, 23, 42, 0.8)',
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 500,
    pointerEvents: 'none',
  },
};
