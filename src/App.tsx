import React from 'react';
import { useProjectStore } from '@/store';
import { TemplatePicker } from '@/components/templates/TemplatePicker';
import { EditorShell } from '@/components/editor/EditorShell';
import { SceneViewer } from '@/components/viewer/SceneViewer';

const isViewerMode = window.location.hash.includes('scene=');

const App: React.FC = () => {
  const project = useProjectStore((s) => s.project);

  // Published scene viewer — standalone, no editor
  if (isViewerMode) {
    return <SceneViewer />;
  }

  if (!project) {
    return <TemplatePicker />;
  }

  return <EditorShell />;
};

export default App;
