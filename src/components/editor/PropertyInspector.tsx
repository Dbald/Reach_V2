import React from 'react';
import { useProjectStore } from '@/store';
import type { SceneObject, Vector3 } from '@/types';

export const PropertyInspector: React.FC = () => {
  const project = useProjectStore((s) => s.project);
  const activeSceneId = useProjectStore((s) => s.editor.activeSceneId);
  const selectedObjectId = useProjectStore((s) => s.editor.selectedObjectId);
  const updateObject = useProjectStore((s) => s.updateObject);
  const setObjectTransform = useProjectStore((s) => s.setObjectTransform);
  const showInspector = useProjectStore((s) => s.editor.showInspector);

  if (!showInspector || !project || !activeSceneId || !selectedObjectId) return null;

  const scene = project.scenes[activeSceneId];
  const obj = scene?.objects[selectedObjectId];
  if (!obj) return null;

  const handleVec3Change = (
    field: 'position' | 'scale',
    axis: keyof Vector3,
    value: string
  ) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    const transform = { ...obj.transform };
    transform[field] = { ...transform[field], [axis]: num };
    setObjectTransform(activeSceneId, obj.id, transform);
  };

  const handleNameChange = (name: string) => {
    updateObject(activeSceneId, obj.id, { name });
  };

  const handleToggle = (field: 'visible' | 'locked') => {
    updateObject(activeSceneId, obj.id, { [field]: !obj[field] });
  };

  return (
    <div style={styles.panel}>
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
    width: 260,
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
  },
  readOnly: { color: '#64748b' },
  toggleRow: { display: 'flex', gap: 12 },
  toggle: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#94a3b8', cursor: 'pointer' },
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
  },
  tagList: { display: 'flex', flexWrap: 'wrap', gap: 4 },
  tag: {
    fontSize: 10,
    padding: '2px 6px',
    borderRadius: 3,
    background: '#334155',
    color: '#94a3b8',
  },
  muted: { color: '#475569', fontStyle: 'italic', fontSize: 11 },
};
