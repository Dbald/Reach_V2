/**
 * Sketchfab Integration
 * Search and browse free downloadable 3D models from Sketchfab.
 */

export interface SketchfabModel {
  uid: string;
  name: string;
  thumbnailUrl: string;
  viewerUrl: string;
  downloadUrl: string;
  authorName: string;
  faceCount: number;
  isDownloadable: boolean;
  license: string;
}

export interface SketchfabSearchResult {
  models: SketchfabModel[];
  next: string | null;
  totalCount: number;
}

const SKETCHFAB_API = 'https://api.sketchfab.com/v3';
const TOKEN_KEY = 'reach_v2_sketchfab_token';

/** Get saved Sketchfab API token */
export function getSketchfabToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? '';
}

/** Save Sketchfab API token */
export function setSketchfabToken(token: string) {
  if (token.trim()) {
    localStorage.setItem(TOKEN_KEY, token.trim());
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

/**
 * Search Sketchfab for free, downloadable models.
 */
export async function searchSketchfab(
  query: string,
  options: {
    count?: number;
    cursor?: string;
    category?: string;
  } = {}
): Promise<SketchfabSearchResult> {
  const params = new URLSearchParams({
    q: query,
    type: 'models',
    downloadable: 'true',
    sort_by: '-relevance',
    count: String(options.count ?? 24),
  });

  if (options.cursor) {
    params.set('cursor', options.cursor);
  }

  if (options.category) {
    params.set('categories', options.category);
  }

  try {
    const response = await fetch(`${SKETCHFAB_API}/search?${params}`);
    if (!response.ok) {
      throw new Error(`Sketchfab API error: ${response.status}`);
    }

    const data = await response.json();
    const models: SketchfabModel[] = (data.results ?? []).map((r: any) => ({
      uid: r.uid,
      name: r.name,
      thumbnailUrl: r.thumbnails?.images?.[0]?.url ?? '',
      viewerUrl: r.viewerUrl ?? `https://sketchfab.com/3d-models/${r.uid}`,
      downloadUrl: `${SKETCHFAB_API}/models/${r.uid}/download`,
      authorName: r.user?.displayName ?? 'Unknown',
      faceCount: r.faceCount ?? 0,
      isDownloadable: r.isDownloadable ?? false,
      license: r.license?.label ?? 'Unknown',
    }));

    return {
      models,
      next: data.next ?? null,
      totalCount: data.totalResults ?? models.length,
    };
  } catch (err) {
    console.warn('Sketchfab search failed:', err);
    return { models: [], next: null, totalCount: 0 };
  }
}

/**
 * Download a model's GLB from Sketchfab using the API token.
 * Returns a blob URL to the downloaded GLB file, or null on failure.
 */
export async function downloadSketchfabModel(uid: string): Promise<{ url: string; name: string } | null> {
  const token = getSketchfabToken();
  if (!token) return null;

  try {
    // Step 1: Get the download URL from the API
    const res = await fetch(`${SKETCHFAB_API}/models/${uid}/download`, {
      headers: { Authorization: `Token ${token}` },
    });
    if (!res.ok) {
      console.warn('Sketchfab download API error:', res.status);
      return null;
    }
    const data = await res.json();
    // The API returns { glb: { url, size, expires }, gltf: { ... } }
    const glbInfo = data.glb ?? data.gltf;
    if (!glbInfo?.url) return null;

    // Step 2: Fetch the actual GLB file
    const fileRes = await fetch(glbInfo.url);
    if (!fileRes.ok) return null;
    const blob = await fileRes.blob();
    const blobUrl = URL.createObjectURL(blob);

    return { url: blobUrl, name: `sketchfab-${uid}` };
  } catch (err) {
    console.warn('Sketchfab download failed:', err);
    return null;
  }
}

/**
 * Get suggested search terms for landscaping/backyard projects
 */
export const SKETCHFAB_SUGGESTIONS = [
  'outdoor furniture',
  'garden tree',
  'park bench',
  'fire pit',
  'fence',
  'flower pot',
  'patio set',
  'pergola',
  'garden path',
  'street light',
  'birdbath fountain',
  'rock boulder',
  'hedge bush',
  'gazebo',
  'lawn mower',
  'planter box',
];
