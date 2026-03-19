import React, { useRef, useEffect, useState, useCallback, Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { useLoader, useFrame } from '@react-three/fiber';
import { TransformControls, Html, Text as DreiText } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useProjectStore } from '@/store';
import type { RenderMode } from '@/store/projectStore';
import type { Scene, SceneObject } from '@/types';

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

/** Loads and renders a GLTF model */
const GltfModel: React.FC<{
  url: string;
  onClick: (e: any) => void;
  meshCallback: (node: THREE.Mesh | null) => void;
}> = ({ url, onClick, meshCallback }) => {
  const gltf = useLoader(GLTFLoader, url);
  const clonedScene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    // Deep clone materials so each instance is independent
    clone.traverse((child: any) => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
      }
    });
    return clone;
  }, [gltf]);

  const groupRef = useCallback((node: THREE.Group | null) => {
    meshCallback(node as any);
  }, [meshCallback]);

  return (
    <group ref={groupRef} onClick={onClick}>
      <primitive object={clonedScene} />
    </group>
  );
};

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
}> = ({ obj, pos, scale, rotation, isSelected, isWireframe, meshCallback, onClick }) => {
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
            <edgesGeometry args={[new THREE.BoxGeometry(1.02, 1.02, 1.02)]} />
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
  const selectedObjectId = useProjectStore((s) => s.editor.selectedObjectId);
  const activeTool = useProjectStore((s) => s.editor.activeTool);
  const project = useProjectStore((s) => s.project);
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
      <edgesGeometry args={[new THREE.BoxGeometry(1.02, 1.02, 1.02)]} />
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
        <mesh ref={meshCallback as any} scale={scale} onClick={handleClick}>
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
    return (
      <>
        <group position={pos} rotation={rotation}>
          <mesh ref={meshCallback as any} scale={scale} onClick={handleClick}>
            <coneGeometry args={[0.2, 0.4, 4]} />
            <meshStandardMaterial color="#06b6d4" roughness={0.5} wireframe={isWireframe} />
          </mesh>
          <mesh position={[0, -0.25, 0]}>
            <cylinderGeometry args={[0.08, 0.12, 0.1, 16]} />
            <meshBasicMaterial color="#0891b2" wireframe={isWireframe} />
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
          <mesh ref={meshCallback as any} scale={[0.25, 0.25, 0.25]} onClick={handleClick}>
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
          <group position={pos} scale={scale} rotation={rotation}>
            <Suspense fallback={<GltfFallback />}>
              <GltfModel url={asset.url} onClick={handleClick} meshCallback={meshCallback} />
            </Suspense>
            {isSelected && (
              <Html center position={[0, 1, 0]} style={{ pointerEvents: 'none' }}>
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
        {renderGeometry()}
        <meshStandardMaterial
          color={getColor()}
          transparent={isSelected}
          opacity={isSelected ? 0.85 : 1}
          roughness={0.7}
          metalness={0.1}
          side={shape === 'plane' ? 2 : 0}
          wireframe={isWireframe}
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
