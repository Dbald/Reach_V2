import React, { useState, useCallback } from 'react';
import { useProjectStore } from '@/store';
import { validateScene, getReadinessBand, hasBlockers } from '@/services/validation';
import { publishProject } from '@/services/publish';
import { StatusBadge } from '@/components/shared/StatusBadge';

export const PublishPanel: React.FC = () => {
  const project = useProjectStore((s) => s.project);
  const activeSceneId = useProjectStore((s) => s.editor.activeSceneId);
  const validationReport = useProjectStore((s) => s.validationReport);
  const setValidationReport = useProjectStore((s) => s.setValidationReport);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ success: boolean; url?: string; error?: string } | null>(null);
  const [copied, setCopied] = useState(false);

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
      setPublishResult({
        success: result.success,
        url: result.shareUrl,
        error: result.error,
      });
    } finally {
      setPublishing(false);
    }
  }, [project, setValidationReport]);

  if (!project) return null;

  const report = validationReport;
  const band = report ? getReadinessBand(report.score) : null;
  const blocked = report ? hasBlockers(report) : false;

  return (
    <div style={styles.panel}>
      <div style={styles.header}>Publish</div>

      <div style={styles.body}>
        <div style={styles.actions}>
          <button onClick={handleValidate} style={styles.validateBtn}>
            Run Preflight Check
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing || blocked}
            style={{
              ...styles.publishBtn,
              ...(publishing || blocked ? styles.publishBtnDisabled : {}),
            }}
          >
            {publishing ? 'Publishing...' : 'Publish'}
          </button>
        </div>

        {report && (
          <div style={styles.report}>
            <div style={styles.scoreRow}>
              <span style={styles.scoreLabel}>Readiness Score</span>
              <span
                style={{
                  ...styles.score,
                  color: band === 'ready' ? '#22c55e' : band === 'needs-fixes' ? '#f59e0b' : '#ef4444',
                }}
              >
                {report.score}/100
              </span>
              <StatusBadge
                label={band === 'ready' ? 'Ready' : band === 'needs-fixes' ? 'Needs Fixes' : 'Not Ready'}
                type="severity"
                value={band === 'ready' ? 'suggestion' : band === 'needs-fixes' ? 'warning' : 'blocker'}
              />
            </div>

            {report.passedRules.length > 0 && (
              <div style={styles.passed}>
                Passed: {report.passedRules.join(', ')}
              </div>
            )}

            {report.messages.length > 0 && (
              <div style={styles.messages}>
                {report.messages.map((msg) => (
                  <div key={msg.id} style={styles.message}>
                    <StatusBadge label={msg.severity} type="severity" value={msg.severity} />
                    <div>
                      <div>{msg.message}</div>
                      {msg.fix && <div style={styles.fix}>{msg.fix}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {publishResult && (
          <div style={{
            ...styles.result,
            borderColor: publishResult.success ? '#22c55e' : '#ef4444',
          }}>
            {publishResult.success ? (
              <>
                <span style={{ color: '#22c55e', fontWeight: 600 }}>Published successfully!</span>
                {publishResult.url && (
                  <div style={{ marginTop: 4 }}>
                    <a href={publishResult.url} target="_blank" rel="noopener noreferrer" style={styles.url}>
                      Open scene link
                    </a>
                    <button
                      style={styles.copyBtn}
                      onClick={() => {
                        navigator.clipboard.writeText(publishResult.url!);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                    >
                      {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                  </div>
                )}
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
  panel: {
    width: 320,
    background: '#0f172a',
    borderLeft: '1px solid #1e293b',
    color: '#e2e8f0',
    overflowY: 'auto',
    fontSize: 12,
  },
  header: {
    padding: '12px',
    fontWeight: 600,
    fontSize: 11,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderBottom: '1px solid #1e293b',
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
  publishBtn: {
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
  publishBtnDisabled: {
    background: '#334155',
    color: '#64748b',
    cursor: 'not-allowed',
  },
  report: { marginBottom: 12 },
  scoreRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  scoreLabel: { fontSize: 11, color: '#94a3b8' },
  score: { fontSize: 20, fontWeight: 700 },
  passed: { fontSize: 10, color: '#22c55e', marginBottom: 8 },
  messages: { display: 'flex', flexDirection: 'column', gap: 8 },
  message: { display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.4 },
  fix: { fontSize: 10, color: '#94a3b8', fontStyle: 'italic', marginTop: 2 },
  result: {
    padding: 12,
    borderRadius: 8,
    border: '1px solid',
    fontSize: 12,
  },
  url: {
    display: 'inline-block',
    padding: '6px 10px',
    borderRadius: 4,
    background: '#1e293b',
    fontSize: 11,
    color: '#38bdf8',
    textDecoration: 'none',
    marginRight: 6,
  },
  copyBtn: {
    padding: '6px 10px',
    borderRadius: 4,
    border: '1px solid #334155',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: 11,
    cursor: 'pointer',
  },
};
