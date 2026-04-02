import React, { useState, useMemo } from 'react';
import { TEMPLATES, createFromTemplate } from '@/services/templateEngine';
import { useProjectStore } from '@/store';
import { getSavedProjects, loadSavedProjectById, deleteSavedProject } from '@/store/projectStore';
import type { TemplateType } from '@/types';

export const TemplatePicker: React.FC = () => {
  const [projectName, setProjectName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(null);
  const createNewProject = useProjectStore((s) => s.createNewProject);
  const loadProject = useProjectStore((s) => s.loadProject);
  const store = useProjectStore;
  const [refreshKey, setRefreshKey] = useState(0);

  const savedProjects = useMemo(() => getSavedProjects(), [refreshKey]);

  const handleCreate = () => {
    if (!selectedTemplate) return;
    const name = projectName.trim() || 'Untitled Project';
    const project = createFromTemplate(name, selectedTemplate);
    const sceneId = Object.keys(project.scenes)[0];
    createNewProject(name, selectedTemplate);
    store.setState({ project });
    store.getState().setActiveScene(sceneId);
  };

  const handleLoad = (id: string) => {
    const project = loadSavedProjectById(id);
    if (project) loadProject(project);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSavedProject(id);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div style={styles.container}>
      <div style={styles.inner}>
        <h1 style={styles.title}>Reach V2</h1>
        <p style={styles.subtitle}>WebXR Spatial Planning Platform</p>

        {/* Saved Projects */}
        {savedProjects.length > 0 && (
          <div style={{ marginBottom: 32, textAlign: 'left' as const }}>
            <h2 style={styles.sectionHeading}>Saved Projects</h2>
            <div style={styles.savedGrid}>
              {savedProjects.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => handleLoad(entry.id)}
                  style={styles.savedCard}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={styles.savedName}>{entry.name}</span>
                    <button
                      onClick={(e) => handleDelete(entry.id, e)}
                      style={styles.deleteBtn}
                      title="Delete"
                    >
                      &times;
                    </button>
                  </div>
                  <span style={styles.savedMeta}>
                    {entry.objectCount} objects &middot; {entry.templateType}
                  </span>
                  <span style={styles.savedDate}>
                    {new Date(entry.updatedAt).toLocaleDateString()} {new Date(entry.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* New Project */}
        <h2 style={styles.sectionHeading}>New Project</h2>

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
    alignItems: 'flex-start',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    color: '#fff',
    overflowY: 'auto',
  },
  inner: {
    maxWidth: 800,
    width: '100%',
    padding: '40px 40px 60px',
    textAlign: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    margin: '0 0 4px',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#94a3b8',
    margin: '0 0 32px',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 12,
    textAlign: 'left' as const,
  },
  savedGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 12,
  },
  savedCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
    padding: 14,
    borderRadius: 10,
    border: '2px solid #334155',
    background: '#1e293b',
    color: '#e2e8f0',
    cursor: 'pointer',
    textAlign: 'left' as const,
    fontSize: 13,
    transition: 'border-color 0.15s',
  },
  savedName: {
    fontWeight: 600,
    fontSize: 14,
  },
  savedMeta: {
    fontSize: 11,
    color: '#94a3b8',
  },
  savedDate: {
    fontSize: 10,
    color: '#64748b',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: 16,
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1,
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
