/**
 * Editor Shell
 * Primary no-code workspace with template-first navigation.
 * Maps to PRD section 2.3 - Editor shell component.
 */

import React, { useState } from 'react';
import { useProjectStore } from '@/store';
import { Toolbar } from './Toolbar';
import { SceneHierarchy } from './SceneHierarchy';
import { PropertyInspector } from './PropertyInspector';
import { AssetTray } from './AssetTray';
import { AddPanel } from './AddPanel';
import { SceneViewport } from '@/components/viewer/SceneViewport';
import { XRViewer } from '@/components/viewer/XRViewer';

export const EditorShell: React.FC = () => {
  const viewMode = useProjectStore((s) => s.editor.viewMode);
  const [addOpen, setAddOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  if (viewMode === 'vr') {
    return (
      <div style={styles.fullscreen}>
        <Toolbar />
        <XRViewer />
      </div>
    );
  }

  return (
    <div style={styles.shell}>
      <Toolbar />
      <div style={styles.body}>
        {/* Left collapsible Add panel */}
        <div style={styles.leftSide}>
          <div
            onClick={() => setAddOpen(!addOpen)}
            style={{
              ...styles.leftTab,
              ...(addOpen ? styles.leftTabActive : {}),
            }}
          >
            <span style={styles.leftTabIcon}>+</span>
            <span style={styles.leftTabLabel}>Add</span>
          </div>
          {addOpen && (
            <div style={styles.leftPanel}>
              <AddPanel embedded onClose={() => setAddOpen(false)} />
            </div>
          )}
        </div>

        {/* Center: viewport + bottom library */}
        <div style={styles.center}>
          <div style={styles.viewport}>
            <SceneViewport />
          </div>

          {/* Bottom collapsible Library */}
          <button
            onClick={() => setLibraryOpen(!libraryOpen)}
            style={{
              ...styles.bottomTab,
              ...(libraryOpen ? styles.bottomTabActive : {}),
            }}
          >
            <span style={styles.bottomTabIcon}>{libraryOpen ? '\u25BC' : '\u25B2'}</span>
            <span style={styles.bottomTabLabel}>Library</span>
          </button>
          {libraryOpen && (
            <div style={styles.bottomPanel}>
              <AssetTray embedded />
            </div>
          )}
        </div>

        {/* Right panel: Hierarchy + Properties */}
        <div style={styles.rightPanel}>
          <SceneHierarchy />
          <PropertyInspector />
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  shell: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#0a0a1a',
    overflow: 'hidden',
  },
  body: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    minHeight: 0,
  },

  /* --- Left Add panel --- */
  leftSide: {
    display: 'flex',
    flexShrink: 0,
    height: '100%',
  },
  leftTab: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 12,
    gap: 4,
    width: 48,
    background: '#0f172a',
    border: 'none',
    borderRight: '1px solid #1e293b',
    color: '#94a3b8',
    cursor: 'pointer',
    userSelect: 'none' as const,
    transition: 'background 0.15s, color 0.15s',
  },
  leftTabActive: {
    background: '#1e293b',
    color: '#3b82f6',
  },
  leftTabIcon: {
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1,
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    background: 'rgba(59,130,246,0.1)',
  },
  leftTabLabel: {
    fontSize: 9,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    fontWeight: 600,
  },
  leftPanel: {
    width: 260,
    background: '#0f172a',
    borderRight: '1px solid #1e293b',
    overflowY: 'auto' as const,
    overflowX: 'hidden' as const,
    flexShrink: 0,
  },

  /* --- Center --- */
  center: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0,
    minHeight: 0,
  },
  viewport: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 0,
  },

  /* --- Bottom Library panel --- */
  bottomTab: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: '10px 16px',
    background: '#131a2e',
    border: 'none',
    borderTop: '2px solid #3b82f6',
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    width: '100%',
    flexShrink: 0,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  bottomTabActive: {
    background: '#1e293b',
    color: '#3b82f6',
    borderTop: '2px solid #3b82f6',
  },
  bottomTabIcon: {
    fontSize: 12,
  },
  bottomTabLabel: {
    fontSize: 12,
    letterSpacing: 1.5,
  },
  bottomPanel: {
    height: 280,
    background: '#0f172a',
    borderTop: '1px solid #1e293b',
    overflowY: 'auto' as const,
    flexShrink: 0,
  },

  /* --- Right panel --- */
  rightPanel: {
    width: 280,
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    background: '#0f172a',
    borderLeft: '1px solid #1e293b',
    overflow: 'hidden',
  },

  fullscreen: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#0a0a1a',
  },
};
