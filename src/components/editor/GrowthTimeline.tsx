import React, { useMemo } from 'react';
import { useProjectStore } from '@/store';

/**
 * GrowthTimeline — floating bottom bar that lets users toggle between
 * growth years (1, 3, 5, 10) for all staged assets in the scene.
 * Only visible when the scene contains objects with growthStages.
 */
export const GrowthTimeline: React.FC = () => {
  const activeSceneId = useProjectStore((s) => s.editor.activeSceneId);
  const activeGrowthYear = useProjectStore((s) => s.editor.activeGrowthYear);
  const setActiveGrowthYear = useProjectStore((s) => s.setActiveGrowthYear);
  // Subscribe directly to the scene objects so we re-render when objects are added/removed
  const sceneObjects = useProjectStore((s) => {
    if (!s.project || !s.editor.activeSceneId) return null;
    return s.project.scenes[s.editor.activeSceneId]?.objects ?? null;
  });

  // Collect all unique years from growth-staged objects in the scene
  const availableYears = useMemo(() => {
    if (!sceneObjects) return [];
    const yearSet = new Set<number>();
    for (const obj of Object.values(sceneObjects)) {
      if (obj.growthStages && obj.growthStages.length > 0) {
        for (const stage of obj.growthStages) {
          yearSet.add(stage.year);
        }
      }
    }
    return Array.from(yearSet).sort((a, b) => a - b);
  }, [sceneObjects]);

  // Don't render if no staged objects exist
  if (availableYears.length === 0) return null;

  const isActive = activeGrowthYear !== null;

  return (
    <div style={styles.container}>
      <div style={styles.bar}>
        <div style={styles.label}>Growth Timeline</div>
        <div style={styles.buttons}>
          {availableYears.map((year) => {
            const selected = activeGrowthYear === year;
            return (
              <button
                key={year}
                onClick={() => setActiveGrowthYear(selected ? null : year)}
                style={{
                  ...styles.yearBtn,
                  ...(selected ? styles.yearBtnActive : {}),
                }}
              >
                {year} {year === 1 ? 'Year' : 'Years'}
              </button>
            );
          })}
        </div>
        {isActive && (
          <button
            onClick={() => setActiveGrowthYear(null)}
            style={styles.resetBtn}
          >
            Reset
          </button>
        )}
      </div>
      {isActive && (
        <div style={styles.stageLabel}>
          Viewing: {activeGrowthYear} {activeGrowthYear === 1 ? 'Year' : 'Years'} Growth
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 6,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    pointerEvents: 'auto',
  },
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 8px',
    background: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 6,
    border: '1px solid #334155',
    backdropFilter: 'blur(8px)',
  },
  label: {
    fontSize: 9,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginRight: 2,
    whiteSpace: 'nowrap' as const,
  },
  buttons: {
    display: 'flex',
    gap: 2,
  },
  yearBtn: {
    padding: '2px 8px',
    borderRadius: 4,
    border: '1px solid #334155',
    background: 'rgba(30, 41, 59, 0.8)',
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  yearBtnActive: {
    background: '#22c55e',
    borderColor: '#22c55e',
    color: '#fff',
    fontWeight: 700,
  },
  resetBtn: {
    padding: '2px 6px',
    borderRadius: 4,
    border: '1px solid #475569',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: 9,
    cursor: 'pointer',
  },
  stageLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: '#22c55e',
    background: 'rgba(15, 23, 42, 0.85)',
    padding: '2px 8px',
    borderRadius: 4,
    border: '1px solid rgba(34, 197, 94, 0.3)',
  },
};
