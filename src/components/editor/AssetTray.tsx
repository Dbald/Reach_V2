import React, { useCallback, useState } from 'react';
import { useProjectStore } from '@/store';
import {
  detectFormat,
  createAssetFromFile,
  processAsset,
  getAcceptedExtensions,
  getAcceptedFormatsDescription,
} from '@/services/assetPipeline';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CATALOG_CATEGORIES, getCatalogByCategory } from '@/config/assetCatalog';
import type { AssetCategory, CatalogItem } from '@/config/assetCatalog';
import { searchSketchfab, downloadSketchfabModel, getSketchfabToken, setSketchfabToken, SKETCHFAB_SUGGESTIONS } from '@/services/sketchfab';
import type { SketchfabModel } from '@/services/sketchfab';

interface AssetTrayProps {
  embedded?: boolean;
}

export const AssetTray: React.FC<AssetTrayProps> = ({ embedded }) => {
  const project = useProjectStore((s) => s.project);
  const addAsset = useProjectStore((s) => s.addAsset);
  const updateAsset = useProjectStore((s) => s.updateAsset);
  const activeSceneId = useProjectStore((s) => s.editor.activeSceneId);
  const addObject = useProjectStore((s) => s.addObject);
  const selectObject = useProjectStore((s) => s.selectObject);

  const [tab, setTab] = useState<'uploads' | 'catalog' | 'sketchfab'>('uploads');

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      for (const file of Array.from(files)) {
        const format = detectFormat(file.name);
        if (!format) continue;
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
    const id = addObject(activeSceneId, 'mesh', {
      name: assetName,
      assetId,
      tags: ['imported'],
    });
    selectObject(id);
  };

  if (!project) return null;

  const assets = Object.values(project.assets);
  const containerStyle = embedded ? styles.embedded : styles.panel;

  return (
    <div style={containerStyle}>
      {/* Tab bar */}
      <div style={styles.tabBar}>
        {(['uploads', 'catalog', 'sketchfab'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              ...styles.tabBtn,
              ...(tab === t ? styles.tabBtnActive : {}),
            }}
          >
            {t === 'uploads' ? 'Uploads' : t === 'catalog' ? 'Catalog' : 'Sketchfab'}
          </button>
        ))}
      </div>

      {/* Uploads tab */}
      {tab === 'uploads' && (
        <div style={styles.tabContent}>
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
              <div style={styles.empty}>No assets imported yet.</div>
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
                  <button style={styles.placeBtn} onClick={() => handlePlaceAsset(asset.id, asset.name)}>
                    Place
                  </button>
                )}
                {asset.validationErrors.length > 0 && (
                  <div style={styles.errors}>
                    {asset.validationErrors.map((err) => (
                      <div key={err.id} style={styles.errorMsg}>
                        <StatusBadge label={err.severity} type="severity" value={err.severity} />
                        <span>{err.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Catalog tab */}
      {tab === 'catalog' && (
        <CatalogTab />
      )}

      {/* Sketchfab tab */}
      {tab === 'sketchfab' && (
        <SketchfabTab />
      )}
    </div>
  );
};

/* ---------- Catalog Tab ---------- */

const CatalogTab: React.FC = () => {
  const activeSceneId = useProjectStore((s) => s.editor.activeSceneId);
  const addObject = useProjectStore((s) => s.addObject);
  const selectObject = useProjectStore((s) => s.selectObject);
  const [activeCategory, setActiveCategory] = useState<AssetCategory | null>(null);

  const handlePlaceItem = (item: CatalogItem) => {
    if (!activeSceneId || !item.primitive) return;
    const p = item.primitive;
    const isCurvePath = item.id === 'curve-path';
    const id = addObject(activeSceneId, 'mesh', {
      name: item.name,
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: p.scale[0], y: p.scale[1], z: p.scale[2] },
      },
      material: {
        color: hexToColor(p.color),
        roughness: 0.7,
        metalness: 0,
      },
      tags: item.tags,
      metadata: {
        shape: p.shape,
        catalogId: item.id,
        ...(item.groundMaterial ? { groundMaterial: item.groundMaterial, tileRepeat: 4 } : {}),
        ...(isCurvePath ? { isCurvePath: true, curvePoints: [
          { x: 0, y: 0, z: -2 },
          { x: 1.5, y: 0, z: -0.5 },
          { x: 1.5, y: 0, z: 0.5 },
          { x: 0, y: 0, z: 2 },
        ], curveWidth: 1.2 } : {}),
      },
      ...(item.growthStages ? { growthStages: item.growthStages, activeStageIndex: 0 } : {}),
    });
    selectObject(id);
  };

  const items = activeCategory ? getCatalogByCategory(activeCategory) : [];

  return (
    <div style={styles.tabContent}>
      {activeCategory ? (
        <>
          <button style={styles.backBtn} onClick={() => setActiveCategory(null)}>
            &larr; Categories
          </button>
          <div style={styles.catalogGrid}>
            {items.map((item) => (
              <button key={item.id} onClick={() => handlePlaceItem(item)} style={styles.catalogItem}>
                <div style={{
                  width: 32, height: 32, borderRadius: 6,
                  background: item.primitive?.color || '#334155',
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: '#e2e8f0' }}>{item.name}</div>
                  <div style={{ fontSize: 9, color: '#64748b' }}>{item.tags.join(', ')}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div style={styles.catalogGrid}>
          {CATALOG_CATEGORIES.map((cat) => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={styles.catalogCatBtn}>
              <span style={{ fontSize: 20 }}>{cat.icon}</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#e2e8f0' }}>{cat.label}</div>
                <div style={{ fontSize: 9, color: '#64748b' }}>{getCatalogByCategory(cat.id).length} items</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ---------- Sketchfab Tab ---------- */

const SketchfabTab: React.FC = () => {
  const activeSceneId = useProjectStore((s) => s.editor.activeSceneId);
  const addObject = useProjectStore((s) => s.addObject);
  const addAsset = useProjectStore((s) => s.addAsset);
  const selectObject = useProjectStore((s) => s.selectObject);

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SketchfabModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [token, setToken] = useState(getSketchfabToken());
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [importingUid, setImportingUid] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearched(true);
    const result = await searchSketchfab(searchQuery);
    setResults(result.models);
    setLoading(false);
  };

  const handleImport = async (model: SketchfabModel) => {
    if (!activeSceneId) return;
    setImportingUid(model.uid);
    const dl = await downloadSketchfabModel(model.uid);
    if (dl) {
      const assetId = `sf-${model.uid}`;
      addAsset({
        id: assetId, name: model.name, format: 'glb', url: dl.url,
        fileSizeBytes: 0, status: 'ready',
        metadata: { source: 'sketchfab', author: model.authorName },
        validationErrors: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
      const objId = addObject(activeSceneId, 'mesh', {
        name: model.name, assetId, tags: ['sketchfab', 'imported'],
      });
      selectObject(objId);
    }
    setImportingUid(null);
  };

  const handleSaveToken = (t: string) => {
    setSketchfabToken(t);
    setToken(t);
    setShowTokenInput(false);
  };

  return (
    <div style={styles.tabContent}>
      {/* Token */}
      {!token && !showTokenInput && (
        <div style={{ padding: 8, background: '#1e293b', borderRadius: 6, marginBottom: 8, fontSize: 10, color: '#94a3b8', lineHeight: 1.4 }}>
          <button onClick={() => setShowTokenInput(true)} style={{ background: '#3b82f6', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: 4, fontSize: 10, cursor: 'pointer', marginBottom: 4 }}>
            Set API Token
          </button>
          <div>Add your Sketchfab API token to import models directly.</div>
        </div>
      )}
      {showTokenInput && (
        <div style={{ marginBottom: 8 }}>
          <input type="text" placeholder="Paste Sketchfab API token" style={styles.sfInput}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveToken((e.target as HTMLInputElement).value); }} />
          <button onClick={() => setShowTokenInput(false)} style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', fontSize: 10, cursor: 'pointer' }}>Cancel</button>
        </div>
      )}
      {token && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 10 }}>
          <span style={{ color: '#22c55e' }}>API token set</span>
          <button onClick={() => handleSaveToken('')} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 10, cursor: 'pointer' }}>Clear</button>
        </div>
      )}

      {/* Search */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search models..."
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          style={{ ...styles.sfInput, flex: 1 }} />
        <button onClick={handleSearch} disabled={loading} style={styles.sfSearchBtn}>
          {loading ? '...' : 'Search'}
        </button>
      </div>

      {/* Quick suggestions */}
      {!searched && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {SKETCHFAB_SUGGESTIONS.slice(0, 8).map((s) => (
            <button key={s} onClick={() => { setSearchQuery(s); }}
              style={{ padding: '2px 6px', borderRadius: 4, border: '1px solid #334155', background: '#0a0a1a', color: '#94a3b8', fontSize: 9, cursor: 'pointer' }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {searched && results.length === 0 && !loading && (
        <div style={{ color: '#475569', fontSize: 11, fontStyle: 'italic', textAlign: 'center', padding: 12 }}>
          No results found.
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {results.map((model) => (
          <div key={model.uid} style={styles.sfResult}>
            {model.thumbnailUrl && (
              <img src={model.thumbnailUrl} alt={model.name}
                style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {model.name}
              </div>
              <div style={{ fontSize: 9, color: '#64748b' }}>
                {model.authorName} &middot; {(model.faceCount / 1000).toFixed(0)}k faces
              </div>
            </div>
            {token ? (
              <button onClick={() => handleImport(model)} disabled={importingUid === model.uid}
                style={{ ...styles.sfAddBtn, opacity: importingUid === model.uid ? 0.6 : 1 }}>
                {importingUid === model.uid ? '...' : 'Add'}
              </button>
            ) : (
              <a href={model.viewerUrl} target="_blank" rel="noopener noreferrer" style={styles.sfViewLink}>View</a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

function hexToColor(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { r, g, b, a: 1 };
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    height: 200,
    background: '#0f172a',
    borderTop: '1px solid #1e293b',
    color: '#e2e8f0',
    overflowY: 'auto',
    fontSize: 12,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  embedded: {
    height: '100%',
    background: '#0f172a',
    color: '#e2e8f0',
    fontSize: 12,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  tabBar: {
    display: 'flex',
    gap: 0,
    borderBottom: '1px solid #1e293b',
    flexShrink: 0,
  },
  tabBtn: {
    flex: 1,
    padding: '8px 4px',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: '#64748b',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  tabBtnActive: {
    color: '#3b82f6',
    borderBottomColor: '#3b82f6',
    background: '#1e293b',
  },
  tabContent: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: 8,
  },
  uploadArea: { marginBottom: 8 },
  uploadLabel: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 4,
    padding: 10,
    border: '2px dashed #334155',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'center' as const,
  },
  uploadText: { fontSize: 11, color: '#94a3b8' },
  formatHint: { fontSize: 9, color: '#475569', lineHeight: 1.4 },
  list: {},
  empty: { padding: 8, color: '#475569', fontStyle: 'italic', fontSize: 11 },
  assetItem: { padding: '6px 0', borderBottom: '1px solid #1e293b' },
  assetInfo: { display: 'flex', alignItems: 'center', gap: 8 },
  assetName: { fontWeight: 500, fontSize: 11 },
  assetMeta: { fontSize: 10, color: '#64748b' },
  placeBtn: {
    marginTop: 4,
    padding: '3px 10px',
    borderRadius: 4,
    border: 'none',
    background: '#3b82f6',
    color: '#fff',
    fontSize: 10,
    cursor: 'pointer',
  },
  errors: { marginTop: 4, display: 'flex', flexDirection: 'column' as const, gap: 2 },
  errorMsg: { display: 'flex', alignItems: 'flex-start', gap: 4, fontSize: 10, lineHeight: 1.3 },
  backBtn: {
    background: 'none', border: 'none', color: '#3b82f6',
    fontSize: 11, cursor: 'pointer', padding: '4px 0', marginBottom: 6,
  },
  catalogGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 6,
  },
  catalogCatBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 12px', borderRadius: 8,
    border: '1px solid #1e293b', background: '#0a0a1a',
    color: '#e2e8f0', cursor: 'pointer', textAlign: 'left' as const,
  },
  catalogItem: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 8px', borderRadius: 6,
    border: '1px solid #1e293b', background: '#0a0a1a',
    color: '#e2e8f0', cursor: 'pointer',
  },
  sfInput: {
    padding: '5px 8px', borderRadius: 4, border: '1px solid #334155',
    background: '#1e293b', color: '#fff', fontSize: 11,
    boxSizing: 'border-box' as const, width: '100%',
  },
  sfSearchBtn: {
    padding: '5px 10px', borderRadius: 4, border: 'none',
    background: '#3b82f6', color: '#fff', fontSize: 10, fontWeight: 600, cursor: 'pointer',
    flexShrink: 0,
  },
  sfResult: {
    display: 'flex', gap: 8, padding: '6px 8px',
    borderRadius: 6, border: '1px solid #334155', background: '#0a0a1a',
    alignItems: 'center',
  },
  sfAddBtn: {
    padding: '4px 8px', borderRadius: 4, border: 'none',
    background: '#22c55e', color: '#fff', fontSize: 10, fontWeight: 600,
    cursor: 'pointer', flexShrink: 0,
  },
  sfViewLink: {
    padding: '4px 8px', borderRadius: 4,
    border: '1px solid #334155', background: '#1e293b',
    color: '#3b82f6', fontSize: 10, fontWeight: 600,
    textDecoration: 'none', flexShrink: 0,
  },
};
