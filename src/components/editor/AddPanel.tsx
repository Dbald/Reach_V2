import React, { useState } from 'react';
import { useProjectStore } from '@/store';
import type { PlacementType } from '@/store/projectStore';
import type { EnvironmentConfig } from '@/types';

const categories: { id: PlacementType; label: string; desc: string; icon: string }[] = [
  { id: 'sky',    label: 'Sky',     desc: 'Skybox & environment',     icon: '\u2600' },
  { id: 'object', label: 'Object',  desc: 'Box, sphere, plane mesh',  icon: '\u25A2' },
  { id: 'video',  label: 'Video',   desc: 'Video screen in scene',    icon: '\u25B6' },
  { id: 'audio',  label: 'Audio',   desc: 'Spatial audio source',     icon: '\u266B' },
  { id: 'light',  label: 'Light',   desc: 'Point, spot, or area',     icon: '\u2736' },
  { id: 'text',   label: 'Text',    desc: '3D text label',            icon: 'T' },
  { id: 'camera', label: 'Camera',  desc: 'Viewpoint / spawn point',  icon: '\u25CE' },
  { id: 'zone',   label: 'Zone',    desc: 'Walk / collision area',    icon: '\u25A3' },
];

const skyPresets = [
  { id: 'sunset', label: 'Sunset' },
  { id: 'dawn', label: 'Dawn' },
  { id: 'night', label: 'Night' },
  { id: 'warehouse', label: 'Studio' },
  { id: 'forest', label: 'Forest' },
  { id: 'city', label: 'City' },
  { id: 'park', label: 'Park' },
  { id: 'lobby', label: 'Lobby' },
];

export const AddPanel: React.FC = () => {
  const activeTool = useProjectStore((s) => s.editor.activeTool);
  const placementType = useProjectStore((s) => s.editor.placementType);
  const setPlacementType = useProjectStore((s) => s.setPlacementType);
  const setActiveTool = useProjectStore((s) => s.setActiveTool);

  if (activeTool !== 'place') return null;

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>Add to Scene</span>
        <button style={styles.closeBtn} onClick={() => setActiveTool('select')}>&times;</button>
      </div>

      {placementType === 'sky' ? (
        <SkySettings onBack={() => setPlacementType(null)} />
      ) : placementType === 'zone' ? (
        <ZoneSettings onBack={() => setPlacementType(null)} />
      ) : placementType ? (
        <PlacementSettings type={placementType} onBack={() => setPlacementType(null)} />
      ) : (
        <div style={styles.grid}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setPlacementType(cat.id)}
              style={styles.catBtn}
            >
              <span style={styles.catIcon}>{cat.icon}</span>
              <span style={styles.catLabel}>{cat.label}</span>
              <span style={styles.catDesc}>{cat.desc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ---------- Per-type placement settings ---------- */

const lightTypes = ['point', 'spot', 'directional'] as const;
const objectShapes = ['box', 'sphere', 'cylinder', 'plane'] as const;

const PlacementSettings: React.FC<{ type: Exclude<PlacementType, 'sky' | 'zone' | null>; onBack: () => void }> = ({ type, onBack }) => {
  const activeSceneId = useProjectStore((s) => s.editor.activeSceneId);
  const addObject = useProjectStore((s) => s.addObject);
  const selectObject = useProjectStore((s) => s.selectObject);
  const setPlacementSettings = useProjectStore((s) => s.setPlacementSettings);

  // Shared
  const [name, setName] = useState('');
  // Object
  const [shape, setShape] = useState<typeof objectShapes[number]>('box');
  // Light
  const [lightType, setLightType] = useState<typeof lightTypes[number]>('point');
  const [intensity, setIntensity] = useState(1);
  const [color, setColor] = useState('#ffffff');
  // Text
  const [text, setText] = useState('Hello');
  const [fontSize, setFontSize] = useState(0.4);
  // Video
  const [videoUrl, setVideoUrl] = useState('');
  // Audio
  const [audioUrl, setAudioUrl] = useState('');
  const [loop, setLoop] = useState(true);
  const [volume, setVolume] = useState(1);

  // Sync settings to store so GroundInteraction can read them
  React.useEffect(() => {
    const settings: Record<string, unknown> = { name };
    switch (type) {
      case 'object': settings.shape = shape; break;
      case 'light': Object.assign(settings, { lightType, intensity, color }); break;
      case 'text': Object.assign(settings, { text, fontSize }); break;
      case 'video': settings.url = videoUrl; break;
      case 'audio': Object.assign(settings, { url: audioUrl, loop, volume }); break;
    }
    setPlacementSettings(settings);
  }, [type, name, shape, lightType, intensity, color, text, fontSize, videoUrl, audioUrl, loop, volume, setPlacementSettings]);

  const getDefaults = () => {
    const base = {
      name: name || defaultNames[type],
      transform: {
        position: { x: 0, y: defaultY[type], z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
      },
    };
    switch (type) {
      case 'object':
        return { ...base, type: 'mesh' as const, tags: [], metadata: { shape } };
      case 'light':
        return { ...base, type: 'light' as const, tags: [], metadata: { lightType, intensity, color } };
      case 'camera':
        return { ...base, type: 'camera' as const, tags: [], metadata: { fov: 60, isEntry: false } };
      case 'text':
        return { ...base, type: 'text' as const, tags: [], metadata: { text, fontSize } };
      case 'video':
        return { ...base, type: 'video' as const, tags: [], metadata: { url: videoUrl, autoplay: false } };
      case 'audio':
        return { ...base, type: 'audio' as const, tags: [], metadata: { url: audioUrl, loop, volume, spatial: true } };
      default:
        return { ...base, type: 'mesh' as const, tags: [], metadata: {} };
    }
  };

  const handleAddNow = () => {
    if (!activeSceneId) return;
    const def = getDefaults();
    const id = addObject(activeSceneId, def.type, {
      name: def.name,
      transform: def.transform,
      tags: def.tags,
      metadata: def.metadata,
    });
    selectObject(id);
  };

  const catInfo = categories.find((c) => c.id === type)!;

  return (
    <div style={styles.settingsPanel}>
      <button style={styles.backBtn} onClick={onBack}>&larr; Back</button>
      <div style={styles.catHeader}>
        <span style={styles.catIcon}>{catInfo.icon}</span>
        <span style={styles.catLabel}>{catInfo.label}</span>
      </div>

      {/* Name (all types) */}
      <div style={styles.fieldGroup}>
        <label style={styles.fieldLabel}>Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={defaultNames[type]}
          style={styles.input}
        />
      </div>

      {/* Object-specific */}
      {type === 'object' && (
        <div style={styles.fieldGroup}>
          <label style={styles.fieldLabel}>Shape</label>
          <div style={styles.chipRow}>
            {objectShapes.map((s) => (
              <button
                key={s}
                onClick={() => setShape(s)}
                style={{ ...styles.chip, ...(shape === s ? styles.chipActive : {}) }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Light-specific */}
      {type === 'light' && (
        <>
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Type</label>
            <div style={styles.chipRow}>
              {lightTypes.map((lt) => (
                <button
                  key={lt}
                  onClick={() => setLightType(lt)}
                  style={{ ...styles.chip, ...(lightType === lt ? styles.chipActive : {}) }}
                >
                  {lt}
                </button>
              ))}
            </div>
          </div>
          <div style={styles.fieldRow2}>
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Intensity</label>
              <input type="number" step={0.1} value={intensity} onChange={(e) => setIntensity(parseFloat(e.target.value) || 1)} style={styles.numInput} />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Color</label>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={styles.colorInput} />
            </div>
          </div>
        </>
      )}

      {/* Text-specific */}
      {type === 'text' && (
        <>
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Text Content</label>
            <input value={text} onChange={(e) => setText(e.target.value)} style={styles.input} />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Font Size</label>
            <input type="number" step={0.1} min={0.1} value={fontSize} onChange={(e) => setFontSize(parseFloat(e.target.value) || 0.4)} style={styles.numInput} />
          </div>
        </>
      )}

      {/* Video-specific */}
      {type === 'video' && (
        <div style={styles.fieldGroup}>
          <label style={styles.fieldLabel}>Video URL</label>
          <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." style={styles.input} />
        </div>
      )}

      {/* Audio-specific */}
      {type === 'audio' && (
        <>
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Audio URL</label>
            <input value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="https://..." style={styles.input} />
          </div>
          <div style={styles.fieldRow2}>
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Volume</label>
              <input type="number" step={0.1} min={0} max={1} value={volume} onChange={(e) => setVolume(parseFloat(e.target.value) || 1)} style={styles.numInput} />
            </div>
            <label style={styles.checkRow}>
              <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} />
              <span>Loop</span>
            </label>
          </div>
        </>
      )}

      {/* Camera-specific */}
      {type === 'camera' && (
        <div style={styles.fieldGroup}>
          <span style={styles.hintText}>Click the ground to place a viewpoint marker. Edit FOV and entry point in the Properties panel.</span>
        </div>
      )}

      <div style={styles.addActions}>
        <button onClick={handleAddNow} style={styles.addBtn}>
          Add at Origin
        </button>
        <div style={styles.hint}>
          or click on the ground to place
        </div>
      </div>
    </div>
  );
};

const defaultNames: Record<string, string> = {
  object: 'Object',
  light: 'Light',
  camera: 'Camera',
  text: 'Text',
  video: 'Video',
  audio: 'Audio',
};

const defaultY: Record<string, number> = {
  object: 0.5,
  light: 2,
  camera: 1.7,
  text: 1.5,
  video: 1.5,
  audio: 1,
};

/* ---------- Zone Settings ---------- */

const ZoneSettings: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const activeSceneId = useProjectStore((s) => s.editor.activeSceneId);
  const addZone = useProjectStore((s) => s.addZone);

  const [name, setName] = useState('');
  const [sizeX, setSizeX] = useState(4);
  const [sizeY, setSizeY] = useState(2.5);
  const [sizeZ, setSizeZ] = useState(4);
  const [walkable, setWalkable] = useState(true);
  const [hasCollision, setHasCollision] = useState(false);
  const [color, setColor] = useState('#22c55e');

  const handleAddNow = () => {
    if (!activeSceneId) return;
    const zoneCount = Object.keys(
      useProjectStore.getState().project?.scenes[activeSceneId]?.zones ?? {}
    ).length;
    const zoneName = name || `Zone ${zoneCount + 1}`;
    const r = parseInt(color.slice(1, 3), 16) / 255;
    const g = parseInt(color.slice(3, 5), 16) / 255;
    const b = parseInt(color.slice(5, 7), 16) / 255;
    addZone(activeSceneId, {
      name: zoneName,
      shape: 'box',
      points: [{ x: 0, y: 0, z: 0 }],
      size: { x: sizeX, y: sizeY, z: sizeZ },
      walkable,
      hasCollision,
      label: zoneName,
      color: { r, g, b, a: 0.15 },
    });
  };

  return (
    <div style={styles.settingsPanel}>
      <button style={styles.backBtn} onClick={onBack}>&larr; Back</button>
      <div style={styles.catHeader}>
        <span style={styles.catIcon}>{'\u25A3'}</span>
        <span style={styles.catLabel}>Zone</span>
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.fieldLabel}>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Zone" style={styles.input} />
      </div>

      <div style={styles.sectionTitle}>Size</div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[
          { label: 'W', value: sizeX, set: setSizeX },
          { label: 'H', value: sizeY, set: setSizeY },
          { label: 'D', value: sizeZ, set: setSizeZ },
        ].map((s) => (
          <div key={s.label} style={{ flex: 1 }}>
            <label style={{ fontSize: 9, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 2 }}>{s.label}</label>
            <input type="number" step={0.5} min={0.5} value={s.value} onChange={(e) => s.set(parseFloat(e.target.value) || 1)} style={styles.numInput} />
          </div>
        ))}
      </div>

      <div style={{ ...styles.fieldGroup, marginTop: 10 }}>
        <label style={styles.checkRow}>
          <input type="checkbox" checked={walkable} onChange={(e) => setWalkable(e.target.checked)} />
          <span>Walkable</span>
        </label>
        <label style={styles.checkRow}>
          <input type="checkbox" checked={hasCollision} onChange={(e) => setHasCollision(e.target.checked)} />
          <span>Has Collision</span>
        </label>
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.fieldLabel}>Color</label>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={styles.colorInput} />
      </div>

      <div style={styles.addActions}>
        <button onClick={handleAddNow} style={styles.addBtn}>
          Add at Origin
        </button>
        <div style={styles.hint}>
          or click on the ground to place
        </div>
      </div>
    </div>
  );
};

/* ---------- Sky Settings ---------- */

const SkySettings: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const project = useProjectStore((s) => s.project);
  const activeSceneId = useProjectStore((s) => s.editor.activeSceneId);
  const [selectedPreset, setSelectedPreset] = useState(
    project?.scenes[activeSceneId ?? '']?.environment.skybox ?? 'sunset'
  );

  const updateEnv = (updates: Partial<EnvironmentConfig>) => {
    if (!project || !activeSceneId) return;
    const store = useProjectStore.getState();
    store._pushUndo();
    useProjectStore.setState((state: any) => {
      const s = state.project?.scenes[activeSceneId];
      if (s) Object.assign(s.environment, updates);
    });
  };

  const env = project?.scenes[activeSceneId ?? '']?.environment;

  return (
    <div style={styles.settingsPanel}>
      <button style={styles.backBtn} onClick={onBack}>&larr; Back</button>
      <div style={styles.sectionTitle}>Sky Preset</div>
      <div style={styles.presetGrid}>
        {skyPresets.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setSelectedPreset(p.id);
              updateEnv({ skybox: p.id });
            }}
            style={{
              ...styles.chip,
              ...(selectedPreset === p.id ? styles.chipActive : {}),
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div style={styles.sectionTitle}>Fog</div>
      <label style={styles.checkRow}>
        <input
          type="checkbox"
          checked={env?.fogEnabled ?? false}
          onChange={(e) => updateEnv({ fogEnabled: e.target.checked })}
        />
        <span>Enable fog</span>
      </label>
      {env?.fogEnabled && (
        <div style={styles.fieldRow2}>
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Near</label>
            <input type="number" step={1} value={env?.fogNear ?? 10} onChange={(e) => updateEnv({ fogNear: parseFloat(e.target.value) || 10 })} style={styles.numInput} />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Far</label>
            <input type="number" step={1} value={env?.fogFar ?? 50} onChange={(e) => updateEnv({ fogFar: parseFloat(e.target.value) || 50 })} style={styles.numInput} />
          </div>
        </div>
      )}

      <div style={styles.sectionTitle}>Ground</div>
      <label style={styles.checkRow}>
        <input
          type="checkbox"
          checked={env?.groundPlane ?? true}
          onChange={(e) => updateEnv({ groundPlane: e.target.checked })}
        />
        <span>Show ground plane</span>
      </label>
    </div>
  );
};

/* ---------- Styles ---------- */

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'absolute',
    top: 56,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 360,
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 10,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    zIndex: 100,
    color: '#e2e8f0',
    fontSize: 12,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    borderBottom: '1px solid #1e293b',
  },
  title: { fontWeight: 600, fontSize: 13 },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: 18,
    cursor: 'pointer',
    padding: '0 4px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 6,
    padding: 10,
  },
  catBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '12px 8px',
    borderRadius: 8,
    border: '1px solid #1e293b',
    background: '#0a0a1a',
    color: '#94a3b8',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  catHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  catIcon: { fontSize: 20 },
  catLabel: { fontWeight: 600, fontSize: 13 },
  catDesc: { fontSize: 10, color: '#64748b', textAlign: 'center' },
  // Settings panel (shared by placement & sky)
  settingsPanel: { padding: '10px 14px' },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    cursor: 'pointer',
    fontSize: 12,
    padding: '4px 0',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 6,
  },
  fieldGroup: { marginBottom: 10 },
  fieldLabel: { fontSize: 10, color: '#94a3b8', display: 'block', marginBottom: 4 },
  fieldRow2: { display: 'flex', gap: 8 },
  input: {
    width: '100%',
    padding: '6px 8px',
    borderRadius: 6,
    border: '1px solid #334155',
    background: '#1e293b',
    color: '#fff',
    fontSize: 12,
    outline: 'none',
    boxSizing: 'border-box',
  },
  numInput: {
    width: '100%',
    padding: '6px 8px',
    borderRadius: 6,
    border: '1px solid #334155',
    background: '#1e293b',
    color: '#fff',
    fontSize: 12,
    outline: 'none',
    boxSizing: 'border-box',
  },
  colorInput: {
    width: '100%',
    height: 32,
    padding: 2,
    borderRadius: 6,
    border: '1px solid #334155',
    background: '#1e293b',
    cursor: 'pointer',
  },
  chipRow: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  chip: {
    padding: '5px 10px',
    borderRadius: 6,
    border: '1px solid #334155',
    background: '#0a0a1a',
    color: '#94a3b8',
    fontSize: 11,
    cursor: 'pointer',
  },
  chipActive: {
    borderColor: '#3b82f6',
    background: '#1e293b',
    color: '#fff',
  },
  presetGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr 1fr',
    gap: 4,
  },
  checkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    color: '#94a3b8',
    cursor: 'pointer',
    marginBottom: 4,
  },
  hintText: { fontSize: 11, color: '#64748b', lineHeight: 1.4 },
  hint: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
  },
  addActions: {
    borderTop: '1px solid #1e293b',
    paddingTop: 10,
    marginTop: 10,
  },
  addBtn: {
    width: '100%',
    padding: '8px',
    borderRadius: 6,
    border: 'none',
    background: '#3b82f6',
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
};
