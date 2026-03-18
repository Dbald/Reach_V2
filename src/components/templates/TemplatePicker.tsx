import React, { useState } from 'react';
import { TEMPLATES, createFromTemplate } from '@/services/templateEngine';
import { useProjectStore } from '@/store';
import type { TemplateType } from '@/types';

export const TemplatePicker: React.FC = () => {
  const [projectName, setProjectName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(null);
  const createNewProject = useProjectStore((s) => s.createNewProject);
  const store = useProjectStore;

  const handleCreate = () => {
    if (!selectedTemplate) return;
    const name = projectName.trim() || 'Untitled Project';
    // Create from template and set in store
    const project = createFromTemplate(name, selectedTemplate);
    const sceneId = Object.keys(project.scenes)[0];
    // Use the store to initialize
    createNewProject(name, selectedTemplate);
    // Override with template-populated project data
    store.setState({ project });
    store.getState().setActiveScene(sceneId);
  };

  return (
    <div style={styles.container}>
      <div style={styles.inner}>
        <h1 style={styles.title}>Start a new project</h1>
        <p style={styles.subtitle}>Choose a template to get started, or begin with a blank scene.</p>

        <input
          type="text"
          placeholder="Project name (optional)"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          style={styles.input}
        />

        <div style={styles.grid}>
          {TEMPLATES.map((t) => (
            <button
              key={t.type}
              onClick={() => setSelectedTemplate(t.type)}
              style={{
                ...styles.card,
                ...(selectedTemplate === t.type ? styles.cardSelected : {}),
              }}
            >
              <span style={styles.icon}>{t.icon}</span>
              <span style={styles.cardName}>{t.name}</span>
              <span style={styles.cardDesc}>{t.description}</span>
              <div style={styles.tags}>
                {t.tags.map((tag) => (
                  <span key={tag} style={styles.tag}>{tag}</span>
                ))}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleCreate}
          disabled={!selectedTemplate}
          style={{
            ...styles.createBtn,
            ...(selectedTemplate ? {} : styles.createBtnDisabled),
          }}
        >
          Create Project
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    color: '#fff',
  },
  inner: {
    maxWidth: 800,
    width: '100%',
    padding: 40,
    textAlign: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    margin: '0 0 8px',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#94a3b8',
    margin: '0 0 24px',
  },
  input: {
    width: '100%',
    maxWidth: 400,
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #334155',
    background: '#1e293b',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    marginBottom: 24,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 16,
    marginBottom: 32,
    textAlign: 'left',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: 16,
    borderRadius: 12,
    border: '2px solid #334155',
    background: '#1e293b',
    color: '#e2e8f0',
    cursor: 'pointer',
    transition: 'border-color 0.15s, transform 0.1s',
    fontSize: 13,
  },
  cardSelected: {
    borderColor: '#3b82f6',
    background: '#1e3a5f',
    transform: 'scale(1.02)',
  },
  icon: {
    fontSize: 28,
    marginBottom: 4,
  },
  cardName: {
    fontWeight: 600,
    fontSize: 15,
  },
  cardDesc: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 1.4,
  },
  tags: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
    marginTop: 6,
  },
  tag: {
    fontSize: 10,
    padding: '2px 6px',
    borderRadius: 4,
    background: '#334155',
    color: '#94a3b8',
  },
  createBtn: {
    padding: '12px 32px',
    borderRadius: 8,
    border: 'none',
    background: '#3b82f6',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  createBtnDisabled: {
    background: '#334155',
    color: '#64748b',
    cursor: 'not-allowed',
  },
};
