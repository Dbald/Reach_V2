/**
 * ReferencePanel
 * Manages reference image/PDF overlays on the ground plane.
 * Supports upload (JPG, PNG, PDF), opacity, lock, visibility,
 * move/rotate/resize, delete/replace, and 2-point scale calibration.
 */

import React, { useState, useRef, useCallback } from 'react';
import { useProjectStore } from '@/store';
import type { ReferenceOverlay } from '@/types';

// --- PDF to image conversion ---

async function pdfToImage(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const scale = 2; // render at 2x for quality
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d')!;
  await page.render({ canvasContext: ctx, viewport }).promise;

  return canvas.toDataURL('image/png');
}

// --- Calibration helpers ---

function computeCalibratedScale(
  overlay: ReferenceOverlay,
): { width: number; height: number } | null {
  const cal = overlay.calibration;
  if (!cal) return null;

  const { point1, point2, realDistance } = cal;
  // Distance in UV space
  const du = point2.uv.u - point1.uv.u;
  const dv = point2.uv.v - point1.uv.v;
  const uvDist = Math.sqrt(du * du + dv * dv);
  if (uvDist < 0.001) return null;

  // Current image pixel-distance maps to current world size
  // uvDist fraction of the image = realDistance world units
  // So full image width = realDistance / (uvDist * aspect_contribution)
  // Simpler: scale factor = realDistance / (uvDist * currentSize)
  const currentDiag = Math.sqrt(
    overlay.size.width * overlay.size.width + overlay.size.height * overlay.size.height,
  );
  // UV distance corresponds to a fraction of the diagonal
  const worldDistForUv = uvDist * currentDiag;
  const scaleFactor = realDistance / worldDistForUv;

  return {
    width: overlay.size.width * scaleFactor,
    height: overlay.size.height * scaleFactor,
  };
}

// --- Component ---

export const ReferencePanel: React.FC = () => {
  const activeSceneId = useProjectStore((s) => s.editor.activeSceneId);
  const project = useProjectStore((s) => s.project);
  const addReferenceOverlay = useProjectStore((s) => s.addReferenceOverlay);
  const updateReferenceOverlay = useProjectStore((s) => s.updateReferenceOverlay);
  const deleteReferenceOverlay = useProjectStore((s) => s.deleteReferenceOverlay);

  const [expanded, setExpanded] = useState(true);
  const [calibratingId, setCalibratingId] = useState<string | null>(null);
  const [calibrationStep, setCalibrationStep] = useState<1 | 2 | 'distance'>(1);
  const [calPoints, setCalPoints] = useState<{ uv1?: { u: number; v: number }; uv2?: { u: number; v: number } }>({});
  const [calDistance, setCalDistance] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetId = useRef<string | null>(null);

  const scene = project && activeSceneId ? project.scenes[activeSceneId] : null;
  const overlays = scene?.referenceOverlays ?? {};
  const overlayList = Object.values(overlays);

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || !activeSceneId) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.toLowerCase().split('.').pop();
      const isPdf = ext === 'pdf';
      const isImage = ['jpg', 'jpeg', 'png'].includes(ext || '');

      if (!isPdf && !isImage) continue;

      let imageUrl: string;
      if (isPdf) {
        try {
          imageUrl = await pdfToImage(file);
        } catch (err) {
          console.error('Failed to convert PDF:', err);
          continue;
        }
      } else {
        imageUrl = URL.createObjectURL(file);
      }

      // Get image dimensions to compute aspect ratio
      const img = new Image();
      img.src = imageUrl;
      await new Promise<void>((resolve) => { img.onload = () => resolve(); img.onerror = () => resolve(); });

      const aspect = img.width && img.height ? img.width / img.height : 1;
      const defaultWidth = 10; // 10 world units wide by default
      const defaultHeight = defaultWidth / aspect;

      if (replaceTargetId.current) {
        updateReferenceOverlay(activeSceneId, replaceTargetId.current, {
          imageUrl,
          isPdf,
          name: file.name,
          size: { width: defaultWidth, height: defaultHeight },
        });
        replaceTargetId.current = null;
      } else {
        addReferenceOverlay(activeSceneId, {
          name: file.name,
          imageUrl,
          isPdf,
          position: { x: 0, z: 0 },
          rotation: 0,
          size: { width: defaultWidth, height: defaultHeight },
          opacity: 0.7,
          locked: false,
          visible: true,
        });
      }
    }
  }, [activeSceneId, addReferenceOverlay, updateReferenceOverlay]);

  const handleCalibrationImageClick = (
    e: React.MouseEvent<HTMLImageElement>,
    overlayId: string,
  ) => {
    if (calibratingId !== overlayId) return;
    if (calibrationStep !== 1 && calibrationStep !== 2) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const u = (e.clientX - rect.left) / rect.width;
    const v = (e.clientY - rect.top) / rect.height;

    if (calibrationStep === 1) {
      setCalPoints({ uv1: { u, v } });
      setCalibrationStep(2);
    } else if (calibrationStep === 2) {
      setCalPoints((prev) => ({ ...prev, uv2: { u, v } }));
      setCalibrationStep('distance');
    }
  };

  const applyCalibration = (overlayId: string) => {
    if (!activeSceneId || !calPoints.uv1 || !calPoints.uv2) return;
    const dist = parseFloat(calDistance);
    if (isNaN(dist) || dist <= 0) return;

    const overlay = overlays[overlayId];
    if (!overlay) return;

    const tempOverlay: ReferenceOverlay = {
      ...overlay,
      calibration: {
        point1: { uv: calPoints.uv1, world: { x: 0, y: 0, z: 0 } },
        point2: { uv: calPoints.uv2, world: { x: 0, y: 0, z: 0 } },
        realDistance: dist,
      },
    };

    const newSize = computeCalibratedScale(tempOverlay);
    if (newSize) {
      updateReferenceOverlay(activeSceneId, overlayId, {
        size: newSize,
        calibration: tempOverlay.calibration,
      });
    }

    setCalibratingId(null);
    setCalibrationStep(1);
    setCalPoints({});
    setCalDistance('');
  };

  if (!scene) return null;

  return (
    <div style={styles.panel}>
      <div
        style={styles.header}
        onClick={() => setExpanded(!expanded)}
      >
        <span style={{ fontSize: 11 }}>{expanded ? '\u25BC' : '\u25B6'}</span>
        <span style={styles.headerLabel}>Reference Images</span>
        <span style={styles.badge}>{overlayList.length}</span>
      </div>

      {expanded && (
        <div style={styles.content}>
          {/* Upload button */}
          <button
            style={styles.uploadBtn}
            onClick={() => {
              replaceTargetId.current = null;
              fileInputRef.current?.click();
            }}
          >
            + Upload Reference (JPG, PNG, PDF)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              handleFileUpload(e.target.files);
              e.target.value = '';
            }}
          />

          {/* Overlay list */}
          {overlayList.map((overlay) => (
            <div key={overlay.id} style={styles.card}>
              {/* Preview + name */}
              <div style={styles.cardHeader}>
                <img
                  src={overlay.imageUrl}
                  alt={overlay.name}
                  style={{
                    ...styles.thumbnail,
                    cursor: calibratingId === overlay.id ? 'crosshair' : 'default',
                  }}
                  onClick={(e) => handleCalibrationImageClick(e, overlay.id)}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.cardName}>{overlay.name}</div>
                  <div style={styles.cardMeta}>
                    {overlay.size.width.toFixed(1)} x {overlay.size.height.toFixed(1)}m
                    {overlay.isPdf && <span style={styles.pdfBadge}>PDF</span>}
                  </div>
                </div>
              </div>

              {/* Calibration UI */}
              {calibratingId === overlay.id && (
                <div style={styles.calibrationBox}>
                  <div style={styles.calibrationTitle}>Scale Calibration</div>
                  {calibrationStep === 1 && (
                    <div style={styles.calibrationHint}>Click point 1 on the image above</div>
                  )}
                  {calibrationStep === 2 && (
                    <div style={styles.calibrationHint}>Click point 2 on the image above</div>
                  )}
                  {calibrationStep === 'distance' && (
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <input
                        type="number"
                        value={calDistance}
                        onChange={(e) => setCalDistance(e.target.value)}
                        placeholder="Real distance"
                        style={styles.numberInput}
                        min={0}
                        step={0.1}
                        autoFocus
                      />
                      <span style={{ color: '#94a3b8', fontSize: 10 }}>m</span>
                      <button
                        style={styles.smallBtn}
                        onClick={() => applyCalibration(overlay.id)}
                      >
                        Apply
                      </button>
                    </div>
                  )}
                  <button
                    style={{ ...styles.smallBtn, background: '#64748b', marginTop: 4 }}
                    onClick={() => {
                      setCalibratingId(null);
                      setCalibrationStep(1);
                      setCalPoints({});
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Controls */}
              <div style={styles.controlRow}>
                <label style={styles.controlLabel}>Opacity</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={overlay.opacity}
                  onChange={(e) =>
                    activeSceneId &&
                    updateReferenceOverlay(activeSceneId, overlay.id, {
                      opacity: parseFloat(e.target.value),
                    })
                  }
                  style={styles.slider}
                />
                <span style={styles.sliderValue}>{Math.round(overlay.opacity * 100)}%</span>
              </div>

              {/* Position */}
              <div style={styles.controlRow}>
                <label style={styles.controlLabel}>Position</label>
                <input
                  type="number"
                  value={overlay.position.x}
                  step={0.5}
                  onChange={(e) =>
                    activeSceneId &&
                    updateReferenceOverlay(activeSceneId, overlay.id, {
                      position: { ...overlay.position, x: parseFloat(e.target.value) || 0 },
                    })
                  }
                  style={styles.numberInput}
                  disabled={overlay.locked}
                />
                <input
                  type="number"
                  value={overlay.position.z}
                  step={0.5}
                  onChange={(e) =>
                    activeSceneId &&
                    updateReferenceOverlay(activeSceneId, overlay.id, {
                      position: { ...overlay.position, z: parseFloat(e.target.value) || 0 },
                    })
                  }
                  style={styles.numberInput}
                  disabled={overlay.locked}
                />
              </div>

              {/* Rotation */}
              <div style={styles.controlRow}>
                <label style={styles.controlLabel}>Rotation</label>
                <input
                  type="number"
                  value={Math.round((overlay.rotation * 180) / Math.PI)}
                  step={15}
                  onChange={(e) =>
                    activeSceneId &&
                    updateReferenceOverlay(activeSceneId, overlay.id, {
                      rotation: ((parseFloat(e.target.value) || 0) * Math.PI) / 180,
                    })
                  }
                  style={styles.numberInput}
                  disabled={overlay.locked}
                />
                <span style={{ color: '#64748b', fontSize: 10 }}>deg</span>
              </div>

              {/* Size */}
              <div style={styles.controlRow}>
                <label style={styles.controlLabel}>Size</label>
                <input
                  type="number"
                  value={parseFloat(overlay.size.width.toFixed(2))}
                  step={0.5}
                  min={0.1}
                  onChange={(e) => {
                    if (!activeSceneId) return;
                    const w = parseFloat(e.target.value) || 0.1;
                    const aspect = overlay.size.width / overlay.size.height;
                    updateReferenceOverlay(activeSceneId, overlay.id, {
                      size: { width: w, height: w / aspect },
                    });
                  }}
                  style={styles.numberInput}
                  disabled={overlay.locked}
                />
                <span style={{ color: '#64748b', fontSize: 10 }}>W</span>
                <input
                  type="number"
                  value={parseFloat(overlay.size.height.toFixed(2))}
                  step={0.5}
                  min={0.1}
                  onChange={(e) => {
                    if (!activeSceneId) return;
                    const h = parseFloat(e.target.value) || 0.1;
                    const aspect = overlay.size.width / overlay.size.height;
                    updateReferenceOverlay(activeSceneId, overlay.id, {
                      size: { width: h * aspect, height: h },
                    });
                  }}
                  style={styles.numberInput}
                  disabled={overlay.locked}
                />
                <span style={{ color: '#64748b', fontSize: 10 }}>H</span>
              </div>

              {/* Action buttons */}
              <div style={styles.actionRow}>
                <button
                  style={{
                    ...styles.iconBtn,
                    color: overlay.visible ? '#3b82f6' : '#64748b',
                  }}
                  title={overlay.visible ? 'Hide' : 'Show'}
                  onClick={() =>
                    activeSceneId &&
                    updateReferenceOverlay(activeSceneId, overlay.id, {
                      visible: !overlay.visible,
                    })
                  }
                >
                  {overlay.visible ? '\u{1F441}' : '\u{1F441}\u200D\u{1F5E8}'}
                </button>
                <button
                  style={{
                    ...styles.iconBtn,
                    color: overlay.locked ? '#f59e0b' : '#64748b',
                  }}
                  title={overlay.locked ? 'Unlock' : 'Lock'}
                  onClick={() =>
                    activeSceneId &&
                    updateReferenceOverlay(activeSceneId, overlay.id, {
                      locked: !overlay.locked,
                    })
                  }
                >
                  {overlay.locked ? '\u{1F512}' : '\u{1F513}'}
                </button>
                <button
                  style={styles.iconBtn}
                  title="Calibrate Scale"
                  onClick={() => {
                    setCalibratingId(overlay.id);
                    setCalibrationStep(1);
                    setCalPoints({});
                    setCalDistance('');
                  }}
                >
                  {'\u{1F4CF}'}
                </button>
                <button
                  style={styles.iconBtn}
                  title="Replace Image"
                  onClick={() => {
                    replaceTargetId.current = overlay.id;
                    fileInputRef.current?.click();
                  }}
                >
                  {'\u{1F504}'}
                </button>
                <button
                  style={{ ...styles.iconBtn, color: '#ef4444' }}
                  title="Delete"
                  onClick={() =>
                    activeSceneId && deleteReferenceOverlay(activeSceneId, overlay.id)
                  }
                >
                  {'\u{1F5D1}'}
                </button>
              </div>
            </div>
          ))}

          {overlayList.length === 0 && (
            <div style={styles.emptyText}>
              No reference images. Upload a JPG, PNG, or PDF to place on the ground plane.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    borderBottom: '1px solid #1e293b',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    cursor: 'pointer',
    userSelect: 'none',
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: 600,
  },
  headerLabel: { flex: 1 },
  badge: {
    background: '#334155',
    color: '#94a3b8',
    padding: '1px 6px',
    borderRadius: 8,
    fontSize: 10,
  },
  content: {
    padding: '0 12px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  uploadBtn: {
    width: '100%',
    padding: '8px 0',
    borderRadius: 6,
    border: '1px dashed #475569',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: 11,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  card: {
    background: '#1e293b',
    borderRadius: 6,
    padding: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  cardHeader: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  thumbnail: {
    width: 48,
    height: 48,
    objectFit: 'cover',
    borderRadius: 4,
    border: '1px solid #334155',
  },
  cardName: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cardMeta: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
    display: 'flex',
    gap: 4,
    alignItems: 'center',
  },
  pdfBadge: {
    background: '#ef4444',
    color: '#fff',
    padding: '0 4px',
    borderRadius: 3,
    fontSize: 9,
    fontWeight: 600,
  },
  controlRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  controlLabel: {
    color: '#94a3b8',
    fontSize: 10,
    width: 48,
    flexShrink: 0,
  },
  slider: {
    flex: 1,
    height: 4,
    accentColor: '#3b82f6',
  },
  sliderValue: {
    color: '#94a3b8',
    fontSize: 10,
    width: 28,
    textAlign: 'right' as const,
  },
  numberInput: {
    flex: 1,
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 4,
    color: '#e2e8f0',
    padding: '3px 6px',
    fontSize: 10,
    width: 0,
    minWidth: 40,
  },
  actionRow: {
    display: 'flex',
    gap: 2,
    justifyContent: 'flex-end',
    borderTop: '1px solid #0f172a',
    paddingTop: 6,
    marginTop: 2,
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: 14,
    cursor: 'pointer',
    padding: '2px 4px',
    borderRadius: 4,
    lineHeight: 1,
  },
  emptyText: {
    color: '#475569',
    fontSize: 11,
    textAlign: 'center' as const,
    padding: '12px 0',
  },
  calibrationBox: {
    background: '#0f172a',
    borderRadius: 4,
    padding: 8,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },
  calibrationTitle: {
    color: '#3b82f6',
    fontSize: 10,
    fontWeight: 600,
  },
  calibrationHint: {
    color: '#94a3b8',
    fontSize: 10,
  },
  smallBtn: {
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '3px 8px',
    fontSize: 10,
    cursor: 'pointer',
  },
};
