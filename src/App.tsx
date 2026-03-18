import React from 'react';
import { useProjectStore } from '@/store';
import { TemplatePicker } from '@/components/templates/TemplatePicker';
import { EditorShell } from '@/components/editor/EditorShell';

const App: React.FC = () => {
  const project = useProjectStore((s) => s.project);

  if (!project) {
    return <TemplatePicker />;
  }

  return <EditorShell />;
};

export default App;
