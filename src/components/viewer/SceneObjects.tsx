import React, { useRef, useEffect, useState, useCallback, Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { useLoader, useFrame, useThree } from '@react-three/fiber';
import { TransformControls, Html, Text as DreiText } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useProjectStore } from '@/store';
import type { RenderMode } from '@/store/projectStore';
import type { Scene, SceneObject } from '@/types';

/** Shared geometry for selection outlines — avoids creating new BoxGeometry every render */
const selectionBoxGeo = new THREE.BoxGeometry(1.02, 1.02, 1.02);

interface SceneObjectsProps {
  scene: Scene;
  renderMode?: RenderMode;
}

export const SceneObjects: React.FC<SceneObjectsProps> = ({ scene, renderMode = 'lit' }) => {
  const objects = Object.values(scene.objects).filter((obj) => obj.visible);

  return (
    <group>
      {objects.map((obj) => (
        <SceneObjectMesh key={obj.id} object={obj} sceneId={scene.id} renderMode={renderMode} />
      ))}
      <GroupTransformGizmo scene={scene} />
    </group>
  );
};

/** Group transform gizmo: when multiple objects are selected, places a single
 *  TransformControls at the centroid and applies deltas to all selected objects. */
const GroupTransformGizmo: React.FC<{ scene: Scene }> = ({ scene }) => {
  const selectedObjectIds = useProjectStore((s) => s.editor.selectedObjectIds);
  const activeTool = useProjectStore((s) => s.editor.activeTool);
  const setObjectTransform = useProjectStore((s) => s.setObjectTransform);
  const setObjectTransformLive = useProjectStore((s) => s.setObjectTransformLive);
  const pivotRef = useRef<THREE.Group>(null);
  const transformRef = useRef<any>(null);
  const isDragging = useRef(false);

  const gizmoMode = (() => {
    switch (activeTool) {
      case 'move': return 'translate' as const;
      case 'rotate': return 'rotate' as const;
      case 'scale': return 'scale' as const;
      default: return null;
    }
  })();

  // Get selected objects from scene
  const selectedObjects = useMemo(() => {
    return selectedObjectIds
      .map((id) => scene.objects[id])
      .filter(Boolean);
  }, [selectedObjectIds, scene.objects]);

  // Compute centroid of selected objects
  const centroid = useMemo(() => {
    if (selectedObjects.length < 2) return null;
    const sum = { x: 0, y: 0, z: 0 };
    for (const obj of selectedObjects) {
      sum.x += obj.transform.position.x;
      sum.y += obj.transform.position.y;
      sum.z += obj.transform.position.z;
    }
    const n = selectedObjects.length;
    return new THREE.Vector3(sum.x / n, sum.y / n, sum.z / n);
  }, [selectedObjects]);

  // Store original transforms when drag starts
  const originals = useRef<Map<string, { pos: THREE.Vector3; rot: THREE.Euler; scl: THREE.Vector3 }>>(new Map());
  const pivotStart = useRef<{ pos: THREE.Vector3; rot: THREE.Euler; scl: THREE.Vector3 } | null>(null);

  // Keep pivot at centroid
  useEffect(() => {
    if (pivotRef.current && centroid) {
      pivotRef.current.position.copy(centroid);
      pivotRef.current.rotation.set(0, 0, 0);
      pivotRef.current.scale.set(1, 1, 1);
    }
  }, [centroid]);

  // Apply current pivot transform to all selected objects
  const applyGroupTransform = useCallback((setter: typeof setObjectTransform | typeof setObjectTransformLive) => {
    if (!pivotRef.current || !pivotStart.current) return;
    const pivot = pivotRef.current;
    const start = pivotStart.current;
    const currentObjects = selectedObjectIds
      .map((id) => scene.objects[id])
      .filter(Boolean);

    for (const obj of currentObjects) {
      const orig = originals.current.get(obj.id);
      if (!orig) continue;

      if (gizmoMode === 'translate') {
        const delta = new THREE.Vector3().subVectors(pivot.position, start.pos);
        const newPos = orig.pos.clone().add(delta);
        setter(scene.id, obj.id, {
          ...obj.transform,
          position: { x: newPos.x, y: newPos.y, z: newPos.z },
        });
      } else if (gizmoMode === 'rotate') {
        const rotDelta = new THREE.Quaternion().setFromEuler(pivot.rotation);
        const startRot = new THREE.Quaternion().setFromEuler(start.rot);
        const deltaQuat = rotDelta.multiply(startRot.invert());

        const relPos = orig.pos.clone().sub(start.pos);
        relPos.applyQuaternion(deltaQuat);
        const newPos = relPos.add(pivot.position);

        const objQuat = new THREE.Quaternion().setFromEuler(orig.rot);
        objQuat.premultiply(deltaQuat);
        const newRot = new THREE.Euler().setFromQuaternion(objQuat);

        setter(scene.id, obj.id, {
          ...obj.transform,
          position: { x: newPos.x, y: newPos.y, z: newPos.z },
          rotation: { x: newRot.x, y: newRot.y, z: newRot.z, w: 1 },
        });
      } else if (gizmoMode === 'scale') {
        const scaleFactor = new THREE.Vector3().copy(pivot.scale).divide(start.scl);
        const relPos = orig.pos.clone().sub(start.pos);
        relPos.multiply(scaleFactor);
        const newPos = relPos.add(pivot.position);
        const newScl = orig.scl.clone().multiply(scaleFactor);

        setter(scene.id, obj.id, {
          ...obj.transform,
          position: { x: newPos.x, y: newPos.y, z: newPos.z },
          scale: { x: newScl.x, y: newScl.y, z: newScl.z },
        });
      }
    }
  }, [selectedObjectIds, scene, gizmoMode, setObjectTransform, setObjectTransformLive]);

  // Listen for TransformControls drag events
  useEffect(() => {
    const controls = transformRef.current;
    if (!controls) return;

    const onDragStart = () => {
      if (!pivotRef.current) return;
      isDragging.current = true;
      // Snapshot original transforms from current store state
      originals.current.clear();
      const currentState = useProjectStore.getState();
      const currentScene = currentState.project?.scenes[scene.id];
      if (!currentScene) return;
      for (const id of selectedObjectIds) {
        const obj = currentScene.objects[id];
        if (!obj) continue;
        originals.current.set(id, {
          pos: new THREE.Vector3(obj.transform.position.x, obj.transform.position.y, obj.transform.position.z),
          rot: new THREE.Euler(obj.transform.rotation.x, obj.transform.rotation.y, obj.transform.rotation.z),
          scl: new THREE.Vector3(obj.transform.scale.x, obj.transform.scale.y, obj.transform.scale.z),
        });
      }
      pivotStart.current = {
        pos: pivotRef.current.position.clone(),
        rot: pivotRef.current.rotation.clone(),
        scl: pivotRef.current.scale.clone(),
      };
    };

    // Live update during drag (no undo push)
    const onChange = () => {
      if (!isDragging.current) return;
      applyGroupTransform(setObjectTransformLive);
    };

    // Final commit on drag end (pushes undo via regular setter)
    const onDragEnd = () => {
      isDragging.current = false;
      applyGroupTransform(setObjectTransform);
      pivotStart.current = null;
    };

    controls.addEventListener('mouseDown', onDragStart);
    controls.addEventListener('change', onChange);
    controls.addEventListener('mouseUp', onDragEnd);
    return () => {
      controls.removeEventListener('mouseDown', onDragStart);
      controls.removeEventListener('change', onChange);
      controls.removeEventListener('mouseUp', onDragEnd);
    };
  }, [selectedObjectIds, scene.id, gizmoMode, applyGroupTransform, setObjectTransform, setObjectTransformLive]);

  if (!centroid || selectedObjects.length < 2 || !gizmoMode) return null;

  return (
    <>
      <group ref={pivotRef} position={centroid}>
        {/* Visual centroid marker */}
        <mesh>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.7} />
        </mesh>
      </group>
      {pivotRef.current && (
        <TransformControls
          ref={transformRef}
          object={pivotRef.current}
          mode={gizmoMode}
          size={0.75}
        />
      )}
    </>
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

/** Loads and renders a GLTF model, auto-scaled to fit a ~1 unit bounding box */
const GltfModel: React.FC<{
  url: string;
  onClick: (e: any) => void;
  onPointerDown?: (e: any) => void;
}> = ({ url, onClick, onPointerDown }) => {
  const gltf = useLoader(GLTFLoader, url);

  // Clone scene once and auto-normalize to fit within a unit box
  const clonedScene = useMemo(() => {
    const clone = gltf.scene.clone(true);

    // Compute bounding box to auto-scale
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // Scale to fit within ~2 units tall (reasonable human-ish size)
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      const targetSize = 2;
      const s = targetSize / maxDim;
      clone.scale.multiplyScalar(s);

      // Re-center so the model sits on its base (y=0)
      box.setFromObject(clone);
      box.getCenter(center);
      const minY = box.min.y;
      clone.position.sub(center);
      clone.position.y -= minY; // sit on ground
    }

    return clone;
  }, [gltf]);

  // Dispose of cloned resources on unmount
  useEffect(() => {
    return () => {
      clonedScene.traverse((child: any) => {
        if (child.isMesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m: THREE.Material) => {
              disposeTextures(m);
              m.dispose();
            });
          } else if (child.material) {
            disposeTextures(child.material);
            child.material.dispose();
          }
        }
      });
    };
  }, [clonedScene]);

  return (
    <group onClick={onClick} onPointerDown={onPointerDown}>
      <primitive object={clonedScene} />
    </group>
  );
};

/** Dispose all textures on a material */
function disposeTextures(material: any) {
  if (!material) return;
  const texProps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'envMap', 'lightMap', 'bumpMap', 'displacementMap'];
  for (const prop of texProps) {
    if (material[prop]) {
      material[prop].dispose();
    }
  }
}

/** Fallback for GLTF loading */
const GltfFallback: React.FC = () => (
  <mesh>
    <boxGeometry args={[0.5, 0.5, 0.5]} />
    <meshStandardMaterial color="#64748b" wireframe />
  </mesh>
);

/** Video mesh with actual HTML5 video playback */
const VideoMesh: React.FC<{
  obj: SceneObject;
  pos: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
  isSelected: boolean;
  isWireframe: boolean;
  meshCallback: (node: THREE.Mesh | null) => void;
  onClick: (e: any) => void;
  onPointerDown?: (e: any) => void;
}> = ({ obj, pos, scale, rotation, isSelected, isWireframe, meshCallback, onClick, onPointerDown }) => {
  const videoUrl = (obj.metadata?.url as string) || '';
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const textureRef = useRef<THREE.VideoTexture | null>(null);

  // Create video element
  useEffect(() => {
    if (!videoUrl) return;
    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.playsInline = true;
    video.muted = true; // Required for autoplay policies
    videoRef.current = video;
    const tex = new THREE.VideoTexture(video);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    textureRef.current = tex;
    return () => {
      video.pause();
      video.src = '';
      tex.dispose();
      videoRef.current = null;
      textureRef.current = null;
    };
  }, [videoUrl]);

  // Keep texture updating
  useFrame(() => {
    if (textureRef.current && playing) {
      textureRef.current.needsUpdate = true;
    }
  });

  const handleVideoClick = (e: any) => {
    onClick(e);
    if (videoRef.current && videoUrl) {
      if (playing) {
        videoRef.current.pause();
        setPlaying(false);
      } else {
        videoRef.current.play().then(() => setPlaying(true)).catch(() => {});
      }
    }
  };

  const hasVideo = videoUrl && textureRef.current && playing;

  return (
    <>
      <mesh
        ref={meshCallback as any}
        position={pos}
        scale={[scale[0] * 1.6, scale[1] * 0.9, 0.05]}
        rotation={rotation}
        onClick={handleVideoClick}
        onPointerDown={onPointerDown}
        castShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        {hasVideo ? (
          <meshBasicMaterial map={textureRef.current} />
        ) : (
          <meshStandardMaterial color="#1a1a2e" roughness={0.3} metalness={0.6} wireframe={isWireframe} />
        )}
        {isSelected && (
          <lineSegments>
            <edgesGeometry args={[selectionBoxGeo]} />
            <lineBasicMaterial color="#a855f7" linewidth={2} />
          </lineSegments>
        )}
      </mesh>
      {/* Play/pause icon overlay */}
      {!isWireframe && !playing && (
        <group position={[pos[0], pos[1], pos[2] + 0.03]}>
          <mesh rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.15, 0.25, 3]} />
            <meshBasicMaterial color="#a855f7" transparent opacity={0.8} />
          </mesh>
        </group>
      )}
      {isSelected && (
        <Html center position={[pos[0], pos[1] + scale[1] * 0.55, pos[2]]} style={{ pointerEvents: 'none' }}>
          <div style={labelStyle('#a855f7')}>
            {obj.name} {playing ? '(playing)' : videoUrl ? '(click to play)' : '(no URL)'}
          </div>
        </Html>
      )}
    </>
  );
};

const SceneObjectMesh: React.FC<{ object: SceneObject; sceneId: string; renderMode: RenderMode }> = ({ object: obj, sceneId, renderMode }) => {
  const [meshReady, setMeshReady] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  const transformRef = useRef<any>(null);
  const selectObject = useProjectStore((s) => s.selectObject);
  const setObjectTransform = useProjectStore((s) => s.setObjectTransform);
  const selectedObjectIds = useProjectStore((s) => s.editor.selectedObjectIds);
  const openContextMenu = useProjectStore((s) => s.openContextMenu);
  const activeTool = useProjectStore((s) => s.editor.activeTool);
  const project = useProjectStore((s) => s.project);
  const isSelected = selectedObjectIds.includes(obj.id);

  const gizmoMode = toolToMode(activeTool);
  // Only show individual gizmo for single-selection; multi-select uses GroupTransformGizmo
  const isMultiSelect = selectedObjectIds.length > 1;
  const showGizmo = isSelected && !isMultiSelect && gizmoMode !== null && meshReady;

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

  // --- Drag-to-move on selected objects ---
  const { camera, gl, controls } = useThree();
  const isDragging = useRef(false);
  const dragStartPos = useRef<{ x: number; y: number; z: number } | null>(null);
  const dragPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const dragOffset = useRef(new THREE.Vector3());

  // Right-click tracking: short click = context menu, hold+drag = orbit camera
  const rightClickStart = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (e: any) => {
    // Right-click: record start position, do NOT stopPropagation (let OrbitControls handle drag)
    if (e.button === 2) {
      const nativeEvent = e.nativeEvent ?? e;
      rightClickStart.current = {
        x: nativeEvent.clientX ?? 0,
        y: nativeEvent.clientY ?? 0,
      };

      const onPointerUp = (ev: PointerEvent) => {
        if (ev.button !== 2) return;
        window.removeEventListener('pointerup', onPointerUp);
        if (!rightClickStart.current) return;
        const dx = ev.clientX - rightClickStart.current.x;
        const dy = ev.clientY - rightClickStart.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        rightClickStart.current = null;
        // Short click (< 5px movement) → open context menu
        if (dist < 5) {
          if (!selectedObjectIds.includes(obj.id)) {
            selectObject(obj.id);
          }
          openContextMenu(ev.clientX, ev.clientY, obj.id);
        }
      };
      window.addEventListener('pointerup', onPointerUp);
      return;
    }

    // Left-click on selected object starts drag (only in select mode)
    if (e.button !== 0 || !isSelected || activeTool !== 'select') return;
    e.stopPropagation();

    // Save original position for cancel
    dragStartPos.current = { ...obj.transform.position };

    // Compute drag plane at the object's Y height
    dragPlane.constant = -obj.transform.position.y;

    // Calculate offset between click point and object center so drag feels natural
    const intersection = new THREE.Vector3();
    const rect = gl.domElement.getBoundingClientRect();
    const pointerNDC = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(pointerNDC, camera);
    if (ray.ray.intersectPlane(dragPlane, intersection)) {
      dragOffset.current.set(
        obj.transform.position.x - intersection.x,
        0,
        obj.transform.position.z - intersection.z,
      );
    }

    isDragging.current = true;

    // Disable orbit controls during drag
    if (controls) (controls as any).enabled = false;

    // Attach window-level listeners for move/up/cancel
    const onMove = (ev: PointerEvent) => {
      if (!isDragging.current) return;
      const r2 = gl.domElement.getBoundingClientRect();
      const ndcX = ((ev.clientX - r2.left) / r2.width) * 2 - 1;
      const ndcY = -((ev.clientY - r2.top) / r2.height) * 2 + 1;
      const r = new THREE.Raycaster();
      r.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      const hit = new THREE.Vector3();
      if (r.ray.intersectPlane(dragPlane, hit)) {
        const snappedX = Math.round((hit.x + dragOffset.current.x) * 2) / 2;
        const snappedZ = Math.round((hit.z + dragOffset.current.z) * 2) / 2;
        const current = useProjectStore.getState().project?.scenes[sceneId]?.objects[obj.id];
        if (current) {
          setObjectTransform(sceneId, obj.id, {
            ...current.transform,
            position: { x: snappedX, y: current.transform.position.y, z: snappedZ },
          });
        }
      }
    };

    const cleanup = () => {
      isDragging.current = false;
      dragStartPos.current = null;
      if (controls) (controls as any).enabled = true;
      gl.domElement.removeEventListener('pointermove', onMove);
      gl.domElement.removeEventListener('pointerup', onUp);
      gl.domElement.removeEventListener('contextmenu', onCancel);
    };

    const onUp = (ev: PointerEvent) => {
      if (ev.button === 0 && isDragging.current) {
        // Commit the move (already saved via setObjectTransform)
        cleanup();
      }
    };

    const onCancel = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      ev.preventDefault();
      if (dragStartPos.current) {
        // Revert to original position
        const current = useProjectStore.getState().project?.scenes[sceneId]?.objects[obj.id];
        if (current) {
          setObjectTransform(sceneId, obj.id, {
            ...current.transform,
            position: { ...dragStartPos.current },
          });
        }
      }
      cleanup();
    };

    gl.domElement.addEventListener('pointermove', onMove);
    gl.domElement.addEventListener('pointerup', onUp);
    gl.domElement.addEventListener('contextmenu', onCancel);
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    const shiftKey = e.nativeEvent?.shiftKey ?? e.shiftKey ?? false;
    selectObject(obj.id, shiftKey);
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

  const isWireframe = renderMode === 'wireframe';

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
      <edgesGeometry args={[selectionBoxGeo]} />
      <lineBasicMaterial color="#3b82f6" linewidth={2} />
    </lineSegments>
  ) : null;

  // --- Light ---
  if (obj.type === 'light') {
    const lightIntensity = (obj.metadata?.intensity as number) ?? 1;
    const lightColor = (obj.metadata?.color as string) ?? '#fff5e0';
    const lightType = (obj.metadata?.lightType as string) ?? 'point';
    const lightDistance = 10;

    return (
      <group position={pos}>
        {/* Actual light */}
        {lightType === 'spot' ? (
          <spotLight intensity={lightIntensity} distance={lightDistance} color={lightColor} angle={0.5} penumbra={0.5} castShadow />
        ) : lightType === 'directional' ? (
          <directionalLight intensity={lightIntensity} color={lightColor} castShadow />
        ) : (
          <pointLight intensity={lightIntensity} distance={lightDistance} color={lightColor} castShadow />
        )}

        {/* Visual indicator sphere */}
        <mesh ref={meshCallback as any} scale={scale} onClick={handleClick} onPointerDown={handlePointerDown}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial color={lightColor} wireframe={isWireframe} />
        </mesh>

        {/* Light radius ring (visible feedback) */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[lightDistance * 0.3, lightDistance * 0.32, 32]} />
          <meshBasicMaterial color={lightColor} transparent opacity={0.2} side={2} />
        </mesh>

        {/* Light direction line for spot/directional */}
        {(lightType === 'spot' || lightType === 'directional') && (
          <mesh position={[0, -1, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 2, 8]} />
            <meshBasicMaterial color={lightColor} transparent opacity={0.4} />
          </mesh>
        )}

        {isSelected && (
          <Html center style={{ pointerEvents: 'none' }}>
            <div style={labelStyle(lightColor)}>
              {obj.name} ({lightType}, {lightIntensity.toFixed(1)})
            </div>
          </Html>
        )}
        {gizmoElement}
      </group>
    );
  }

  // --- Camera ---
  if (obj.type === 'camera') {
    const fov = (obj.metadata?.fov as number) ?? 60;
    const isEntry = (obj.metadata?.isEntry as boolean) ?? false;
    const camColor = isEntry ? '#22c55e' : '#06b6d4';

    // Compute frustum lines from FOV
    const near = 0.3;
    const far = 3;
    const aspect = 16 / 9;
    const halfFovRad = (fov / 2) * (Math.PI / 180);
    const nearH = Math.tan(halfFovRad) * near;
    const nearW = nearH * aspect;
    const farH = Math.tan(halfFovRad) * far;
    const farW = farH * aspect;

    // Frustum corners (camera looks down -Z in local space, but our cone points down -Y)
    // We'll orient the frustum forward along -Z
    const frustumPoints = new Float32Array([
      // Near plane edges
      -nearW, nearH, -near,   nearW, nearH, -near,
      nearW, nearH, -near,    nearW, -nearH, -near,
      nearW, -nearH, -near,  -nearW, -nearH, -near,
      -nearW, -nearH, -near, -nearW, nearH, -near,
      // Far plane edges
      -farW, farH, -far,   farW, farH, -far,
      farW, farH, -far,    farW, -farH, -far,
      farW, -farH, -far,  -farW, -farH, -far,
      -farW, -farH, -far, -farW, farH, -far,
      // Connecting lines (near to far corners)
      -nearW, nearH, -near,  -farW, farH, -far,
      nearW, nearH, -near,    farW, farH, -far,
      nearW, -nearH, -near,   farW, -farH, -far,
      -nearW, -nearH, -near, -farW, -farH, -far,
    ]);

    return (
      <>
        <group position={pos} rotation={rotation}>
          {/* Camera body */}
          <mesh ref={meshCallback as any} scale={scale} onClick={handleClick} onPointerDown={handlePointerDown}>
            <coneGeometry args={[0.2, 0.4, 4]} />
            <meshStandardMaterial color={camColor} roughness={0.5} wireframe={isWireframe} />
          </mesh>
          <mesh position={[0, -0.25, 0]}>
            <cylinderGeometry args={[0.08, 0.12, 0.1, 16]} />
            <meshBasicMaterial color={camColor} wireframe={isWireframe} />
          </mesh>

          {/* FOV frustum wireframe */}
          <lineSegments>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[frustumPoints, 3]}
              />
            </bufferGeometry>
            <lineBasicMaterial color={camColor} transparent opacity={isSelected ? 0.6 : 0.25} />
          </lineSegments>

          {/* Active camera indicator */}
          {isEntry && (
            <mesh position={[0, 0.4, 0]}>
              <sphereGeometry args={[0.06, 8, 8]} />
              <meshBasicMaterial color="#22c55e" />
            </mesh>
          )}

          {isSelected && (
            <Html center position={[0, 0.6, 0]} style={{ pointerEvents: 'none' }}>
              <div style={labelStyle(camColor)}>
                {obj.name}{isEntry ? ' (active)' : ''}
              </div>
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
    const textSize = (obj.metadata?.fontSize as number) || 0.4;
    return (
      <>
        <group position={pos} rotation={rotation}>
          <DreiText
            ref={meshCallback as any}
            fontSize={textSize}
            color="#e2e8f0"
            anchorX="center"
            anchorY="middle"
            onClick={handleClick}
            onPointerDown={handlePointerDown}
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
        <VideoMesh
          obj={obj}
          pos={pos}
          scale={scale}
          rotation={rotation}
          isSelected={isSelected}
          isWireframe={isWireframe}
          meshCallback={meshCallback}
          onClick={handleClick}
          onPointerDown={handlePointerDown}
        />
        {gizmoElement}
      </>
    );
  }

  // --- Audio ---
  if (obj.type === 'audio') {
    return (
      <>
        <group position={pos}>
          <mesh ref={meshCallback as any} scale={[0.25, 0.25, 0.25]} onClick={handleClick} onPointerDown={handlePointerDown}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial color="#f97316" roughness={0.4} wireframe={isWireframe} />
          </mesh>
          {!isWireframe && [0.5, 0.8, 1.1].map((r, i) => (
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

  // --- Asset (GLTF model) ---
  if (obj.assetId && project) {
    const asset = project.assets[obj.assetId];
    const is3D = asset && ['glb', 'gltf', 'obj', 'fbx'].includes(asset.format);
    if (asset && is3D && asset.url) {
      return (
        <>
          <group ref={meshCallback as any} position={pos} scale={scale} rotation={rotation}>
            <Suspense fallback={<GltfFallback />}>
              <GltfModel url={asset.url} onClick={handleClick} onPointerDown={handlePointerDown} />
            </Suspense>
            {isSelected && (
              <Html center position={[0, 2.2, 0]} style={{ pointerEvents: 'none' }}>
                <div style={labelStyle('#3b82f6')}>{obj.name}</div>
              </Html>
            )}
          </group>
          {gizmoElement}
        </>
      );
    }
    // Non-3D asset (image etc) - show textured plane
    if (asset && ['png', 'jpg'].includes(asset.format)) {
      return (
        <>
          <mesh
            ref={meshCallback as any}
            position={pos}
            scale={scale}
            rotation={rotation}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
          >
            <planeGeometry args={[1, 1]} />
            <meshStandardMaterial color="#ffffff" side={2} wireframe={isWireframe} />
          </mesh>
          {isSelected && (
            <Html center position={[pos[0], pos[1] + 0.7, pos[2]]} style={{ pointerEvents: 'none' }}>
              <div style={labelStyle('#3b82f6')}>{obj.name} (image)</div>
            </Html>
          )}
          {gizmoElement}
        </>
      );
    }
  }

  // --- Default mesh ---
  const shape = (obj.metadata?.shape as string) || 'box';
  const renderGeometry = () => {
    switch (shape) {
      case 'sphere': return <sphereGeometry args={[0.5, 32, 32]} />;
      case 'cylinder': return <cylinderGeometry args={[0.5, 0.5, 1, 32]} />;
      case 'plane': return <planeGeometry args={[1, 1]} />;
      default: return <boxGeometry args={[1, 1, 1]} />;
    }
  };

  // Check for texture
  const texAssetId = obj.material?.textureAssetId;
  const texUrl = texAssetId && project ? project.assets[texAssetId]?.url : null;

  return (
    <>
      <mesh
        ref={meshCallback as any}
        position={pos}
        scale={scale}
        rotation={rotation}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        castShadow
        receiveShadow
      >
        {renderGeometry()}
        {texUrl ? (
          <TexturedMaterial
            url={texUrl}
            color={getColor()}
            isSelected={isSelected}
            roughness={obj.material?.roughness ?? 0.7}
            metalness={obj.material?.metalness ?? 0.1}
            side={shape === 'plane' ? THREE.DoubleSide : THREE.FrontSide}
            wireframe={isWireframe}
          />
        ) : (
          <meshStandardMaterial
            color={getColor()}
            transparent={isSelected}
            opacity={isSelected ? 0.85 : 1}
            roughness={obj.material?.roughness ?? 0.7}
            metalness={obj.material?.metalness ?? 0.1}
            side={shape === 'plane' ? THREE.DoubleSide : THREE.FrontSide}
            wireframe={isWireframe}
          />
        )}
        {selectionOutline}
      </mesh>
      {gizmoElement}
    </>
  );
};

/** Loads a texture from URL and applies it to a mesh */
const TexturedMaterial: React.FC<{
  url: string;
  color: string;
  isSelected: boolean;
  roughness: number;
  metalness: number;
  side: THREE.Side;
  wireframe: boolean;
}> = ({ url, color, isSelected, roughness, metalness, side, wireframe }) => {
  const texture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load(url);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }, [url]);

  // Dispose texture on unmount or URL change
  useEffect(() => {
    return () => { texture.dispose(); };
  }, [texture]);

  return (
    <meshStandardMaterial
      map={texture}
      color={color}
      transparent={isSelected}
      opacity={isSelected ? 0.85 : 1}
      roughness={roughness}
      metalness={metalness}
      side={side}
      wireframe={wireframe}
    />
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
