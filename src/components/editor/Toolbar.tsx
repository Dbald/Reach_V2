import React, { useEffect } from 'react';
import { useProjectStore } from '@/store';

const tools = [
  { id: 'select' as const, label: 'Select', shortcut: 'V' },
  { id: 'move' as const, label: 'Move', shortcut: 'G' },
  { id: 'rotate' as const, label: 'Rotate', shortcut: 'R' },
  { id: 'scale' as const, label: 'Scale', shortcut: 'S' },
  { id: 'place' as const, label: 'Add', shortcut: 'P' },
  { id: 'zone' as const, label: 'Zone', shortcut: 'Z' },
] as const;

const shortcutMap: Record<string, typeof tools[number]['id']> = {
  v: 'select',
  g: 'move',
  r: 'rotate',
  s: 'scale',
  p: 'place',
  z: 'zone',
};

export const Toolbar: React.FC = () => {
  const activeTool = useProjectStore((s) => s.editor.activeTool);
  const setActiveTool = useProjectStore((s) => s.setActiveTool);
  const viewMode = useProjectStore((s) => s.editor.viewMode);
  const setViewMode = useProjectStore((s) => s.setViewMode);
  const projectName = useProjectStore((s) => s.project?.name ?? 'Untitled');
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const undoAvailable = useProjectStore((s) => s._undoStack.length > 0);
  const redoAvailable = useProjectStore((s) => s._redoStack.length > 0);

  // Keyboard shortcuts for tool switching + undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z / Ctrl+Shift+Z for undo/redo (works even in inputs)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }
      // Ctrl+Y alternative redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      // Ignore tool shortcuts when typing in inputs
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const tool = shortcutMap[e.key.toLowerCase()];
      if (tool) {
        e.preventDefault();
        setActiveTool(tool);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTool, undo, redo]);

  return (
    <div style={styles.bar}>
      <div style={styles.left}>
        <span style={styles.logo}>Reach</span>
        <span style={styles.projectName}>{projectName}</span>
      </div>

      <div style={styles.center}>
        <button
          onClick={undo}
          disabled={!undoAvailable}
          title="Undo (Ctrl+Z)"
          style={{ ...styles.toolBtn, ...(undoAvailable ? {} : styles.toolBtnDisabled) }}
        >
          Undo
        </button>
        <button
          onClick={redo}
          disabled={!redoAvailable}
          title="Redo (Ctrl+Shift+Z)"
          style={{ ...styles.toolBtn, ...(redoAvailable ? {} : styles.toolBtnDisabled) }}
        >
          Redo
        </button>
        <div style={styles.divider} />
        {tools.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTool(t.id)}
            title={`${t.label} (${t.shortcut})`}
            style={{
              ...styles.toolBtn,
              ...(activeTool === t.id ? styles.toolBtnActive : {}),
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={styles.right}>
        {(['editor', 'preview', 'vr'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            style={{
              ...styles.modeBtn,
              ...(viewMode === mode ? styles.modeBtnActive : {}),
            }}
          >
            {mode === 'vr' ? 'VR' : mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    padding: '0 16px',
    background: '#0f172a',
    borderBottom: '1px solid #1e293b',
    color: '#e2e8f0',
    flexShrink: 0,
  },
  left: { display: 'flex', alignItems: 'center', gap: 12 },
  logo: { fontWeight: 700, fontSize: 16, color: '#3b82f6' },
  projectName: { fontSize: 13, color: '#94a3b8' },
  center: { display: 'flex', gap: 2, alignItems: 'center' },
  divider: { width: 1, height: 24, background: '#334155', margin: '0 6px' },
  toolBtnDisabled: { opacity: 0.35, cursor: 'default' },
  toolBtn: {
    padding: '6px 12px',
    borderRadius: 6,
    border: 'none',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
  },
  toolBtnActive: {
    background: '#1e293b',
    color: '#fff',
  },
  right: { display: 'flex', gap: 4 },
  modeBtn: {
    padding: '6px 14px',
    borderRadius: 6,
    border: '1px solid #334155',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: 12,
    cursor: 'pointer',
  },
  modeBtnActive: {
    background: '#3b82f6',
    borderColor: '#3b82f6',
    color: '#fff',
  },
};
