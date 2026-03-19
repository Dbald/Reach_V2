import React, { useEffect, useState } from 'react';
import { useProjectStore } from '@/store';
import type { SceneObject, Vector3 } from '@/types';

export const PropertyInspector: React.FC = () => {
  const project = useProjectStore((s) => s.project);
  const activeSceneId = useProjectStore((s) => s.editor.activeSceneId);
  const selectedObjectId = useProjectStore((s) => s.editor.selectedObjectId);
  const showInspector = useProjectStore((s) => s.editor.showInspector);

  // Track visibility for smooth transition
  const [visible, setVisible] = useState(false);

  const hasObject = !!(showInspector && project && activeSceneId && selectedObjectId);

  useEffect(() => {
    if (hasObject) {
      // Small delay so the DOM renders at width 0 first, then animates open
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
      overflow: 'hidden',
      transition: 'width 0.2s ease, opacity 0.2s ease',
    }}>
      {obj && (
        <PropertyContent obj={obj} sceneId={activeSceneId!} />
      )}
    </div>
  );
};

const PropertyContent: React.FC<{ obj: SceneObject; sceneId: string }> = ({ obj, sceneId }) => {
  const updateObject = useProjectStore((s) => s.updateObject);
  const setObjectTransform = useProjectStore((s) => s.setObjectTransform);

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

      <Section title="Scale">
        <Vec3Input value={obj.transform.scale} onChange={(axis, val) => handleVec3Change('scale', axis, val)} />
      </Section>

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
          <label style={styles.toggle}>
            <input
              type="checkbox"
              checked={(obj.metadata?.isEntry as boolean) ?? false}
              onChange={(e) => handleMetadata('isEntry', e.target.checked)}
            />
            Entry Point
          </label>
        </Section>
      )}

      <Section title="Tags">
        <div style={styles.tagList}>
          {obj.tags.length === 0 && <span style={styles.muted}>No tags</span>}
          {obj.tags.map((tag) => (
            <span key={tag} style={styles.tag}>{tag}</span>
          ))}
        </div>
      </Section>
    </div>
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
};
