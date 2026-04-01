import React, { useState } from 'react';
import { useProjectStore } from '@/store';
import type { PlacementType, ZonePreset } from '@/store/projectStore';
import type { EnvironmentConfig, GroundMaterial } from '@/types';
import { GROUND_MATERIALS } from '@/config/groundMaterials';
import { CATALOG_CATEGORIES, getCatalogByCategory } from '@/config/assetCatalog';
import type { AssetCategory, CatalogItem } from '@/config/assetCatalog';
import { searchSketchfab, SKETCHFAB_SUGGESTIONS } from '@/services/sketchfab';
import type { SketchfabModel } from '@/services/sketchfab';

const categories: { id: PlacementType; label: string; desc: string; icon: string }[] = [
  { id: 'catalog', label: 'Library', desc: 'Browse asset catalog',     icon: '\u{1F4E6}' },
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

  // Once a type is selected, dock to the right as a compact sidebar
  const isDocked = !!placementType;
  const isWide = placementType === ('catalog' as any) || placementType === 'sky';

  return (
    <div style={isDocked ? { ...styles.panelDocked, ...(isWide ? { width: 300 } : {}) } : styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>{isDocked ? '' : 'Add to Scene'}</span>
        <button style={styles.closeBtn} onClick={() => setActiveTool('select')}>&times;</button>
      </div>

      {placementType === 'sky' ? (
        <SkySettings onBack={() => setPlacementType(null)} />
      ) : placementType === 'zone' ? (
        <ZoneSettings onBack={() => setPlacementType(null)} />
      ) : placementType === 'catalog' as any ? (
        <AssetCatalogPanel onBack={() => setPlacementType(null)} />
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

const zonePresets: { id: ZonePreset; label: string; desc: string; color: string; icon: string }[] = [
  { id: 'walkable',  label: 'Walkable',  desc: 'Area players can walk in',   color: '#22c55e', icon: '\u{1F6B6}' },
  { id: 'collision',  label: 'Collision', desc: 'Blocks player movement',     color: '#ef4444', icon: '\u{1F6AB}' },
  { id: 'custom',    label: 'Custom',    desc: 'Set your own properties',     color: '#3b82f6', icon: '\u2699'    },
];

const ZoneSettings: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const zoneDraw = useProjectStore((s) => s.editor.zoneDraw);
  const startZoneDraw = useProjectStore((s) => s.startZoneDraw);
  const cancelZoneDraw = useProjectStore((s) => s.cancelZoneDraw);
  const updateZoneDraw = useProjectStore((s) => s.updateZoneDraw);

  const handleBack = () => {
    cancelZoneDraw();
    onBack();
  };

  // If not actively drawing, show preset selection
  if (!zoneDraw.active) {
    return (
      <div style={styles.settingsPanel}>
        <button style={styles.backBtn} onClick={handleBack}>&larr; Back</button>
        <div style={styles.catHeader}>
          <span style={styles.catIcon}>{'\u25A3'}</span>
          <span style={styles.catLabel}>Zone</span>
        </div>

        <div style={styles.sectionTitle}>Zone Type</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {zonePresets.map((p) => (
            <button
              key={p.id}
              onClick={() => startZoneDraw(p.id, {})}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #334155',
                background: '#0a0a1a',
                color: '#e2e8f0',
                cursor: 'pointer',
                textAlign: 'left' as const,
              }}
            >
              <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{p.icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 12, color: p.color }}>{p.label}</div>
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{p.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Active draw mode — show settings and instructions
  const presetInfo = zonePresets.find((p) => p.id === zoneDraw.preset)!;
  const step = zoneDraw.corner1 ? 2 : 1;

  return (
    <div style={styles.settingsPanel}>
      <button style={styles.backBtn} onClick={handleBack}>&larr; Back</button>
      <div style={styles.catHeader}>
        <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{presetInfo.icon}</span>
        <span style={{ ...styles.catLabel, color: zoneDraw.color }}>{presetInfo.label} Zone</span>
      </div>

      {/* Draw instructions */}
      <div style={{
        padding: '10px 12px',
        borderRadius: 8,
        background: `${zoneDraw.color}15`,
        border: `1px solid ${zoneDraw.color}40`,
        marginBottom: 12,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: zoneDraw.color, marginBottom: 4 }}>
          Step {step} of 2
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
          {step === 1
            ? 'Click on the ground to set the first corner of the zone.'
            : 'Move your mouse and click to set the opposite corner.'}
        </div>
      </div>

      {/* Name */}
      <div style={styles.fieldGroup}>
        <label style={styles.fieldLabel}>Name</label>
        <input
          value={zoneDraw.name}
          onChange={(e) => updateZoneDraw({ name: e.target.value })}
          placeholder="Zone"
          style={styles.input}
        />
      </div>

      {/* Height */}
      <div style={styles.fieldGroup}>
        <label style={styles.fieldLabel}>Height</label>
        <input
          type="number"
          step={0.5}
          min={0.5}
          value={zoneDraw.height}
          onChange={(e) => updateZoneDraw({ height: parseFloat(e.target.value) || 2.5 })}
          style={styles.numInput}
        />
      </div>

      {/* Properties */}
      <div style={{ ...styles.fieldGroup, marginTop: 6 }}>
        <label style={styles.checkRow}>
          <input
            type="checkbox"
            checked={zoneDraw.walkable}
            onChange={(e) => updateZoneDraw({ walkable: e.target.checked })}
          />
          <span>Walkable</span>
        </label>
        <label style={styles.checkRow}>
          <input
            type="checkbox"
            checked={zoneDraw.hasCollision}
            onChange={(e) => updateZoneDraw({ hasCollision: e.target.checked })}
          />
          <span>Collision</span>
        </label>
      </div>

      {/* Color */}
      <div style={styles.fieldGroup}>
        <label style={styles.fieldLabel}>Color</label>
        <input
          type="color"
          value={zoneDraw.color}
          onChange={(e) => updateZoneDraw({ color: e.target.value })}
          style={styles.colorInput}
        />
      </div>

      <button
        onClick={handleBack}
        style={{ ...styles.addBtn, background: '#334155', marginTop: 8 }}
      >
        Cancel Drawing
      </button>
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

      {env?.groundPlane && (
        <>
          <div style={{ ...styles.sectionTitle, marginTop: 8 }}>Ground Material</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {GROUND_MATERIALS.filter((m) => m.id !== 'custom').map((mat) => (
              <button
                key={mat.id}
                onClick={() => updateEnv({ groundMaterial: mat.id as GroundMaterial })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 8px',
                  borderRadius: 6,
                  border: `1px solid ${(env?.groundMaterial ?? 'grass') === mat.id ? '#3b82f6' : '#334155'}`,
                  background: (env?.groundMaterial ?? 'grass') === mat.id ? '#1e293b' : '#0a0a1a',
                  color: (env?.groundMaterial ?? 'grass') === mat.id ? '#fff' : '#94a3b8',
                  cursor: 'pointer',
                  fontSize: 11,
                }}
              >
                <span style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  background: mat.color,
                  flexShrink: 0,
                }} />
                <span>{mat.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/* ---------- Asset Catalog Panel ---------- */

const AssetCatalogPanel: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const activeSceneId = useProjectStore((s) => s.editor.activeSceneId);
  const addObject = useProjectStore((s) => s.addObject);
  const selectObject = useProjectStore((s) => s.selectObject);

  const [activeCategory, setActiveCategory] = useState<AssetCategory | null>(null);
  const [tab, setTab] = useState<'catalog' | 'sketchfab'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [sfResults, setSfResults] = useState<SketchfabModel[]>([]);
  const [sfLoading, setSfLoading] = useState(false);
  const [sfSearched, setSfSearched] = useState(false);

  const handlePlaceItem = (item: CatalogItem) => {
    if (!activeSceneId || !item.primitive) return;
    const p = item.primitive;
    const id = addObject(activeSceneId, 'mesh', {
      name: item.name,
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: p.scale[0], y: p.scale[1], z: p.scale[2] },
      },
      material: {
        color: hexToColor(p.color),
        roughness: 0.7,
        metalness: 0,
      },
      tags: item.tags,
      metadata: { shape: p.shape, catalogId: item.id },
      ...(item.growthStages ? { growthStages: item.growthStages, activeStageIndex: 0 } : {}),
    });
    selectObject(id);
  };

  const handleSketchfabSearch = async () => {
    if (!searchQuery.trim()) return;
    setSfLoading(true);
    setSfSearched(true);
    const result = await searchSketchfab(searchQuery);
    setSfResults(result.models);
    setSfLoading(false);
  };

  const items = activeCategory ? getCatalogByCategory(activeCategory) : [];

  return (
    <div style={styles.settingsPanel}>
      <button style={styles.backBtn} onClick={activeCategory ? () => setActiveCategory(null) : onBack}>
        &larr; {activeCategory ? 'Categories' : 'Back'}
      </button>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 10, background: '#0a0a1a', borderRadius: 6, padding: 2 }}>
        <button
          onClick={() => setTab('catalog')}
          style={{
            flex: 1, padding: '6px', borderRadius: 4, border: 'none',
            background: tab === 'catalog' ? '#1e293b' : 'transparent',
            color: tab === 'catalog' ? '#fff' : '#64748b',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Built-in
        </button>
        <button
          onClick={() => setTab('sketchfab')}
          style={{
            flex: 1, padding: '6px', borderRadius: 4, border: 'none',
            background: tab === 'sketchfab' ? '#1e293b' : 'transparent',
            color: tab === 'sketchfab' ? '#fff' : '#64748b',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Sketchfab
        </button>
      </div>

      {tab === 'catalog' && !activeCategory && (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Asset Library</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {CATALOG_CATEGORIES.map((cat) => {
              const count = getCatalogByCategory(cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 6,
                    border: '1px solid #334155', background: '#0a0a1a',
                    color: '#e2e8f0', cursor: 'pointer', textAlign: 'left' as const,
                  }}
                >
                  <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{cat.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{cat.label}</div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{cat.desc}</div>
                  </div>
                  <span style={{ fontSize: 10, color: '#64748b' }}>{count}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {tab === 'catalog' && activeCategory && (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            {CATALOG_CATEGORIES.find((c) => c.id === activeCategory)?.label}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 8px', borderRadius: 6,
                  border: '1px solid #334155', background: '#0a0a1a',
                }}
              >
                {item.primitive && (
                  <span style={{
                    width: 28, height: 28, borderRadius: 4,
                    background: item.primitive.color,
                    flexShrink: 0,
                  }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {item.name}
                    {item.growthStages && (
                      <span style={{
                        fontSize: 8, padding: '1px 4px', borderRadius: 3,
                        background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e',
                        fontWeight: 600, lineHeight: 1.2,
                      }}>
                        Growth
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 9, color: '#64748b' }}>
                    {item.tags.slice(0, 2).join(' \u00B7 ')}
                    {item.growthStages && ` \u00B7 ${item.growthStages.length} stages`}
                  </div>
                </div>
                <button
                  onClick={() => handlePlaceItem(item)}
                  style={{
                    padding: '4px 8px', borderRadius: 4, border: 'none',
                    background: '#3b82f6', color: '#fff', fontSize: 10,
                    fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  Add
                </button>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: '#475569', marginTop: 8, textAlign: 'center' }}>
            Click Add to place at origin, then position in the scene
          </div>
        </>
      )}

      {tab === 'sketchfab' && (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Sketchfab Search</div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSketchfabSearch(); }}
              placeholder="Search 3D models..."
              style={{ ...styles.input, flex: 1 }}
            />
            <button
              onClick={handleSketchfabSearch}
              disabled={sfLoading}
              style={{
                padding: '6px 10px', borderRadius: 6, border: 'none',
                background: '#3b82f6', color: '#fff', fontSize: 11,
                fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                opacity: sfLoading ? 0.5 : 1,
              }}
            >
              {sfLoading ? '...' : 'Search'}
            </button>
          </div>

          {/* Quick suggestions */}
          {!sfSearched && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>Suggestions</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {SKETCHFAB_SUGGESTIONS.slice(0, 8).map((s) => (
                  <button
                    key={s}
                    onClick={() => { setSearchQuery(s); }}
                    style={{
                      padding: '3px 8px', borderRadius: 4,
                      border: '1px solid #334155', background: '#0a0a1a',
                      color: '#94a3b8', fontSize: 10, cursor: 'pointer',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {sfSearched && sfResults.length === 0 && !sfLoading && (
            <div style={{ color: '#475569', fontSize: 11, fontStyle: 'italic', textAlign: 'center', padding: 16 }}>
              No results found. Try a different search term.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
            {sfResults.map((model) => (
              <div
                key={model.uid}
                style={{
                  display: 'flex', gap: 8, padding: '6px 8px',
                  borderRadius: 6, border: '1px solid #334155', background: '#0a0a1a',
                  alignItems: 'center',
                }}
              >
                {model.thumbnailUrl && (
                  <img
                    src={model.thumbnailUrl}
                    alt={model.name}
                    style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {model.name}
                  </div>
                  <div style={{ fontSize: 9, color: '#64748b' }}>
                    {model.authorName} &middot; {(model.faceCount / 1000).toFixed(0)}k faces
                  </div>
                </div>
                <a
                  href={model.viewerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '4px 8px', borderRadius: 4,
                    border: '1px solid #334155', background: '#1e293b',
                    color: '#3b82f6', fontSize: 10, fontWeight: 600,
                    textDecoration: 'none', flexShrink: 0,
                  }}
                >
                  View
                </a>
              </div>
            ))}
          </div>

          {sfResults.length > 0 && (
            <div style={{ fontSize: 10, color: '#475569', marginTop: 8, textAlign: 'center', lineHeight: 1.4 }}>
              Download models from Sketchfab, then import GLB files via the Asset tray below
            </div>
          )}
        </>
      )}
    </div>
  );
};

/** Convert hex color to RGBA color object */
function hexToColor(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { r, g, b, a: 1 };
}

/* ---------- Styles ---------- */

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'absolute',
    top: 36,
    right: 8,
    width: 240,
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 10,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    zIndex: 100,
    color: '#e2e8f0',
    fontSize: 12,
    overflow: 'hidden',
  },
  panelDocked: {
    position: 'absolute',
    top: 36,
    right: 8,
    width: 240,
    maxHeight: 'calc(100% - 48px)',
    overflowY: 'auto',
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 10,
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    zIndex: 100,
    color: '#e2e8f0',
    fontSize: 12,
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
