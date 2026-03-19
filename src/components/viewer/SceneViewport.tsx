import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport, Environment } from '@react-three/drei';
import { useProjectStore } from '@/store';
import { SceneObjects } from './SceneObjects';
import { ZoneVisualizer } from './ZoneVisualizer';
import { FirstPersonControls } from './FirstPersonControls';

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

        {/* Ground click: deselect / place / zone */}
        <GroundInteraction />

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
        {viewMode === 'preview' && <FirstPersonControls />}

        {/* Environment/skybox */}
        <Environment preset="sunset" background={false} />
      </Canvas>

      {/* View mode indicator */}
      <div style={styles.modeIndicator}>
        {viewMode === 'editor' ? 'Edit Mode' : viewMode === 'preview' ? 'Preview Mode' : 'VR Mode'}
      </div>
      {viewMode === 'preview' && (
        <div style={styles.previewHint}>
          Click to look around &middot; WASD to move &middot; Esc to release
        </div>
      )}
    </div>
  );
};

/** Click on empty space: deselect, place object, or create zone based on active tool */
const GroundInteraction: React.FC = () => {
  const selectObject = useProjectStore((s) => s.selectObject);
  const activeTool = useProjectStore((s) => s.editor.activeTool);
  const activeSceneId = useProjectStore((s) => s.editor.activeSceneId);
  const addZone = useProjectStore((s) => s.addZone);
  const addObject = useProjectStore((s) => s.addObject);

  return (
    <mesh
      position={[0, -0.05, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={(e) => {
        if (!activeSceneId) return;
        const point = e.point;
        const snappedX = Math.round(point.x * 2) / 2;
        const snappedZ = Math.round(point.z * 2) / 2;

        if (activeTool === 'zone') {
          const zoneCount = Object.keys(
            useProjectStore.getState().project?.scenes[activeSceneId]?.zones ?? {}
          ).length;
          addZone(activeSceneId, {
            name: `Zone ${zoneCount + 1}`,
            shape: 'box',
            points: [{ x: snappedX, y: 0, z: snappedZ }],
            size: { x: 4, y: 2.5, z: 4 },
            walkable: true,
            hasCollision: false,
            label: `Zone ${zoneCount + 1}`,
            color: { r: 0.13, g: 0.77, b: 0.37, a: 0.15 },
          });
          return;
        }

        if (activeTool === 'place') {
          const objCount = Object.keys(
            useProjectStore.getState().project?.scenes[activeSceneId]?.objects ?? {}
          ).length;
          const id = addObject(activeSceneId, 'mesh', {
            name: `Object ${objCount + 1}`,
            transform: {
              position: { x: snappedX, y: 0.5, z: snappedZ },
              rotation: { x: 0, y: 0, z: 0, w: 1 },
              scale: { x: 1, y: 1, z: 1 },
            },
            tags: [],
          });
          selectObject(id);
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
  previewHint: {
    position: 'absolute',
    bottom: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '6px 16px',
    borderRadius: 6,
    background: 'rgba(15, 23, 42, 0.85)',
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 500,
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
  },
};
