import React, { useState } from 'react';
import { useProjectStore } from '@/store';
import { getHierarchy } from '@/services/sceneGraph';

export const SceneHierarchy: React.FC = () => {
  const project = useProjectStore((s) => s.project);
  const activeSceneId = useProjectStore((s) => s.editor.activeSceneId);
  const selectedObjectId = useProjectStore((s) => s.editor.selectedObjectId);
  const selectObject = useProjectStore((s) => s.selectObject);
  const deleteObject = useProjectStore((s) => s.deleteObject);
  const duplicateObject = useProjectStore((s) => s.duplicateObject);
  const duplicateScene = useProjectStore((s) => s.duplicateScene);
  const setActiveScene = useProjectStore((s) => s.setActiveScene);
  const showHierarchy = useProjectStore((s) => s.editor.showHierarchy);

  const [renamingScene, setRenamingScene] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  if (!showHierarchy || !project || !activeSceneId) return null;

  const allScenes = Object.values(project.scenes);
  const scene = project.scenes[activeSceneId];
  if (!scene) return null;

  const hierarchy = getHierarchy(scene);
  const zoneList = Object.values(scene.zones);

  const handleDuplicateScene = () => {
    duplicateScene(activeSceneId);
  };

  const handleRenameStart = (sceneId: string, currentName: string) => {
    setRenamingScene(sceneId);
    setRenameValue(currentName);
  };

  const handleRenameFinish = () => {
    if (renamingScene && renameValue.trim()) {
      const store = useProjectStore.getState();
      store._pushUndo();
      useProjectStore.setState((state: any) => {
        const s = state.project?.scenes[renamingScene];
        if (s) s.name = renameValue.trim();
      });
    }
    setRenamingScene(null);
  };

  return (
    <div style={styles.panel}>
      {/* Scene selector - shown when multiple scenes exist */}
      <div style={styles.header}>
        <span style={styles.headerTitle}>Scene</span>
        {allScenes.length > 1 && (
          <span style={styles.sceneCount}>{allScenes.length} variants</span>
        )}
      </div>

      {/* Scene tabs */}
      {allScenes.length > 1 && (
        <div style={styles.sceneTabs}>
          {allScenes.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveScene(s.id)}
              onDoubleClick={() => handleRenameStart(s.id, s.name)}
              style={{
                ...styles.sceneTab,
                ...(s.id === activeSceneId ? styles.sceneTabActive : {}),
              }}
              title={`Switch to "${s.name}" (double-click to rename)`}
            >
              {renamingScene === s.id ? (
                <input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={handleRenameFinish}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRenameFinish(); }}
                  autoFocus
                  style={styles.renameInput}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span style={styles.sceneTabName}>{s.name}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Active scene name + duplicate */}
      <div style={styles.sceneHeader}>
        <span style={styles.sceneName}>{scene.name}</span>
        <button
          onClick={handleDuplicateScene}
          style={styles.dupSceneBtn}
          title="Duplicate scene as new variant"
        >
          + Variant
        </button>
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
    padding: '12px 12px 4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontWeight: 600, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
  sceneCount: { fontSize: 10, color: '#3b82f6', fontWeight: 500 },
  sceneTabs: {
    display: 'flex',
    gap: 2,
    padding: '4px 8px',
    overflowX: 'auto',
    borderBottom: '1px solid #1e293b',
  },
  sceneTab: {
    padding: '4px 8px',
    borderRadius: 4,
    border: '1px solid transparent',
    background: 'transparent',
    color: '#64748b',
    fontSize: 11,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  sceneTabActive: {
    background: '#1e293b',
    color: '#e2e8f0',
    borderColor: '#334155',
  },
  sceneTabName: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 80,
    display: 'inline-block',
  },
  renameInput: {
    width: 70,
    padding: '1px 4px',
    borderRadius: 3,
    border: '1px solid #3b82f6',
    background: '#1e293b',
    color: '#fff',
    fontSize: 11,
    outline: 'none',
  },
  sceneHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: '1px solid #1e293b',
  },
  sceneName: { fontSize: 13, fontWeight: 500 },
  dupSceneBtn: {
    padding: '3px 8px',
    borderRadius: 4,
    border: '1px solid #334155',
    background: '#1e293b',
    color: '#3b82f6',
    fontSize: 10,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
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
