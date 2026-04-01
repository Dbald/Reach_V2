import React, { useRef, useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { useProjectStore } from '@/store';
import type { RenderMode } from '@/store/projectStore';
import { SceneObjects } from './SceneObjects';
import { ZoneVisualizer } from './ZoneVisualizer';
import { ReferenceOverlays } from './ReferenceOverlays';
import { FirstPersonControls } from './FirstPersonControls';
import { ContextMenu } from '@/components/editor/ContextMenu';
import { GrowthTimeline } from '@/components/editor/GrowthTimeline';
import { AddPanel } from '@/components/editor/AddPanel';
import type { Scene } from '@/types';
import { getGroundMaterial } from '@/config/groundMaterials';

// Shared ref for passing the Three.js camera out of the Canvas for drag-select
const cameraRef = { current: null as THREE.Camera | null };
const glRef = { current: null as any };

/** Syncs the R3F camera to the shared ref so DragSelectOverlay can project */
const CameraSync: React.FC = () => {
  const { camera, gl } = useThree();
  cameraRef.current = camera;
  glRef.current = gl;
  return null;
};

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
        <CameraSync />
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
            <OrbitControls
              makeDefault
              mouseButtons={{
                LEFT: undefined as any,    // free left-click for selection
                MIDDLE: THREE.MOUSE.ROTATE, // orbit with middle mouse
                RIGHT: THREE.MOUSE.PAN,     // pan with right mouse
              }}
            />
            <CameraFocus scene={scene} />
            <AxisGizmo />
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
      {viewMode === 'editor' && <AddPanel />}
      {viewMode === 'editor' && <DragSelectOverlay scene={scene} />}
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

/** Custom axis gizmo that snaps camera to perfectly flat orthographic-style views.
 *  Renders in a separate scene/camera via createPortal to stay in the corner,
 *  and on axis click, sets the main camera exactly along that axis. */
const AxisGizmo: React.FC = () => {
  const { camera, controls, size, gl } = useThree();
  const gizmoScene = useRef(new THREE.Scene());
  const gizmoCam = useRef(new THREE.OrthographicCamera(-1.8, 1.8, 1.8, -1.8, 0.1, 100));
  const raycaster = useRef(new THREE.Raycaster());
  const pointer = useRef(new THREE.Vector2());
  const axisMeshes = useRef<THREE.Mesh[]>([]);

  // Gizmo corner size in pixels
  const gizmoSize = 120;
  const margin = 10;

  // Build gizmo scene once
  useEffect(() => {
    const scene = gizmoScene.current;
    // Clear old children
    while (scene.children.length > 0) scene.remove(scene.children[0]);
    axisMeshes.current = [];

    const lineLen = 1.0;
    const headRadius = 0.18;

    // Axis lines + heads
    const lineDefs = [
      { dir: [1, 0, 0], color: '#ef4444' },
      { dir: [0, 1, 0], color: '#22c55e' },
      { dir: [0, 0, 1], color: '#3b82f6' },
    ];
    for (const { dir, color } of lineDefs) {
      // Line
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(dir[0] * lineLen, dir[1] * lineLen, dir[2] * lineLen),
      ]);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color }));
      scene.add(line);

      // Negative line (dimmer)
      const geoNeg = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(-dir[0] * lineLen * 0.5, -dir[1] * lineLen * 0.5, -dir[2] * lineLen * 0.5),
      ]);
      const lineNeg = new THREE.Line(geoNeg, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.4 }));
      scene.add(lineNeg);

      // Positive head (clickable sphere)
      const headGeo = new THREE.SphereGeometry(headRadius, 12, 12);
      const headMat = new THREE.MeshBasicMaterial({ color });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.set(dir[0] * lineLen, dir[1] * lineLen, dir[2] * lineLen);
      head.userData = { axis: dir, positive: true };
      scene.add(head);
      axisMeshes.current.push(head);

      // Negative head (smaller, dimmer)
      const negGeo = new THREE.SphereGeometry(headRadius * 0.65, 12, 12);
      const negMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 });
      const negHead = new THREE.Mesh(negGeo, negMat);
      negHead.position.set(-dir[0] * lineLen * 0.5, -dir[1] * lineLen * 0.5, -dir[2] * lineLen * 0.5);
      negHead.userData = { axis: dir.map((v: number) => -v), positive: false };
      scene.add(negHead);
      axisMeshes.current.push(negHead);
    }

    // Center sphere
    const centerGeo = new THREE.SphereGeometry(0.12, 12, 12);
    const centerMat = new THREE.MeshBasicMaterial({ color: '#94a3b8' });
    const center = new THREE.Mesh(centerGeo, centerMat);
    scene.add(center);

    // Ambient light for gizmo
    scene.add(new THREE.AmbientLight('#ffffff', 2));

    gizmoCam.current.position.set(0, 0, 5);
    gizmoCam.current.lookAt(0, 0, 0);
  }, []);

  // Render gizmo in a corner, matching main camera rotation
  useFrame(() => {
    const cam = gizmoCam.current;
    // Mirror main camera's rotation so gizmo shows same orientation
    cam.quaternion.copy(camera.quaternion);
    cam.position.set(0, 0, 5).applyQuaternion(camera.quaternion);
    cam.lookAt(0, 0, 0);

    // Render in bottom-right corner (WebGL viewport Y is from bottom)
    const gizX = size.width - gizmoSize - margin;
    gl.setViewport(gizX, margin, gizmoSize, gizmoSize);
    gl.setScissor(gizX, margin, gizmoSize, gizmoSize);
    gl.setScissorTest(true);
    gl.clearDepth();
    gl.render(gizmoScene.current, cam);
    gl.setScissorTest(false);
    gl.setViewport(0, 0, size.width, size.height);
  }, 2); // render priority after main scene

  // Handle click on gizmo
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const canvas = gl.domElement;
      const rect = canvas.getBoundingClientRect();

      // Check if click is within gizmo area (bottom-right corner)
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const gx = rect.width - gizmoSize - margin;
      const gy = rect.height - gizmoSize - margin;

      if (px < gx || px > gx + gizmoSize || py < gy || py > gy + gizmoSize) return;

      // Convert click to NDC within gizmo viewport
      const localX = ((px - gx) / gizmoSize) * 2 - 1;
      const localY = -((py - gy) / gizmoSize) * 2 + 1;
      pointer.current.set(localX, localY);

      raycaster.current.setFromCamera(pointer.current, gizmoCam.current);
      const hits = raycaster.current.intersectObjects(axisMeshes.current);
      if (hits.length === 0) return;

      const hit = hits[0].object;
      const axisData = hit.userData.axis;
      if (!axisData) return;

      // Snap camera exactly along this axis
      const orbitControls = controls as any;
      const target = orbitControls?.target?.clone() ?? new THREE.Vector3();
      const dist = camera.position.distanceTo(target);

      let dir: THREE.Vector3;
      if (Array.isArray(axisData)) {
        dir = new THREE.Vector3(axisData[0], axisData[1], axisData[2]);
      } else {
        dir = axisData.clone();
      }

      // Camera position = target + direction * distance
      const newPos = target.clone().add(dir.clone().multiplyScalar(dist));
      camera.position.copy(newPos);
      camera.lookAt(target);

      if (orbitControls) {
        orbitControls.update();
      }
    };

    gl.domElement.addEventListener('click', handleClick);
    return () => gl.domElement.removeEventListener('click', handleClick);
  }, [camera, controls, gl, size]);

  return null;
};

/** Floating transform tool buttons on the canvas - vertical column under Edit Mode */
const CanvasToolbar: React.FC = () => {
  const activeTool = useProjectStore((s) => s.editor.activeTool);
  const setActiveTool = useProjectStore((s) => s.setActiveTool);
  const selectedObjectIds = useProjectStore((s) => s.editor.selectedObjectIds);

  const tools = [
    { id: 'select' as const, label: 'Select', icon: '\u25E2', shortcut: 'Q' },
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

/** Left-click drag to box-select objects */
const DragSelectOverlay: React.FC<{ scene: Scene }> = ({ scene }) => {
  const selectObject = useProjectStore((s) => s.selectObject);
  const activeTool = useProjectStore((s) => s.editor.activeTool);
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });
  const [end, setEnd] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only left-click, only when select tool or no transform tool active on empty space
    if (e.button !== 0) return;
    // Don't interfere if clicking on UI overlays
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);

    const camera = cameraRef.current;
    const gl = glRef.current;
    if (!camera || !gl) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Compute normalized box
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);

    const boxWidth = maxX - minX;
    const boxHeight = maxY - minY;

    // If it's a tiny drag (click), deselect all
    if (boxWidth < 5 && boxHeight < 5) {
      selectObject(null);
      return;
    }

    // Project each object position to screen and check if inside box
    const objects = Object.values(scene.objects);
    const selected: string[] = [];
    const vec = new THREE.Vector3();

    for (const obj of objects) {
      if (!obj.visible) continue;
      vec.set(obj.transform.position.x, obj.transform.position.y, obj.transform.position.z);
      vec.project(camera);

      // Convert from NDC (-1..1) to pixel coords
      const sx = (vec.x * 0.5 + 0.5) * rect.width;
      const sy = (-vec.y * 0.5 + 0.5) * rect.height;

      if (sx >= minX && sx <= maxX && sy >= minY && sy <= maxY && vec.z < 1) {
        selected.push(obj.id);
      }
    }

    // Select all found objects
    if (selected.length > 0) {
      selectObject(selected[0]);
      for (let i = 1; i < selected.length; i++) {
        selectObject(selected[i], true);
      }
    } else {
      selectObject(null);
    }
  }, [dragging, start, end, scene, selectObject]);

  // Compute box rect for display
  const boxStyle: React.CSSProperties | null = dragging ? {
    position: 'absolute',
    left: Math.min(start.x, end.x),
    top: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
    border: '1px solid #3b82f6',
    background: 'rgba(59, 130, 246, 0.1)',
    pointerEvents: 'none',
    zIndex: 50,
  } : null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: dragging ? 49 : -1,
        cursor: activeTool === 'select' ? 'crosshair' : 'default',
        pointerEvents: activeTool === 'select' ? 'auto' : 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {boxStyle && <div style={boxStyle} />}
    </div>
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
