import React, { useEffect, useRef } from 'react';
import { useProjectStore } from '@/store';

export const ContextMenu: React.FC = () => {
  const contextMenu = useProjectStore((s) => s.editor.contextMenu);
  const closeContextMenu = useProjectStore((s) => s.closeContextMenu);
  const activeSceneId = useProjectStore((s) => s.editor.activeSceneId);
  const selectedObjectIds = useProjectStore((s) => s.editor.selectedObjectIds);
  const project = useProjectStore((s) => s.project);
  const deleteObject = useProjectStore((s) => s.deleteObject);
  const duplicateObject = useProjectStore((s) => s.duplicateObject);
  const deleteSelected = useProjectStore((s) => s.deleteSelected);
  const duplicateSelected = useProjectStore((s) => s.duplicateSelected);
  const updateObject = useProjectStore((s) => s.updateObject);
  const selectObject = useProjectStore((s) => s.selectObject);
  const focusOnSelected = useProjectStore((s) => s.focusOnSelected);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!contextMenu.visible) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeContextMenu();
    };
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [contextMenu.visible, closeContextMenu]);

  if (!contextMenu.visible || !contextMenu.objectId || !activeSceneId || !project) return null;

  const scene = project.scenes[activeSceneId];
  if (!scene) return null;

  const obj = scene.objects[contextMenu.objectId];
  if (!obj) return null;

  const isMulti = selectedObjectIds.length > 1;

  const actions: { label: string; icon: string; action: () => void; danger?: boolean; separator?: boolean }[] = [];

  if (isMulti) {
    actions.push(
      { label: `Duplicate ${selectedObjectIds.length} Objects`, icon: '\u2398', action: () => { duplicateSelected(activeSceneId); closeContextMenu(); } },
      { label: `Delete ${selectedObjectIds.length} Objects`, icon: '\u2716', action: () => { deleteSelected(activeSceneId); closeContextMenu(); }, danger: true },
    );
  } else {
    actions.push(
      { label: 'Focus', icon: '\u25CE', action: () => { selectObject(obj.id); focusOnSelected(); closeContextMenu(); } },
      { label: 'Duplicate', icon: '\u2398', action: () => { duplicateObject(activeSceneId, obj.id); closeContextMenu(); } },
      { label: obj.visible ? 'Hide' : 'Show', icon: obj.visible ? '\u25C9' : '\u25CB', action: () => { updateObject(activeSceneId, obj.id, { visible: !obj.visible }); closeContextMenu(); } },
      { label: obj.locked ? 'Unlock' : 'Lock', icon: obj.locked ? '\u{1F513}' : '\u{1F512}', action: () => { updateObject(activeSceneId, obj.id, { locked: !obj.locked }); closeContextMenu(); } },
      { label: 'Delete', icon: '\u2716', action: () => { deleteObject(activeSceneId, obj.id); closeContextMenu(); }, danger: true, separator: true },
    );
  }

  // Keep menu within viewport bounds
  const menuWidth = 180;
  const menuHeight = actions.length * 32 + 40;
  const x = Math.min(contextMenu.x, window.innerWidth - menuWidth - 8);
  const y = Math.min(contextMenu.y, window.innerHeight - menuHeight - 8);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        width: menuWidth,
        background: '#0f172a',
        border: '1px solid #334155',
        borderRadius: 8,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        zIndex: 1000,
        overflow: 'hidden',
        fontSize: 12,
        color: '#e2e8f0',
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header */}
      <div style={{
        padding: '6px 12px',
        borderBottom: '1px solid #1e293b',
        fontSize: 10,
        color: '#64748b',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {isMulti ? `${selectedObjectIds.length} Objects` : obj.name}
      </div>

      {/* Actions */}
      {actions.map((item, i) => (
        <React.Fragment key={i}>
          {item.separator && <div style={{ height: 1, background: '#1e293b', margin: '2px 0' }} />}
          <button
            onClick={item.action}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '7px 12px',
              border: 'none',
              background: 'transparent',
              color: item.danger ? '#ef4444' : '#e2e8f0',
              fontSize: 12,
              cursor: 'pointer',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.background = '#1e293b'; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'transparent'; }}
          >
            <span style={{ width: 16, textAlign: 'center', fontSize: 13 }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};
