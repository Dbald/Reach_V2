import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport, Environment } from '@react-three/drei';
import { useProjectStore } from '@/store';
import type { RenderMode } from '@/store/projectStore';
import { SceneObjects } from './SceneObjects';
import { ZoneVisualizer } from './ZoneVisualizer';
import { ReferenceOverlays } from './ReferenceOverlays';
import { FirstPersonControls } from './FirstPersonControls';
import { ContextMenu } from '@/components/editor/ContextMenu';
import { GrowthTimeline } from '@/components/editor/GrowthTimeline';
import type { Scene } from '@/types';
import { getGroundMaterial } from '@/config/groundMaterials';

export const SceneViewport: React.FC = () => {
  const project = useProjectStore((s) => s.project);
  const activeSceneId = useProjectStore((s) => s.editor.activeSceneId);
  const showGrid = useProjectStore((s) => s.editor.showGrid);
  const viewMode = useProjectStore((s) => s.editor.viewMode);
  const renderMode = useProjectStore((s) => s.editor.renderMode);

  if (!project || !activeSceneId) return null;

  const scene = project.scenes[activeSceneId];
  if (!scene) return null;

  const env = scene.environment;

  return (
    <div style={{ flex: 1, position: 'relative', background: '#1a1a2e' }} onContextMenu={(e) => e.preventDefault()}>
      <Canvas
        camera={{ position: [0, 5, 10], fov: 60, near: 0.1, far: 1000 }}
        shadows
        style={{ width: '100%', height: '100%' }}
        onCreated={({ gl }) => {
          const canvas = gl.domElement;
          canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            console.warn('WebGL context lost — will attempt restore');
          });
          canvas.addEventListener('webglcontextrestored', () => {
            console.log('WebGL context restored');
          });
        }}
        gl={{ powerPreference: 'high-performance', antialias: true }}
      >
        {/* Lighting - always present but varies by render mode */}
        {renderMode === 'unlit' ? (
          <ambientLight intensity={2} color="#ffffff" />
        ) : (
          <>
            <ambientLight
              intensity={env.ambientLightIntensity}
              color={`rgb(${Math.round(env.ambientLightColor.r * 255)},${Math.round(env.ambientLightColor.g * 255)},${Math.round(env.ambientLightColor.b * 255)})`}
            />
            <directionalLight position={[10, 15, 10]} intensity={0.8} castShadow />
          </>
        )}

        {/* Ground plane */}
        {env.groundPlane && env.groundSize && (
          <GroundPlane env={env} renderMode={renderMode} />
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

        {/* Reference image overlays */}
        <ReferenceOverlays scene={scene} />

        {/* Scene objects */}
        <SceneObjects scene={scene} renderMode={renderMode} />

        {/* Zone visualization */}
        <ZoneVisualizer scene={scene} />

        {/* Camera controls */}
        {viewMode === 'editor' && (
          <>
            <OrbitControls makeDefault />
            <CameraFocus scene={scene} />
            <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
              <GizmoViewport labelColor="white" axisHeadScale={1} />
            </GizmoHelper>
          </>
        )}
        {viewMode === 'preview' && <FirstPersonControls scene={scene} />}

        {/* Environment/skybox */}
        <Environment preset={(env.skybox as any) || 'sunset'} background={!!env.skybox} />

        {/* Fog */}
        {env.fogEnabled && env.fogColor && (
          <fog attach="fog" args={[
            `rgb(${Math.round(env.fogColor.r * 255)},${Math.round(env.fogColor.g * 255)},${Math.round(env.fogColor.b * 255)})`,
            env.fogNear ?? 10,
            env.fogFar ?? 50,
          ]} />
        )}
        {env.fogEnabled && !env.fogColor && (
          <fog attach="fog" args={['#94a3b8', env.fogNear ?? 10, env.fogFar ?? 50]} />
        )}
      </Canvas>

      {/* Canvas overlays */}
      {viewMode === 'editor' && <CanvasToolbar />}
      {viewMode === 'editor' && <RenderModeSelector />}
      <GrowthTimeline />

      {/* View mode indicator */}
      <div style={styles.modeIndicator}>
        {viewMode === 'editor' ? 'Edit Mode' : viewMode === 'preview' ? 'Preview Mode' : 'VR Mode'}
      </div>
      {viewMode === 'preview' && (
        <div style={styles.previewHint}>
          Click to look around &middot; WASD to move &middot; Esc to release
        </div>
      )}

      {/* Right-click context menu */}
      <ContextMenu />
    </div>
  );
};

/** Smoothly moves the camera to focus on a selected object when "/" is pressed.
 *  Pressing "/" again returns to the original camera position (toggle). */
const CameraFocus: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { camera, controls } = useThree();
  const focusTargetId = useProjectStore((s) => s.editor.focusTargetId);
  const clearFocusTarget = useProjectStore((s) => s.clearFocusTarget);
  const targetPos = useRef(new THREE.Vector3());
  const animating = useRef(false);
  const startCamPos = useRef(new THREE.Vector3());
  const endCamPos = useRef(new THREE.Vector3());
  const startTargetPos = useRef(new THREE.Vector3());
  const progress = useRef(0);

  // Saved original camera state before focus
  const savedCamPos = useRef(new THREE.Vector3());
  const savedOrbitTarget = useRef(new THREE.Vector3());
  const hasSavedState = useRef(false);

  useEffect(() => {
    if (!focusTargetId) return;

    const orbitControls = controls as any;

    // Unfocus: animate back to saved position
    if (focusTargetId === '__unfocus__') {
      if (!hasSavedState.current) { clearFocusTarget(); return; }
      startCamPos.current.copy(camera.position);
      endCamPos.current.copy(savedCamPos.current);
      startTargetPos.current.copy(orbitControls?.target ?? new THREE.Vector3());
      targetPos.current.copy(savedOrbitTarget.current);
      progress.current = 0;
      animating.current = true;
      hasSavedState.current = false;
      return;
    }

    // Focus: save current state, then animate to object
    const obj = scene.objects[focusTargetId];
    if (!obj) { clearFocusTarget(); return; }

    // Save the current camera + orbit state before focusing
    savedCamPos.current.copy(camera.position);
    if (orbitControls?.target) {
      savedOrbitTarget.current.copy(orbitControls.target);
    }
    hasSavedState.current = true;

    const objPos = new THREE.Vector3(
      obj.transform.position.x,
      obj.transform.position.y,
      obj.transform.position.z
    );
    targetPos.current.copy(objPos);

    const offset = new THREE.Vector3(3, 2, 3);
    endCamPos.current.copy(objPos).add(offset);
    startCamPos.current.copy(camera.position);
    startTargetPos.current.copy(orbitControls?.target ?? new THREE.Vector3());
    progress.current = 0;
    animating.current = true;
  }, [focusTargetId, scene, camera, controls, clearFocusTarget]);

  useFrame((_, delta) => {
    if (!animating.current) return;

    progress.current = Math.min(progress.current + delta * 3, 1);
    const t = 1 - Math.pow(1 - progress.current, 3); // ease-out cubic

    camera.position.lerpVectors(startCamPos.current, endCamPos.current, t);

    const orbitControls = controls as any;
    if (orbitControls?.target) {
      orbitControls.target.lerpVectors(startTargetPos.current, targetPos.current, t);
      orbitControls.update();
    }

    if (progress.current >= 1) {
      animating.current = false;
      clearFocusTarget();
    }
  });

  return null;
};

/** Floating transform tool buttons on the canvas - vertical column under Edit Mode */
const CanvasToolbar: React.FC = () => {
  const activeTool = useProjectStore((s) => s.editor.activeTool);
  const setActiveTool = useProjectStore((s) => s.setActiveTool);
  const selectedObjectIds = useProjectStore((s) => s.editor.selectedObjectIds);

  const tools = [
    { id: 'move' as const, label: 'Move', icon: '\u2725', shortcut: 'G' },
    { id: 'rotate' as const, label: 'Rotate', icon: '\u21BB', shortcut: 'R' },
    { id: 'scale' as const, label: 'Scale', icon: '\u2922', shortcut: 'S' },
  ];

  return (
    <div style={styles.canvasToolbar}>
      {tools.map((t) => (
        <button
          key={t.id}
          onClick={() => setActiveTool(t.id)}
          title={`${t.label} (${t.shortcut})`}
          style={{
            ...styles.canvasToolBtn,
            ...(activeTool === t.id ? styles.canvasToolBtnActive : {}),
            ...(selectedObjectIds.length === 0 && activeTool !== t.id ? { opacity: 0.35 } : {}),
          }}
        >
          <span style={styles.canvasToolIcon}>{t.icon}</span>
        </button>
      ))}
    </div>
  );
};

/** Render mode switcher for lighting debug views */
const RenderModeSelector: React.FC = () => {
  const renderMode = useProjectStore((s) => s.editor.renderMode);
  const setRenderMode = useProjectStore((s) => s.setRenderMode);

  const modes: { id: RenderMode; label: string }[] = [
    { id: 'lit', label: 'Lit' },
    { id: 'unlit', label: 'Unlit' },
    { id: 'wireframe', label: 'Wire' },
  ];

  return (
    <div style={styles.renderModeBar}>
      {modes.map((m) => (
        <button
          key={m.id}
          onClick={() => setRenderMode(m.id)}
          style={{
            ...styles.renderModeBtn,
            ...(renderMode === m.id ? styles.renderModeBtnActive : {}),
          }}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
};

/** Hover feedback ring shown when placement tool is active (non-zone) */
const PlacementPreview: React.FC<{ hoverPos: THREE.Vector3 | null; placementType: string | null }> = ({ hoverPos, placementType }) => {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (ringRef.current && hoverPos) {
      ringRef.current.position.set(hoverPos.x, 0.02, hoverPos.z);
    }
  });

  if (!hoverPos || !placementType || placementType === 'zone') return null;

  return (
    <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.35, 0.45, 32]} />
      <meshBasicMaterial color="#3b82f6" transparent opacity={0.6} side={2} />
    </mesh>
  );
};

/** Live preview of zone being drawn on the ground */
const ZoneDrawPreview: React.FC = () => {
  const zoneDraw = useProjectStore((s) => s.editor.zoneDraw);

  if (!zoneDraw.active) return null;

  const { corner1, hoverPos, color, height } = zoneDraw;

  // Before first click: show a crosshair at hover
  if (!corner1 && hoverPos) {
    return (
      <group position={[hoverPos.x, 0.02, hoverPos.z]}>
        {/* Crosshair lines */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.4, 4]} />
          <meshBasicMaterial color={color} transparent opacity={0.7} side={2} />
        </mesh>
        {/* Center dot */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.1, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.9} side={2} />
        </mesh>
      </group>
    );
  }

  // After first click: show the rectangle being drawn
  if (corner1 && hoverPos) {
    const x1 = corner1.x, z1 = corner1.z;
    const x2 = hoverPos.x, z2 = hoverPos.z;
    const cx = (x1 + x2) / 2;
    const cz = (z1 + z2) / 2;
    const sx = Math.abs(x2 - x1) || 0.1;
    const sz = Math.abs(z2 - z1) || 0.1;

    return (
      <group>
        {/* Ground fill */}
        <mesh position={[cx, 0.03, cz]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[sx, sz]} />
          <meshBasicMaterial color={color} transparent opacity={0.15} side={2} />
        </mesh>

        {/* Ground border */}
        <mesh position={[cx, 0.04, cz]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0, 0, 0]} />
          <meshBasicMaterial color={color} />
        </mesh>
        <lineSegments position={[cx, 0.04, cz]} rotation={[-Math.PI / 2, 0, 0]}>
          <edgesGeometry args={[new THREE.PlaneGeometry(sx, sz)]} />
          <lineBasicMaterial color={color} linewidth={2} />
        </lineSegments>

        {/* Height preview (semi-transparent walls) */}
        <mesh position={[cx, height / 2, cz]}>
          <boxGeometry args={[sx, height, sz]} />
          <meshBasicMaterial color={color} transparent opacity={0.08} side={2} />
        </mesh>
        <lineSegments position={[cx, height / 2, cz]}>
          <edgesGeometry args={[new THREE.BoxGeometry(sx, height, sz)]} />
          <lineBasicMaterial color={color} transparent opacity={0.4} />
        </lineSegments>

        {/* Corner markers */}
        {/* First corner (set) */}
        <mesh position={[x1, 0.05, z1]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.15, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.9} side={2} />
        </mesh>
        {/* Second corner (current hover) */}
        <mesh position={[x2, 0.05, z2]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.1, 0.18, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.7} side={2} />
        </mesh>
      </group>
    );
  }

  // First corner set but no hover yet
  if (corner1) {
    return (
      <mesh position={[corner1.x, 0.05, corner1.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.15, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} side={2} />
      </mesh>
    );
  }

  return null;
};

/** Click on empty space: deselect, place object, or draw zone */
const GroundInteraction: React.FC = () => {
  const selectObject = useProjectStore((s) => s.selectObject);
  const closeContextMenu = useProjectStore((s) => s.closeContextMenu);
  const activeTool = useProjectStore((s) => s.editor.activeTool);
  const placementType = useProjectStore((s) => s.editor.placementType);
  const placementSettings = useProjectStore((s) => s.editor.placementSettings);
  const activeSceneId = useProjectStore((s) => s.editor.activeSceneId);
  const addObject = useProjectStore((s) => s.addObject);
  const zoneDraw = useProjectStore((s) => s.editor.zoneDraw);
  const setZoneDrawHover = useProjectStore((s) => s.setZoneDrawHover);
  const setZoneDrawCorner1 = useProjectStore((s) => s.setZoneDrawCorner1);
  const finishZoneDraw = useProjectStore((s) => s.finishZoneDraw);
  const [hoverPos, setHoverPos] = useState<THREE.Vector3 | null>(null);

  const isPlacing = activeTool === 'place' && placementType && placementType !== 'sky' && placementType !== 'zone';
  const isZoneDrawing = zoneDraw.active;

  const buildMetadata = (): Record<string, unknown> => {
    if (!placementType) return {};
    switch (placementType) {
      case 'object': return { shape: placementSettings.shape ?? 'box' };
      case 'light': return { lightType: placementSettings.lightType ?? 'point', intensity: placementSettings.intensity ?? 1, color: placementSettings.color ?? '#ffffff' };
      case 'text': return { text: placementSettings.text ?? 'Hello', fontSize: placementSettings.fontSize ?? 0.4 };
      case 'video': return { url: placementSettings.url ?? '', autoplay: false };
      case 'audio': return { url: placementSettings.url ?? '', loop: placementSettings.loop ?? true, volume: placementSettings.volume ?? 1, spatial: true };
      case 'camera': return { fov: 60, isEntry: false };
      default: return {};
    }
  };

  const placementDefaults: Record<string, { type: any; name: string; yOffset: number; tags: string[] }> = {
    object: { type: 'mesh', name: 'Object', yOffset: 0.5, tags: [] },
    light:  { type: 'light', name: 'Light', yOffset: 2, tags: [] },
    camera: { type: 'camera', name: 'Camera', yOffset: 1.7, tags: [] },
    text:   { type: 'text', name: 'Text', yOffset: 1.5, tags: [] },
    video:  { type: 'video', name: 'Video', yOffset: 1.5, tags: [] },
    audio:  { type: 'audio', name: 'Audio', yOffset: 1, tags: [] },
  };

  return (
    <>
      <PlacementPreview hoverPos={isPlacing ? hoverPos : null} placementType={placementType} />
      <ZoneDrawPreview />
      <mesh
        position={[0, -0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={(e) => {
          const p = e.point;
          const sx = Math.round(p.x * 2) / 2;
          const sz = Math.round(p.z * 2) / 2;
          if (isPlacing) {
            setHoverPos(new THREE.Vector3(sx, 0, sz));
          }
          if (isZoneDrawing) {
            setZoneDrawHover({ x: sx, z: sz });
          }
        }}
        onPointerLeave={() => {
          setHoverPos(null);
          if (isZoneDrawing) setZoneDrawHover(null);
        }}
        onClick={(e) => {
          if (!activeSceneId) return;
          const point = e.point;
          const snappedX = Math.round(point.x * 2) / 2;
          const snappedZ = Math.round(point.z * 2) / 2;

          // Zone drawing: two-click flow
          if (isZoneDrawing) {
            if (!zoneDraw.corner1) {
              setZoneDrawCorner1({ x: snappedX, z: snappedZ });
            } else {
              // Set hover to final position and finish
              setZoneDrawHover({ x: snappedX, z: snappedZ });
              // Small delay to ensure state updates
              setTimeout(() => finishZoneDraw(), 0);
            }
            return;
          }

          if (isPlacing) {
            const def = placementDefaults[placementType!];
            if (!def) return;
            const scene = useProjectStore.getState().project?.scenes[activeSceneId];
            const count = scene ? Object.values(scene.objects).filter((o) => o.type === def.type).length : 0;
            const customName = placementSettings.name as string;
            const id = addObject(activeSceneId, def.type, {
              name: customName || `${def.name} ${count + 1}`,
              transform: {
                position: { x: snappedX, y: def.yOffset, z: snappedZ },
                rotation: { x: 0, y: 0, z: 0, w: 1 },
                scale: { x: 1, y: 1, z: 1 },
              },
              tags: def.tags,
              metadata: buildMetadata(),
            });
            selectObject(id);
            return;
          }

          selectObject(null);
          closeContextMenu();
        }}
      >
        <planeGeometry args={[500, 500]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </>
  );
};

/** Ground plane with material-based appearance */
const GroundPlane: React.FC<{ env: Scene['environment']; renderMode: RenderMode }> = ({ env, renderMode }) => {
  const gm = env.groundMaterial ? getGroundMaterial(env.groundMaterial) : null;
  const baseColor = gm
    ? gm.color
    : env.groundColor
      ? `rgb(${Math.round(env.groundColor.r * 255)},${Math.round(env.groundColor.g * 255)},${Math.round(env.groundColor.b * 255)})`
      : '#8ca67a';

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.025, 0]}
      receiveShadow
    >
      <planeGeometry args={[env.groundSize!.x, env.groundSize!.z]} />
      <meshStandardMaterial
        color={baseColor}
        roughness={gm?.roughness ?? 0.7}
        metalness={gm?.metalness ?? 0}
        wireframe={renderMode === 'wireframe'}
      />
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
  // Canvas transform toolbar - vertical column under mode indicator
  canvasToolbar: {
    position: 'absolute',
    top: 36,
    left: 8,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
    padding: 3,
    borderRadius: 6,
    background: 'rgba(15, 23, 42, 0.9)',
    border: '1px solid rgba(51, 65, 85, 0.6)',
    backdropFilter: 'blur(8px)',
  },
  canvasToolBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 4,
    border: 'none',
    background: 'transparent',
    color: '#94a3b8',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  canvasToolBtnActive: {
    background: '#3b82f6',
    color: '#fff',
  },
  canvasToolIcon: {
    fontSize: 16,
    lineHeight: 1,
  },
  // Render mode selector
  renderModeBar: {
    position: 'absolute',
    top: 8,
    right: 8,
    display: 'flex',
    gap: 2,
    padding: 3,
    borderRadius: 6,
    background: 'rgba(15, 23, 42, 0.9)',
    border: '1px solid rgba(51, 65, 85, 0.6)',
    backdropFilter: 'blur(8px)',
  },
  renderModeBtn: {
    padding: '4px 10px',
    borderRadius: 4,
    border: 'none',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: 500,
    cursor: 'pointer',
  },
  renderModeBtnActive: {
    background: '#334155',
    color: '#fff',
  },
};
