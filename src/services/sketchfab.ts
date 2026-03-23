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

/**
 * Search Sketchfab for free, downloadable models.
 * Filters to downloadable models with CC licenses suitable for use.
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

  // Filter to landscaping/architecture related categories if specified
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
