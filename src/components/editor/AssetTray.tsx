import React, { useCallback } from 'react';
import { useProjectStore } from '@/store';
import {
  validateFile,
  detectFormat,
  createAssetFromFile,
  processAsset,
  getAcceptedExtensions,
  getAcceptedFormatsDescription,
} from '@/services/assetPipeline';
import { StatusBadge } from '@/components/shared/StatusBadge';

export const AssetTray: React.FC = () => {
  const project = useProjectStore((s) => s.project);
  const showAssetTray = useProjectStore((s) => s.editor.showAssetTray);
  const addAsset = useProjectStore((s) => s.addAsset);
  const updateAsset = useProjectStore((s) => s.updateAsset);
  const activeSceneId = useProjectStore((s) => s.editor.activeSceneId);
  const addObject = useProjectStore((s) => s.addObject);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      for (const file of Array.from(files)) {
        const format = detectFormat(file.name);
        if (!format) {
          // Unsupported format — skip, don't create a broken asset
          continue;
        }

        const asset = createAssetFromFile(file);
        addAsset(asset);

        if (asset.status !== 'error') {
          const processed = await processAsset(asset);
          updateAsset(asset.id, processed);
        }
      }

      e.target.value = '';
    },
    [addAsset, updateAsset]
  );

  const handlePlaceAsset = (assetId: string, assetName: string) => {
    if (!activeSceneId) return;
    addObject(activeSceneId, 'mesh', {
      name: assetName,
      assetId,
      tags: ['imported'],
    });
  };

  if (!showAssetTray || !project) return null;

  const assets = Object.values(project.assets);

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>Assets</span>
      </div>

      <div style={styles.uploadArea}>
        <label style={styles.uploadLabel}>
          <input
            type="file"
            multiple
            accept={getAcceptedExtensions().join(',')}
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <span style={styles.uploadText}>Drop files or click to upload</span>
          <span style={styles.formatHint}>
            Accepted: {getAcceptedFormatsDescription()}
          </span>
        </label>
      </div>

      <div style={styles.list}>
        {assets.length === 0 && (
          <div style={styles.empty}>
            No assets imported yet. Upload 3D models (GLB recommended) or images to get started.
          </div>
        )}
        {assets.map((asset) => (
          <div key={asset.id} style={styles.assetItem}>
            <div style={styles.assetInfo}>
              <span style={styles.assetName}>{asset.name}</span>
              <span style={styles.assetMeta}>
                {(asset.format || 'unknown').toUpperCase()} - {(asset.fileSizeBytes / 1024 / 1024).toFixed(1)}MB
              </span>
              <StatusBadge label={asset.status} type="status" value={asset.status} />
            </div>
            {asset.status === 'ready' && (
              <button
                style={styles.placeBtn}
                onClick={() => handlePlaceAsset(asset.id, asset.name)}
              >
                Place
              </button>
            )}
            {asset.validationErrors.length > 0 && (
              <div style={styles.errors}>
                {asset.validationErrors.map((err) => (
                  <div key={err.id} style={styles.errorMsg}>
                    <StatusBadge label={err.severity} type="severity" value={err.severity} />
                    <span>{err.message}</span>
                    {err.fix && <span style={styles.fix}>{err.fix}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    height: 200,
    background: '#0f172a',
    borderTop: '1px solid #1e293b',
    color: '#e2e8f0',
    overflowY: 'auto',
    fontSize: 12,
    flexShrink: 0,
  },
  header: {
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #1e293b',
  },
  title: { fontWeight: 600, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
  uploadArea: {
    padding: '8px 12px',
    borderBottom: '1px solid #1e293b',
  },
  uploadLabel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '12px',
    border: '2px dashed #334155',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'center',
  },
  uploadText: { fontSize: 12, color: '#94a3b8' },
  formatHint: { fontSize: 10, color: '#475569', lineHeight: 1.4 },
  list: { padding: '8px 0' },
  empty: { padding: '12px', color: '#475569', fontStyle: 'italic', fontSize: 11 },
  assetItem: {
    padding: '8px 12px',
    borderBottom: '1px solid #1e293b',
  },
  assetInfo: { display: 'flex', alignItems: 'center', gap: 8 },
  assetName: { fontWeight: 500 },
  assetMeta: { fontSize: 10, color: '#64748b' },
  placeBtn: {
    marginTop: 4,
    padding: '4px 12px',
    borderRadius: 4,
    border: 'none',
    background: '#3b82f6',
    color: '#fff',
    fontSize: 11,
    cursor: 'pointer',
  },
  errors: { marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 },
  errorMsg: { display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11, lineHeight: 1.4 },
  fix: { display: 'block', fontSize: 10, color: '#94a3b8', fontStyle: 'italic' },
};
