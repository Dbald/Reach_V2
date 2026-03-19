/**
 * Editor Shell
 * Primary no-code workspace with template-first navigation.
 * Maps to PRD section 2.3 - Editor shell component.
 */

import React from 'react';
import { useProjectStore } from '@/store';
import { Toolbar } from './Toolbar';
import { SceneHierarchy } from './SceneHierarchy';
import { PropertyInspector } from './PropertyInspector';
import { AssetTray } from './AssetTray';
import { PublishPanel } from './PublishPanel';
import { AddPanel } from './AddPanel';
import { SceneViewport } from '@/components/viewer/SceneViewport';
import { XRViewer } from '@/components/viewer/XRViewer';

export const EditorShell: React.FC = () => {
  const viewMode = useProjectStore((s) => s.editor.viewMode);

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
      <AddPanel />
      <div style={styles.body}>
        <SceneHierarchy />
        <div style={styles.center}>
          <SceneViewport />
          <AssetTray />
        </div>
        <PropertyInspector />
        <PublishPanel />
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
  },
  center: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
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
