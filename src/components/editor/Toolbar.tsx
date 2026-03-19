import React, { useEffect, useState, useCallback } from 'react';
import { useProjectStore } from '@/store';
import { validateScene, getReadinessBand, hasBlockers } from '@/services/validation';
import { publishProject } from '@/services/publish';
import { StatusBadge } from '@/components/shared/StatusBadge';

const tools = [
  { id: 'select' as const, label: 'Select', shortcut: 'V' },
  { id: 'place' as const, label: 'Add', shortcut: 'P' },
] as const;

const shortcutMap: Record<string, 'select' | 'move' | 'rotate' | 'scale' | 'place'> = {
  v: 'select',
  g: 'move',
  r: 'rotate',
  s: 'scale',
  p: 'place',
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
  const [showPublish, setShowPublish] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) { redo(); } else { undo(); }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const tool = shortcutMap[e.key.toLowerCase()];
      if (tool) { e.preventDefault(); setActiveTool(tool); }
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
        <div style={styles.divider} />
        <button
          onClick={() => setShowPublish(!showPublish)}
          style={{
            ...styles.publishBtn,
            ...(showPublish ? styles.publishBtnOpen : {}),
          }}
        >
          Publish
        </button>
      </div>

      {showPublish && <PublishDropdown onClose={() => setShowPublish(false)} />}
    </div>
  );
};

const PublishDropdown: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const project = useProjectStore((s) => s.project);
  const activeSceneId = useProjectStore((s) => s.editor.activeSceneId);
  const validationReport = useProjectStore((s) => s.validationReport);
  const setValidationReport = useProjectStore((s) => s.setValidationReport);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ success: boolean; url?: string; error?: string } | null>(null);

  const handleValidate = useCallback(() => {
    if (!project || !activeSceneId) return;
    const report = validateScene(project, activeSceneId);
    setValidationReport(report);
  }, [project, activeSceneId, setValidationReport]);

  const handlePublish = useCallback(async () => {
    if (!project) return;
    setPublishing(true);
    setPublishResult(null);
    try {
      const result = await publishProject(project);
      setValidationReport(result.report);
      setPublishResult({ success: result.success, url: result.shareUrl, error: result.error });
    } finally {
      setPublishing(false);
    }
  }, [project, setValidationReport]);

  if (!project) return null;

  const report = validationReport;
  const band = report ? getReadinessBand(report.score) : null;
  const blocked = report ? hasBlockers(report) : false;

  return (
    <div style={pubStyles.dropdown}>
      <div style={pubStyles.header}>
        <span style={pubStyles.title}>Publish</span>
        <button style={pubStyles.closeBtn} onClick={onClose}>&times;</button>
      </div>
      <div style={pubStyles.body}>
        <div style={pubStyles.actions}>
          <button onClick={handleValidate} style={pubStyles.validateBtn}>
            Run Preflight
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing || blocked}
            style={{
              ...pubStyles.pubBtn,
              ...(publishing || blocked ? pubStyles.pubBtnDisabled : {}),
            }}
          >
            {publishing ? 'Publishing...' : 'Publish'}
          </button>
        </div>

        {report && (
          <div style={pubStyles.report}>
            <div style={pubStyles.scoreRow}>
              <span style={pubStyles.scoreLabel}>Readiness</span>
              <span style={{
                ...pubStyles.score,
                color: band === 'ready' ? '#22c55e' : band === 'needs-fixes' ? '#f59e0b' : '#ef4444',
              }}>
                {report.score}/100
              </span>
              <StatusBadge
                label={band === 'ready' ? 'Ready' : band === 'needs-fixes' ? 'Needs Fixes' : 'Not Ready'}
                type="severity"
                value={band === 'ready' ? 'suggestion' : band === 'needs-fixes' ? 'warning' : 'blocker'}
              />
            </div>
            {report.messages.length > 0 && (
              <div style={pubStyles.messages}>
                {report.messages.map((msg) => (
                  <div key={msg.id} style={pubStyles.message}>
                    <StatusBadge label={msg.severity} type="severity" value={msg.severity} />
                    <div>
                      <div>{msg.message}</div>
                      {msg.fix && <div style={pubStyles.fix}>{msg.fix}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {publishResult && (
          <div style={{
            ...pubStyles.result,
            borderColor: publishResult.success ? '#22c55e' : '#ef4444',
          }}>
            {publishResult.success ? (
              <>
                <span style={{ color: '#22c55e', fontWeight: 600 }}>Published!</span>
                {publishResult.url && <div style={pubStyles.url}>{publishResult.url}</div>}
              </>
            ) : (
              <span style={{ color: '#ef4444' }}>{publishResult.error}</span>
            )}
          </div>
        )}
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
    position: 'relative',
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
  right: { display: 'flex', gap: 4, alignItems: 'center' },
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
  publishBtn: {
    padding: '6px 16px',
    borderRadius: 6,
    border: 'none',
    background: '#22c55e',
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  publishBtnOpen: {
    background: '#16a34a',
  },
};

const pubStyles: Record<string, React.CSSProperties> = {
  dropdown: {
    position: 'absolute',
    top: 48,
    right: 16,
    width: 340,
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 10,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    zIndex: 200,
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
  body: { padding: 12 },
  actions: { display: 'flex', gap: 8, marginBottom: 12 },
  validateBtn: {
    flex: 1,
    padding: '8px',
    borderRadius: 6,
    border: '1px solid #334155',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: 12,
    cursor: 'pointer',
  },
  pubBtn: {
    flex: 1,
    padding: '8px',
    borderRadius: 6,
    border: 'none',
    background: '#22c55e',
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  pubBtnDisabled: {
    background: '#334155',
    color: '#64748b',
    cursor: 'not-allowed',
  },
  report: { marginBottom: 12 },
  scoreRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  scoreLabel: { fontSize: 11, color: '#94a3b8' },
  score: { fontSize: 20, fontWeight: 700 },
  messages: { display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' },
  message: { display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.4 },
  fix: { fontSize: 10, color: '#94a3b8', fontStyle: 'italic', marginTop: 2 },
  result: {
    padding: 12,
    borderRadius: 8,
    border: '1px solid',
    fontSize: 12,
  },
  url: {
    marginTop: 4,
    padding: '6px 8px',
    borderRadius: 4,
    background: '#1e293b',
    fontSize: 11,
    wordBreak: 'break-all',
  },
};
