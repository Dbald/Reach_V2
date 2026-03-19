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

      {/* Show sky settings inline, or category picker */}
      {placementType === 'sky' ? (
        <SkySettings onBack={() => setPlacementType(null)} />
      ) : (
        <div style={styles.grid}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setPlacementType(cat.id)}
              style={{
                ...styles.catBtn,
                ...(placementType === cat.id ? styles.catBtnActive : {}),
              }}
            >
              <span style={styles.catIcon}>{cat.icon}</span>
              <span style={styles.catLabel}>{cat.label}</span>
              <span style={styles.catDesc}>{cat.desc}</span>
            </button>
          ))}
        </div>
      )}

      {/* Placement hint for non-sky types */}
      {placementType && placementType !== 'sky' && (
        <div style={styles.hint}>
          Click on the ground to place a {placementType}
        </div>
      )}
    </div>
  );
};

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
    const scene = project.scenes[activeSceneId];
    if (!scene) return;
    // Direct mutation via immer
    useProjectStore.setState((state: any) => {
      const s = state.project?.scenes[activeSceneId];
      if (s) Object.assign(s.environment, updates);
    });
  };

  const env = project?.scenes[activeSceneId ?? '']?.environment;

  return (
    <div style={styles.skyPanel}>
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
              ...styles.presetBtn,
              ...(selectedPreset === p.id ? styles.presetBtnActive : {}),
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
        <div style={styles.fogInputs}>
          <div style={styles.fieldRow}>
            <label style={styles.fieldLabel}>Near</label>
            <input
              type="number"
              step={1}
              value={env?.fogNear ?? 10}
              onChange={(e) => updateEnv({ fogNear: parseFloat(e.target.value) || 10 })}
              style={styles.numInput}
            />
          </div>
          <div style={styles.fieldRow}>
            <label style={styles.fieldLabel}>Far</label>
            <input
              type="number"
              step={1}
              value={env?.fogFar ?? 50}
              onChange={(e) => updateEnv({ fogFar: parseFloat(e.target.value) || 50 })}
              style={styles.numInput}
            />
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

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'absolute',
    top: 56,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 340,
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
  catBtnActive: {
    borderColor: '#3b82f6',
    background: '#1e293b',
    color: '#fff',
  },
  catIcon: { fontSize: 20 },
  catLabel: { fontWeight: 600, fontSize: 12 },
  catDesc: { fontSize: 10, color: '#64748b', textAlign: 'center' },
  hint: {
    padding: '8px 14px',
    borderTop: '1px solid #1e293b',
    color: '#3b82f6',
    fontSize: 11,
    fontWeight: 500,
    textAlign: 'center',
  },
  // Sky settings
  skyPanel: { padding: '10px 14px' },
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
  presetGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr 1fr',
    gap: 4,
  },
  presetBtn: {
    padding: '6px 4px',
    borderRadius: 6,
    border: '1px solid #334155',
    background: '#0a0a1a',
    color: '#94a3b8',
    fontSize: 10,
    cursor: 'pointer',
  },
  presetBtnActive: {
    borderColor: '#3b82f6',
    background: '#1e293b',
    color: '#fff',
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
  fogInputs: { display: 'flex', gap: 8, marginTop: 4 },
  fieldRow: { flex: 1 },
  fieldLabel: { fontSize: 9, color: '#64748b', display: 'block', marginBottom: 2 },
  numInput: {
    width: '100%',
    padding: '4px 6px',
    borderRadius: 4,
    border: '1px solid #334155',
    background: '#1e293b',
    color: '#fff',
    fontSize: 11,
    outline: 'none',
  },
};
