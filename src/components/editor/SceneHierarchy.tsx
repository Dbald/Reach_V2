import React from 'react';
import { useProjectStore } from '@/store';
import { getHierarchy } from '@/services/sceneGraph';

export const SceneHierarchy: React.FC = () => {
  const project = useProjectStore((s) => s.project);
  const activeSceneId = useProjectStore((s) => s.editor.activeSceneId);
  const selectedObjectId = useProjectStore((s) => s.editor.selectedObjectId);
  const selectObject = useProjectStore((s) => s.selectObject);
  const deleteObject = useProjectStore((s) => s.deleteObject);
  const duplicateObject = useProjectStore((s) => s.duplicateObject);
  const showHierarchy = useProjectStore((s) => s.editor.showHierarchy);

  if (!showHierarchy || !project || !activeSceneId) return null;

  const scene = project.scenes[activeSceneId];
  if (!scene) return null;

  const hierarchy = getHierarchy(scene);
  const zoneList = Object.values(scene.zones);

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>Scene</span>
        <span style={styles.sceneName}>{scene.name}</span>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Objects ({hierarchy.length})</div>
        {hierarchy.length === 0 && (
          <div style={styles.empty}>No objects yet. Use Place tool to add objects.</div>
        )}
        {hierarchy.map(({ object: obj, depth }) => (
          <button
            key={obj.id}
            onClick={() => selectObject(obj.id)}
            style={{
              ...styles.item,
              paddingLeft: 12 + depth * 16,
              ...(selectedObjectId === obj.id ? styles.itemSelected : {}),
            }}
          >
            <span style={styles.itemType}>{obj.type.slice(0, 3)}</span>
            <span style={styles.itemName}>{obj.name}</span>
            {!obj.visible && <span style={styles.hidden}>hidden</span>}
            {obj.locked && <span style={styles.locked}>locked</span>}
            {selectedObjectId === obj.id && (
              <span style={styles.actions}>
                <button
                  onClick={(e) => { e.stopPropagation(); duplicateObject(activeSceneId, obj.id); }}
                  style={styles.actionBtn}
                  title="Duplicate"
                >
                  dup
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteObject(activeSceneId, obj.id); }}
                  style={styles.actionBtn}
                  title="Delete"
                >
                  del
                </button>
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Zones ({zoneList.length})</div>
        {zoneList.length === 0 && (
          <div style={styles.empty}>No zones defined. Add walkable zones for VR.</div>
        )}
        {zoneList.map((zone) => (
          <div key={zone.id} style={styles.item}>
            <span style={styles.itemType}>{zone.walkable ? 'walk' : 'col'}</span>
            <span style={styles.itemName}>{zone.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 240,
    background: '#0f172a',
    borderRight: '1px solid #1e293b',
    color: '#e2e8f0',
    overflowY: 'auto',
    fontSize: 12,
    flexShrink: 0,
  },
  header: {
    padding: '12px 12px 8px',
    borderBottom: '1px solid #1e293b',
  },
  headerTitle: { fontWeight: 600, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
  sceneName: { display: 'block', fontSize: 13, fontWeight: 500, marginTop: 4 },
  section: { padding: '8px 0' },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    padding: '4px 12px',
  },
  empty: { padding: '8px 12px', color: '#475569', fontSize: 11, fontStyle: 'italic' },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 12px',
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
    color: '#e2e8f0',
    width: '100%',
    textAlign: 'left',
    fontSize: 12,
  },
  itemSelected: { background: '#1e293b' },
  itemType: {
    fontSize: 9,
    padding: '1px 4px',
    borderRadius: 3,
    background: '#334155',
    color: '#94a3b8',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  itemName: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  hidden: { fontSize: 9, color: '#64748b' },
  locked: { fontSize: 9, color: '#f59e0b' },
  actions: { display: 'flex', gap: 4 },
  actionBtn: {
    padding: '2px 6px',
    borderRadius: 3,
    border: 'none',
    background: '#334155',
    color: '#94a3b8',
    fontSize: 10,
    cursor: 'pointer',
  },
};
