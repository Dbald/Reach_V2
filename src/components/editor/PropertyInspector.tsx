import React, { useEffect, useState, useCallback } from 'react';
import { useProjectStore } from '@/store';
import type { SceneObject, Vector3, Quaternion, GrowthStage } from '@/types';
import { detectFormat, createAssetFromFile, processAsset } from '@/services/assetPipeline';

export const PropertyInspector: React.FC = () => {
  const project = useProjectStore((s) => s.project);
  const activeSceneId = useProjectStore((s) => s.editor.activeSceneId);
  const selectedObjectIds = useProjectStore((s) => s.editor.selectedObjectIds);
  const showInspector = useProjectStore((s) => s.editor.showInspector);

  const selectedObjectId = selectedObjectIds[0] ?? null;

  // Track visibility for smooth transition
  const [visible, setVisible] = useState(false);

  const hasObject = !!(showInspector && project && activeSceneId && selectedObjectId);

  useEffect(() => {
    if (hasObject) {
      const t = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(t);
    } else {
      setVisible(false);
    }
  }, [hasObject]);

  // Keep rendering during close animation
  const [renderObj, setRenderObj] = useState(false);
  useEffect(() => {
    if (hasObject) {
      setRenderObj(true);
    } else {
      const t = setTimeout(() => setRenderObj(false), 250);
      return () => clearTimeout(t);
    }
  }, [hasObject]);

  if (!renderObj && !hasObject) return null;

  const scene = project?.scenes[activeSceneId ?? ''];
  const obj = scene?.objects[selectedObjectId ?? ''];

  if (!obj && !renderObj) return null;

  return (
    <div style={{
      ...styles.panel,
      width: visible ? 260 : 0,
      opacity: visible ? 1 : 0,
      overflowX: 'hidden',
      overflowY: visible ? 'auto' : 'hidden',
      transition: 'width 0.2s ease, opacity 0.2s ease',
    }}>
      {selectedObjectIds.length > 1 && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #1e293b', background: '#1e293b' }}>
          <span style={{ fontSize: 10, color: '#3b82f6', fontWeight: 600 }}>
            {selectedObjectIds.length} objects selected
          </span>
        </div>
      )}
      {obj && (
        <PropertyContent obj={obj} sceneId={activeSceneId!} />
      )}
    </div>
  );
};

const PropertyContent: React.FC<{ obj: SceneObject; sceneId: string }> = ({ obj, sceneId }) => {
  const updateObject = useProjectStore((s) => s.updateObject);
  const setObjectTransform = useProjectStore((s) => s.setObjectTransform);
  const setObjectMaterial = useProjectStore((s) => s.setObjectMaterial);
  const addAsset = useProjectStore((s) => s.addAsset);
  const project = useProjectStore((s) => s.project);
  const setObjectActiveStage = useProjectStore((s) => s.setObjectActiveStage);
  const setActiveGrowthYear = useProjectStore((s) => s.setActiveGrowthYear);
  const setObjectGrowthStages = useProjectStore((s) => s.setObjectGrowthStages);
  const updateAsset = useProjectStore((s) => s.updateAsset);

  const handleVec3Change = (
    field: 'position' | 'scale',
    axis: keyof Vector3,
    value: string
  ) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    const transform = { ...obj.transform };
    transform[field] = { ...transform[field], [axis]: num };
    setObjectTransform(sceneId, obj.id, transform);
  };

  const handleRotationChange = (axis: 'x' | 'y' | 'z', value: string) => {
    const degrees = parseFloat(value);
    if (isNaN(degrees)) return;
    const radians = (degrees * Math.PI) / 180;
    const transform = { ...obj.transform };
    transform.rotation = { ...transform.rotation, [axis]: radians };
    setObjectTransform(sceneId, obj.id, transform);
  };

  const handleNameChange = (name: string) => {
    updateObject(sceneId, obj.id, { name });
  };

  const handleToggle = (field: 'visible' | 'locked') => {
    updateObject(sceneId, obj.id, { [field]: !obj[field] });
  };

  const handleMetadata = (key: string, value: unknown) => {
    updateObject(sceneId, obj.id, {
      metadata: { ...obj.metadata, [key]: value },
    });
  };

  const handleMaterial = (updates: Partial<NonNullable<SceneObject['material']>>) => {
    const mat = { ...(obj.material ?? {}), ...updates };
    setObjectMaterial(sceneId, obj.id, mat);
  };

  const handleTextureUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['png', 'jpg', 'jpeg'].includes(ext)) return;
    const url = URL.createObjectURL(file);
    const assetId = `tex-${Date.now()}`;
    addAsset({
      id: assetId,
      name: file.name.replace(/\.[^.]+$/, ''),
      format: ext === 'jpeg' ? 'jpg' : ext as any,
      url,
      fileSizeBytes: file.size,
      status: 'ready',
      metadata: { originalFileName: file.name, mimeType: file.type },
      validationErrors: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    handleMaterial({ textureAssetId: assetId });
    e.target.value = '';
  }, [addAsset, obj.material, sceneId, obj.id]);

  // Current texture name
  const texAssetId = obj.material?.textureAssetId;
  const texAsset = texAssetId && project ? project.assets[texAssetId] : null;

  return (
    <div style={{ minWidth: 260 }}>
      <div style={styles.header}>Properties</div>

      <Section title="Object">
        <Field label="Name">
          <input
            value={obj.name}
            onChange={(e) => handleNameChange(e.target.value)}
            style={styles.input}
          />
        </Field>
        <Field label="Type">
          <span style={styles.readOnly}>{obj.type}</span>
        </Field>
        <div style={styles.toggleRow}>
          <label style={styles.toggle}>
            <input type="checkbox" checked={obj.visible} onChange={() => handleToggle('visible')} />
            Visible
          </label>
          <label style={styles.toggle}>
            <input type="checkbox" checked={obj.locked} onChange={() => handleToggle('locked')} />
            Locked
          </label>
        </div>
      </Section>

      <Section title="Position">
        <Vec3Input value={obj.transform.position} onChange={(axis, val) => handleVec3Change('position', axis, val)} />
      </Section>

      <Section title="Rotation">
        <RotationInput rotation={obj.transform.rotation} onChange={handleRotationChange} />
      </Section>

      <Section title="Scale">
        <Vec3Input value={obj.transform.scale} onChange={(axis, val) => handleVec3Change('scale', axis, val)} />
      </Section>

      {/* Material / Texture - for meshes, video, and other visual objects */}
      {(obj.type === 'mesh' || obj.type === 'video') && (
        <Section title="Texture">
          {texAsset ? (
            <div style={styles.textureInfo}>
              <span style={styles.textureName}>{texAsset.name}</span>
              <button
                onClick={() => handleMaterial({ textureAssetId: undefined })}
                style={styles.textureRemoveBtn}
              >
                Remove
              </button>
            </div>
          ) : (
            <span style={styles.muted}>No texture</span>
          )}
          <label style={styles.uploadBtn}>
            <input
              type="file"
              accept=".png,.jpg,.jpeg"
              onChange={handleTextureUpload}
              style={{ display: 'none' }}
            />
            {texAsset ? 'Replace Texture' : 'Upload Texture'}
          </label>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Roughness</label>
              <input
                type="number"
                step={0.1}
                min={0}
                max={1}
                value={obj.material?.roughness ?? 0.7}
                onChange={(e) => handleMaterial({ roughness: parseFloat(e.target.value) || 0.7 })}
                style={styles.numInput}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Metalness</label>
              <input
                type="number"
                step={0.1}
                min={0}
                max={1}
                value={obj.material?.metalness ?? 0.1}
                onChange={(e) => handleMaterial({ metalness: parseFloat(e.target.value) || 0 })}
                style={styles.numInput}
              />
            </div>
          </div>
        </Section>
      )}

      {/* --- Type-specific metadata sections --- */}

      {/* Mesh / Object shape */}
      {obj.type === 'mesh' && (
        <Section title="Shape">
          <div style={styles.chipRow}>
            {['box', 'sphere', 'cylinder', 'plane'].map((s) => (
              <button
                key={s}
                onClick={() => handleMetadata('shape', s)}
                style={{
                  ...styles.chip,
                  ...((obj.metadata?.shape || 'box') === s ? styles.chipActive : {}),
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Light properties */}
      {obj.type === 'light' && (
        <Section title="Light">
          <Field label="Type">
            <div style={styles.chipRow}>
              {['point', 'spot', 'directional'].map((lt) => (
                <button
                  key={lt}
                  onClick={() => handleMetadata('lightType', lt)}
                  style={{
                    ...styles.chip,
                    ...((obj.metadata?.lightType || 'point') === lt ? styles.chipActive : {}),
                  }}
                >
                  {lt}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Intensity">
            <input
              type="number"
              step={0.1}
              min={0}
              value={(obj.metadata?.intensity as number) ?? 1}
              onChange={(e) => handleMetadata('intensity', parseFloat(e.target.value) || 1)}
              style={styles.numInput}
            />
          </Field>
          <Field label="Color">
            <input
              type="color"
              value={(obj.metadata?.color as string) ?? '#ffffff'}
              onChange={(e) => handleMetadata('color', e.target.value)}
              style={styles.colorInput}
            />
          </Field>
        </Section>
      )}

      {/* Text properties */}
      {(obj.type === 'text' || obj.type === 'label') && (
        <Section title="Text">
          <Field label="Content">
            <input
              value={(obj.metadata?.text as string) ?? obj.name}
              onChange={(e) => handleMetadata('text', e.target.value)}
              style={styles.input}
            />
          </Field>
          <Field label="Font Size">
            <input
              type="number"
              step={0.1}
              min={0.1}
              value={(obj.metadata?.fontSize as number) ?? 0.4}
              onChange={(e) => handleMetadata('fontSize', parseFloat(e.target.value) || 0.4)}
              style={styles.numInput}
            />
          </Field>
        </Section>
      )}

      {/* Video properties */}
      {obj.type === 'video' && (
        <Section title="Video">
          <Field label="URL">
            <input
              value={(obj.metadata?.url as string) ?? ''}
              onChange={(e) => handleMetadata('url', e.target.value)}
              placeholder="https://..."
              style={styles.input}
            />
          </Field>
          <label style={styles.toggle}>
            <input
              type="checkbox"
              checked={(obj.metadata?.autoplay as boolean) ?? false}
              onChange={(e) => handleMetadata('autoplay', e.target.checked)}
            />
            Autoplay
          </label>
        </Section>
      )}

      {/* Audio properties */}
      {obj.type === 'audio' && (
        <Section title="Audio">
          <Field label="URL">
            <input
              value={(obj.metadata?.url as string) ?? ''}
              onChange={(e) => handleMetadata('url', e.target.value)}
              placeholder="https://..."
              style={styles.input}
            />
          </Field>
          <Field label="Volume">
            <input
              type="number"
              step={0.1}
              min={0}
              max={1}
              value={(obj.metadata?.volume as number) ?? 1}
              onChange={(e) => handleMetadata('volume', parseFloat(e.target.value) || 1)}
              style={styles.numInput}
            />
          </Field>
          <label style={styles.toggle}>
            <input
              type="checkbox"
              checked={(obj.metadata?.loop as boolean) ?? true}
              onChange={(e) => handleMetadata('loop', e.target.checked)}
            />
            Loop
          </label>
          <label style={styles.toggle}>
            <input
              type="checkbox"
              checked={(obj.metadata?.spatial as boolean) ?? true}
              onChange={(e) => handleMetadata('spatial', e.target.checked)}
            />
            Spatial
          </label>
        </Section>
      )}

      {/* Camera properties */}
      {obj.type === 'camera' && (
        <CameraSection obj={obj} sceneId={sceneId} handleMetadata={handleMetadata} />
      )}

      <Section title="Tags">
        <div style={styles.tagList}>
          {obj.tags.length === 0 && <span style={styles.muted}>No tags</span>}
          {obj.tags.map((tag) => (
            <span key={tag} style={styles.tag}>{tag}</span>
          ))}
        </div>
      </Section>

      {/* Growth Staging */}
      {obj.growthStages && obj.growthStages.length > 0 && (
        <GrowthStagesSection
          obj={obj}
          sceneId={sceneId}
          project={project}
          setObjectActiveStage={setObjectActiveStage}
          setActiveGrowthYear={setActiveGrowthYear}
          setObjectGrowthStages={setObjectGrowthStages}
          addAsset={addAsset}
          updateAsset={updateAsset}
        />
      )}

      {/* Physics / Collision - available for all visual object types */}
      {(obj.type === 'mesh' || obj.type === 'video' || obj.type === 'audio' || obj.assetId) && (
        <Section title="Physics">
          <label style={styles.toggle}>
            <input
              type="checkbox"
              checked={(obj.metadata?.hasCollision as boolean) ?? false}
              onChange={(e) => handleMetadata('hasCollision', e.target.checked)}
            />
            Collision
          </label>
          {!!(obj.metadata?.hasCollision) && (
            <>
              <Field label="Collision Shape">
                <div style={styles.chipRow}>
                  {['auto', 'box', 'sphere', 'mesh'].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleMetadata('collisionShape', s)}
                      style={{
                        ...styles.chip,
                        ...((obj.metadata?.collisionShape || 'auto') === s ? styles.chipActive : {}),
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </Field>
              <label style={styles.toggle}>
                <input
                  type="checkbox"
                  checked={(obj.metadata?.isStatic as boolean) ?? true}
                  onChange={(e) => handleMetadata('isStatic', e.target.checked)}
                />
                Static
              </label>
            </>
          )}
        </Section>
      )}
    </div>
  );
};

/** Growth Stages section with per-stage model upload */
const GrowthStagesSection: React.FC<{
  obj: SceneObject;
  sceneId: string;
  project: any;
  setObjectActiveStage: (sceneId: string, objectId: string, idx: number) => void;
  setActiveGrowthYear: (year: number | null) => void;
  setObjectGrowthStages: (sceneId: string, objectId: string, stages: GrowthStage[]) => void;
  addAsset: (asset: any) => void;
  updateAsset: (assetId: string, updates: any) => void;
}> = ({ obj, sceneId, project, setObjectActiveStage, setActiveGrowthYear, setObjectGrowthStages, addAsset, updateAsset }) => {

  const handleModelUpload = useCallback(async (stageIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !obj.growthStages) return;

    const format = detectFormat(file.name);
    if (!format || !['glb', 'gltf', 'obj', 'fbx'].includes(format)) return;

    // Create asset entry
    const asset = createAssetFromFile(file);
    addAsset(asset);

    // Process asset
    if (asset.status !== 'error') {
      const processed = await processAsset(asset);
      updateAsset(asset.id, processed);
    }

    // Update the growth stage with the asset reference
    const updatedStages = obj.growthStages.map((stage, idx) => {
      if (idx === stageIdx) {
        return { ...stage, assetId: asset.id, modelUrl: undefined };
      }
      return stage;
    });
    setObjectGrowthStages(sceneId, obj.id, updatedStages);
    e.target.value = '';
  }, [obj.growthStages, obj.id, sceneId, addAsset, updateAsset, setObjectGrowthStages]);

  const handleRemoveModel = useCallback((stageIdx: number) => {
    if (!obj.growthStages) return;
    const updatedStages = obj.growthStages.map((stage, idx) => {
      if (idx === stageIdx) {
        return { ...stage, assetId: undefined, modelUrl: undefined };
      }
      return stage;
    });
    setObjectGrowthStages(sceneId, obj.id, updatedStages);
  }, [obj.growthStages, obj.id, sceneId, setObjectGrowthStages]);

  if (!obj.growthStages || obj.growthStages.length === 0) return null;

  return (
    <Section title="Growth Stages">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {obj.growthStages.map((stage, idx) => {
          const isActiveStage = (obj.activeStageIndex ?? 0) === idx;
          const stageAsset = stage.assetId && project ? project.assets[stage.assetId] : null;
          const hasModel = !!(stage.modelUrl || stageAsset);

          return (
            <div
              key={idx}
              style={{
                borderRadius: 6,
                border: `1px solid ${isActiveStage ? '#3b82f6' : '#334155'}`,
                background: isActiveStage ? '#1e293b' : '#0a0a1a',
                overflow: 'hidden',
              }}
            >
              {/* Stage header — click to activate */}
              <button
                onClick={() => {
                  setObjectActiveStage(sceneId, obj.id, idx);
                  setActiveGrowthYear(stage.year);
                }}
                style={{
                  width: '100%',
                  textAlign: 'left' as const,
                  padding: '6px 10px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: isActiveStage ? '#fff' : '#94a3b8',
                }}
              >
                <div style={{ fontWeight: isActiveStage ? 700 : 400, fontSize: 11 }}>
                  {stage.label}
                </div>
                {stage.info && isActiveStage && (
                  <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>
                    {Object.entries(stage.info).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                  </div>
                )}
              </button>

              {/* Model section — always visible */}
              <div style={{
                padding: '4px 10px 6px',
                borderTop: '1px solid #1e293b',
                fontSize: 10,
              }}>
                {hasModel ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#22c55e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 10 }}>{'\u2713'}</span>
                      {stageAsset ? stageAsset.name : '3D Model'}
                    </span>
                    <button
                      onClick={() => handleRemoveModel(idx)}
                      style={{
                        background: 'none', border: 'none', color: '#ef4444',
                        fontSize: 9, cursor: 'pointer', padding: '1px 4px',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label style={{
                    display: 'block',
                    padding: '4px',
                    borderRadius: 4,
                    border: '1px dashed #334155',
                    color: '#64748b',
                    fontSize: 9,
                    textAlign: 'center' as const,
                    cursor: 'pointer',
                  }}>
                    <input
                      type="file"
                      accept=".glb,.gltf,.obj,.fbx"
                      onChange={(e) => handleModelUpload(idx, e)}
                      style={{ display: 'none' }}
                    />
                    Upload 3D Model (.glb)
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 9, color: '#475569', marginTop: 6, lineHeight: 1.3 }}>
        Upload GLB models per stage. Without a model, primitive shapes are used as placeholders.
      </div>
    </Section>
  );
};

const CameraSection: React.FC<{
  obj: SceneObject;
  sceneId: string;
  handleMetadata: (key: string, value: unknown) => void;
}> = ({ obj, sceneId, handleMetadata }) => {
  const setActiveCamera = useProjectStore((s) => s.setActiveCamera);
  const isActive = (obj.metadata?.isEntry as boolean) ?? false;

  return (
    <Section title="Camera">
      <Field label="FOV">
        <input
          type="number"
          step={5}
          min={10}
          max={180}
          value={(obj.metadata?.fov as number) ?? 60}
          onChange={(e) => handleMetadata('fov', parseFloat(e.target.value) || 60)}
          style={styles.numInput}
        />
      </Field>
      <div style={{ marginTop: 6 }}>
        {isActive ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            borderRadius: 6,
            background: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
          }}>
            <span style={{ fontSize: 12 }}>{'\u2713'}</span>
            <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>Active Camera</span>
          </div>
        ) : (
          <button
            onClick={() => setActiveCamera(sceneId, obj.id)}
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #334155',
              background: '#1e293b',
              color: '#94a3b8',
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Set as Active Camera
          </button>
        )}
      </div>
      <div style={{ fontSize: 10, color: '#475569', marginTop: 6, lineHeight: 1.4 }}>
        The active camera is used as the spawn point in Preview mode.
      </div>
    </Section>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={styles.section}>
    <div style={styles.sectionTitle}>{title}</div>
    {children}
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={styles.field}>
    <label style={styles.label}>{label}</label>
    {children}
  </div>
);

const Vec3Input: React.FC<{
  value: Vector3;
  onChange: (axis: keyof Vector3, value: string) => void;
}> = ({ value, onChange }) => (
  <div style={styles.vec3Row}>
    {(['x', 'y', 'z'] as const).map((axis) => (
      <div key={axis} style={styles.vec3Field}>
        <label style={styles.axisLabel}>{axis.toUpperCase()}</label>
        <input
          type="number"
          step={0.1}
          value={value[axis]}
          onChange={(e) => onChange(axis, e.target.value)}
          style={styles.numInput}
        />
      </div>
    ))}
  </div>
);

const RotationInput: React.FC<{
  rotation: Quaternion;
  onChange: (axis: 'x' | 'y' | 'z', value: string) => void;
}> = ({ rotation, onChange }) => {
  const toDeg = (rad: number) => Math.round((rad * 180) / Math.PI * 10) / 10;
  return (
    <div style={styles.vec3Row}>
      {(['x', 'y', 'z'] as const).map((axis) => (
        <div key={axis} style={styles.vec3Field}>
          <label style={styles.axisLabel}>{axis.toUpperCase()}</label>
          <input
            type="number"
            step={5}
            value={toDeg(rotation[axis])}
            onChange={(e) => onChange(axis, e.target.value)}
            style={styles.numInput}
          />
        </div>
      ))}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    background: '#0f172a',
    borderLeft: '1px solid #1e293b',
    color: '#e2e8f0',
    overflowY: 'auto',
    fontSize: 12,
    flexShrink: 0,
  },
  header: {
    padding: '12px',
    fontWeight: 600,
    fontSize: 11,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderBottom: '1px solid #1e293b',
  },
  section: { padding: '8px 12px', borderBottom: '1px solid #1e293b' },
  sectionTitle: { fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 },
  field: { marginBottom: 6 },
  label: { display: 'block', fontSize: 10, color: '#94a3b8', marginBottom: 2 },
  input: {
    width: '100%',
    padding: '4px 8px',
    borderRadius: 4,
    border: '1px solid #334155',
    background: '#1e293b',
    color: '#fff',
    fontSize: 12,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  readOnly: { color: '#64748b' },
  toggleRow: { display: 'flex', gap: 12 },
  toggle: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#94a3b8', cursor: 'pointer', marginBottom: 4 },
  vec3Row: { display: 'flex', gap: 6 },
  vec3Field: { flex: 1 },
  axisLabel: { fontSize: 9, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 2 },
  numInput: {
    width: '100%',
    padding: '4px 6px',
    borderRadius: 4,
    border: '1px solid #334155',
    background: '#1e293b',
    color: '#fff',
    fontSize: 11,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  colorInput: {
    width: '100%',
    height: 28,
    padding: 2,
    borderRadius: 4,
    border: '1px solid #334155',
    background: '#1e293b',
    cursor: 'pointer',
  },
  chipRow: { display: 'flex', gap: 4, flexWrap: 'wrap' as const },
  chip: {
    padding: '4px 8px',
    borderRadius: 4,
    border: '1px solid #334155',
    background: '#0a0a1a',
    color: '#94a3b8',
    fontSize: 10,
    cursor: 'pointer',
  },
  chipActive: {
    borderColor: '#3b82f6',
    background: '#1e293b',
    color: '#fff',
  },
  tagList: { display: 'flex', flexWrap: 'wrap' as const, gap: 4 },
  tag: {
    fontSize: 10,
    padding: '2px 6px',
    borderRadius: 3,
    background: '#334155',
    color: '#94a3b8',
  },
  muted: { color: '#475569', fontStyle: 'italic', fontSize: 11 },
  textureInfo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  textureName: {
    fontSize: 11,
    color: '#e2e8f0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  textureRemoveBtn: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    fontSize: 10,
    cursor: 'pointer',
    padding: '2px 4px',
    flexShrink: 0,
  },
  uploadBtn: {
    display: 'block',
    width: '100%',
    padding: '6px',
    borderRadius: 4,
    border: '1px dashed #334155',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: 11,
    textAlign: 'center' as const,
    cursor: 'pointer',
    marginTop: 4,
  },
};
