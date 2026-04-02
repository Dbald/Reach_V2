import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuid } from 'uuid';
import type {
  Project,
  SceneObject,
  SceneObjectType,
  Zone,
  AssetReference,
  TemplateType,
  Transform,
  MaterialConfig,
  ValidationReport,
  GrowthStage,
  ReferenceOverlay,
} from '@/types';
import { createProject, defaultTransform } from '@/utils/defaults';

export type PlacementType = 'object' | 'light' | 'camera' | 'text' | 'video' | 'audio' | 'sky' | 'zone' | 'catalog' | null;
export type RenderMode = 'lit' | 'unlit' | 'wireframe';
export type ZonePreset = 'walkable' | 'collision' | 'custom';

export interface ZoneDrawState {
  active: boolean;
  preset: ZonePreset;
  corner1: { x: number; z: number } | null;
  hoverPos: { x: number; z: number } | null;
  name: string;
  height: number;
  color: string;
  walkable: boolean;
  hasCollision: boolean;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  objectId: string | null;
}

interface EditorState {
  selectedObjectIds: string[];
  activeSceneId: string | null;
  contextMenu: ContextMenuState;
  activeTool: 'select' | 'move' | 'rotate' | 'scale' | 'place' | 'zone';
  placementType: PlacementType;
  placementSettings: Record<string, unknown>;
  renderMode: RenderMode;
  viewMode: 'editor' | 'preview' | 'vr';
  showGrid: boolean;
  showHierarchy: boolean;
  showInspector: boolean;
  showAssetTray: boolean;
  focusTargetId: string | null;
  isFocused: boolean;
  zoneDraw: ZoneDrawState;
  /** Global growth year for the timeline (null = no staging active) */
  activeGrowthYear: number | null;
}

const MAX_UNDO = 50;

interface ProjectStore {
  // State
  project: Project | null;
  editor: EditorState;
  validationReport: ValidationReport | null;

  // Undo / redo
  _undoStack: string[];
  _redoStack: string[];
  undo: () => void;
  redo: () => void;
  _pushUndo: () => void;

  // Project actions
  createNewProject: (name: string, template: TemplateType) => void;
  updateProjectName: (name: string) => void;

  // Scene actions
  duplicateScene: (sceneId: string, newName?: string) => string | null;

  // Scene object actions
  addObject: (sceneId: string, type: SceneObjectType, props?: Partial<SceneObject>) => string;
  updateObject: (sceneId: string, objectId: string, updates: Partial<SceneObject>) => void;
  deleteObject: (sceneId: string, objectId: string) => void;
  duplicateObject: (sceneId: string, objectId: string) => string | null;
  setObjectTransform: (sceneId: string, objectId: string, transform: Transform) => void;
  /** Like setObjectTransform but skips undo push — use for live dragging */
  setObjectTransformLive: (sceneId: string, objectId: string, transform: Transform) => void;
  setObjectMaterial: (sceneId: string, objectId: string, material: MaterialConfig) => void;
  setActiveCamera: (sceneId: string, cameraObjectId: string) => void;
  groupObjects: (sceneId: string, objectIds: string[]) => string | null;
  ungroupObject: (sceneId: string, groupId: string) => void;

  // Zone actions
  addZone: (sceneId: string, zone: Omit<Zone, 'id'>) => string;
  updateZone: (sceneId: string, zoneId: string, updates: Partial<Zone>) => void;
  deleteZone: (sceneId: string, zoneId: string) => void;

  // Asset actions
  addAsset: (asset: AssetReference) => void;
  updateAsset: (assetId: string, updates: Partial<AssetReference>) => void;
  removeAsset: (assetId: string) => void;

  // Editor actions
  selectObject: (objectId: string | null, addToSelection?: boolean) => void;
  deleteSelected: (sceneId: string) => void;
  duplicateSelected: (sceneId: string) => void;
  setActiveScene: (sceneId: string) => void;

  // Context menu
  openContextMenu: (x: number, y: number, objectId: string) => void;
  closeContextMenu: () => void;
  setActiveTool: (tool: EditorState['activeTool']) => void;
  setPlacementType: (type: PlacementType) => void;
  setPlacementSettings: (settings: Record<string, unknown>) => void;
  setRenderMode: (mode: RenderMode) => void;
  focusOnSelected: () => void;
  unfocus: () => void;
  clearFocusTarget: () => void;
  setViewMode: (mode: EditorState['viewMode']) => void;
  togglePanel: (panel: 'showHierarchy' | 'showInspector' | 'showAssetTray') => void;

  // Zone drawing
  startZoneDraw: (preset: ZonePreset, opts: Partial<ZoneDrawState>) => void;
  setZoneDrawHover: (pos: { x: number; z: number } | null) => void;
  setZoneDrawCorner1: (pos: { x: number; z: number }) => void;
  finishZoneDraw: () => void;
  cancelZoneDraw: () => void;
  updateZoneDraw: (updates: Partial<ZoneDrawState>) => void;

  // Growth staging
  setActiveGrowthYear: (year: number | null) => void;
  setObjectGrowthStages: (sceneId: string, objectId: string, stages: GrowthStage[]) => void;
  setObjectActiveStage: (sceneId: string, objectId: string, stageIndex: number) => void;

  // Reference overlays
  addReferenceOverlay: (sceneId: string, overlay: Omit<ReferenceOverlay, 'id'>) => string;
  updateReferenceOverlay: (sceneId: string, overlayId: string, updates: Partial<ReferenceOverlay>) => void;
  deleteReferenceOverlay: (sceneId: string, overlayId: string) => void;

  // Validation
  setValidationReport: (report: ValidationReport | null) => void;

  // Save / Load / Home
  goHome: () => void;
  loadProject: (project: Project) => void;
}

const defaultEditorState: EditorState = {
  selectedObjectIds: [],
  activeSceneId: null,
  contextMenu: { visible: false, x: 0, y: 0, objectId: null },
  activeTool: 'select',
  placementType: null,
  placementSettings: {},
  renderMode: 'lit' as RenderMode,
  focusTargetId: null,
  isFocused: false,
  zoneDraw: {
    active: false,
    preset: 'walkable' as ZonePreset,
    corner1: null,
    hoverPos: null,
    name: '',
    height: 2.5,
    color: '#22c55e',
    walkable: true,
    hasCollision: false,
  },
  viewMode: 'editor',
  showGrid: true,
  showHierarchy: true,
  showInspector: true,
  showAssetTray: true,
  activeGrowthYear: null,
};

// --- localStorage persistence helpers ---
const STORAGE_KEY = 'reach_v2_project';
const SAVED_PROJECTS_KEY = 'reach_v2_saved_projects';

function loadSavedProject(): Project | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const project = JSON.parse(raw) as Project;
      // Clean up any corrupted assets (e.g. null format from unsupported uploads)
      if (project.assets) {
        for (const [id, asset] of Object.entries(project.assets)) {
          if (!asset.format) {
            delete project.assets[id];
          }
        }
      }
      return project;
    }
  } catch { /* ignore corrupt data */ }
  return null;
}

function saveProject(project: Project | null) {
  try {
    if (project) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch { /* storage full or unavailable */ }
}

export interface SavedProjectEntry {
  id: string;
  name: string;
  templateType: string;
  updatedAt: string;
  objectCount: number;
}

/** Get list of saved project entries (metadata only) */
export function getSavedProjects(): SavedProjectEntry[] {
  try {
    const raw = localStorage.getItem(SAVED_PROJECTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

/** Save the current project to the saved projects list */
export function saveProjectToList(project: Project) {
  try {
    const entries = getSavedProjects();
    const scene = Object.values(project.scenes)[0];
    const entry: SavedProjectEntry = {
      id: project.id,
      name: project.name,
      templateType: project.templateType,
      updatedAt: new Date().toISOString(),
      objectCount: scene ? Object.keys(scene.objects).length : 0,
    };
    const idx = entries.findIndex((e) => e.id === project.id);
    if (idx >= 0) entries[idx] = entry;
    else entries.unshift(entry);
    localStorage.setItem(SAVED_PROJECTS_KEY, JSON.stringify(entries));
    // Store full project data under its own key
    localStorage.setItem(`reach_v2_proj_${project.id}`, JSON.stringify(project));
  } catch { /* storage full */ }
}

/** Load a saved project by ID */
export function loadSavedProjectById(id: string): Project | null {
  try {
    const raw = localStorage.getItem(`reach_v2_proj_${id}`);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

/** Delete a saved project by ID */
export function deleteSavedProject(id: string) {
  try {
    localStorage.removeItem(`reach_v2_proj_${id}`);
    const entries = getSavedProjects().filter((e) => e.id !== id);
    localStorage.setItem(SAVED_PROJECTS_KEY, JSON.stringify(entries));
  } catch { /* ignore */ }
}

const savedProject = loadSavedProject();

export const useProjectStore = create<ProjectStore>()(
  immer((set, get) => ({
    project: savedProject,
    editor: {
      ...defaultEditorState,
      activeSceneId: savedProject ? Object.keys(savedProject.scenes)[0] : null,
    },
    validationReport: null,
    _undoStack: [],
    _redoStack: [],

    _pushUndo: () => {
      const { project } = get();
      if (!project) return;
      set((state) => {
        state._undoStack.push(JSON.stringify(project));
        if (state._undoStack.length > MAX_UNDO) {
          state._undoStack.shift();
        }
        state._redoStack = [];
      });
    },

    undo: () => {
      const { _undoStack, project } = get();
      if (_undoStack.length === 0) return;
      set((state) => {
        const snapshot = state._undoStack.pop()!;
        if (state.project) {
          state._redoStack.push(JSON.stringify(state.project));
        }
        state.project = JSON.parse(snapshot);
      });
    },

    redo: () => {
      const { _redoStack, project } = get();
      if (_redoStack.length === 0) return;
      set((state) => {
        const snapshot = state._redoStack.pop()!;
        if (state.project) {
          state._undoStack.push(JSON.stringify(state.project));
        }
        state.project = JSON.parse(snapshot);
      });
    },

    createNewProject: (name, template) => {
      set((state) => {
        const project = createProject(name, template);
        state.project = project;
        const firstSceneId = Object.keys(project.scenes)[0];
        state.editor.activeSceneId = firstSceneId;
        state.editor.selectedObjectIds = [];
        state.validationReport = null;
        state._undoStack = [];
        state._redoStack = [];
      });
    },

    updateProjectName: (name) => {
      get()._pushUndo();
      set((state) => {
        if (state.project) {
          state.project.name = name;
          state.project.updatedAt = new Date().toISOString();
        }
      });
    },

    duplicateScene: (sceneId, newName) => {
      let newId: string | null = null;
      get()._pushUndo();
      set((state) => {
        const scene = state.project?.scenes[sceneId];
        if (!scene || !state.project) return;
        newId = uuid();
        const clone = JSON.parse(JSON.stringify(scene));
        clone.id = newId;
        clone.name = newName || `${scene.name} (copy)`;
        // Generate new IDs for all objects
        const oldToNew: Record<string, string> = {};
        const newObjects: Record<string, any> = {};
        for (const [oldId, obj] of Object.entries(clone.objects)) {
          const nid = uuid();
          oldToNew[oldId] = nid;
          (obj as any).id = nid;
          newObjects[nid] = obj;
        }
        clone.objects = newObjects;
        // Remap parentIds
        for (const obj of Object.values(clone.objects) as any[]) {
          if (obj.parentId && oldToNew[obj.parentId]) {
            obj.parentId = oldToNew[obj.parentId];
          }
        }
        // New IDs for zones
        const newZones: Record<string, any> = {};
        for (const zone of Object.values(clone.zones) as any[]) {
          const nid = uuid();
          zone.id = nid;
          newZones[nid] = zone;
        }
        clone.zones = newZones;
        // New IDs for viewpoints
        const newVps: Record<string, any> = {};
        for (const vp of Object.values(clone.viewpoints) as any[]) {
          const nid = uuid();
          vp.id = nid;
          newVps[nid] = vp;
        }
        clone.viewpoints = newVps;
        state.project.scenes[newId!] = clone;
        state.editor.activeSceneId = newId;
        state.editor.selectedObjectIds = [];
        state.project.updatedAt = new Date().toISOString();
      });
      return newId;
    },

    addObject: (sceneId, type, props) => {
      const id = uuid();
      get()._pushUndo();
      set((state) => {
        const scene = state.project?.scenes[sceneId];
        if (!scene) return;
        const obj: SceneObject = {
          id,
          name: props?.name ?? `${type}-${id.slice(0, 6)}`,
          type,
          parentId: props?.parentId ?? null,
          transform: props?.transform ?? defaultTransform(),
          assetId: props?.assetId,
          material: props?.material,
          tags: props?.tags ?? [],
          metadata: props?.metadata ?? {},
          visible: true,
          locked: false,
          growthStages: props?.growthStages,
          activeStageIndex: props?.activeStageIndex ?? (props?.growthStages ? 0 : undefined),
        };
        // Apply first growth stage's scale to the initial transform
        if (obj.growthStages && obj.growthStages.length > 0) {
          const firstStage = obj.growthStages[0];
          obj.transform.scale = { x: firstStage.scale[0], y: firstStage.scale[1], z: firstStage.scale[2] };
        }
        scene.objects[id] = obj;
        state.project!.updatedAt = new Date().toISOString();
      });
      return id;
    },

    updateObject: (sceneId, objectId, updates) => {
      get()._pushUndo();
      set((state) => {
        const obj = state.project?.scenes[sceneId]?.objects[objectId];
        if (!obj) return;
        Object.assign(obj, updates);
        state.project!.updatedAt = new Date().toISOString();
      });
    },

    deleteObject: (sceneId, objectId) => {
      get()._pushUndo();
      set((state) => {
        const scene = state.project?.scenes[sceneId];
        if (!scene) return;
        delete scene.objects[objectId];
        for (const [id, obj] of Object.entries(scene.objects)) {
          if (obj.parentId === objectId) {
            delete scene.objects[id];
          }
        }
        const idx = state.editor.selectedObjectIds.indexOf(objectId);
        if (idx >= 0) state.editor.selectedObjectIds.splice(idx, 1);
        state.project!.updatedAt = new Date().toISOString();
      });
    },

    duplicateObject: (sceneId, objectId) => {
      let newId: string | null = null;
      get()._pushUndo();
      set((state) => {
        const scene = state.project?.scenes[sceneId];
        const original = scene?.objects[objectId];
        if (!scene || !original) return;
        newId = uuid();
        const clone: SceneObject = {
          ...JSON.parse(JSON.stringify(original)),
          id: newId,
          name: `${original.name} (copy)`,
          transform: {
            ...original.transform,
            position: {
              ...original.transform.position,
              x: original.transform.position.x + 1,
            },
          },
        };
        // Clear saved per-stage transforms so the duplicate uses its own position
        if (clone.growthStages) {
          for (const stage of clone.growthStages) {
            delete stage.userScale;
            delete stage.userRotation;
          }
        }
        scene.objects[newId] = clone;
        state.project!.updatedAt = new Date().toISOString();
      });
      return newId;
    },

    setObjectTransform: (sceneId, objectId, transform) => {
      get()._pushUndo();
      set((state) => {
        const obj = state.project?.scenes[sceneId]?.objects[objectId];
        if (!obj) return;
        const clamped = {
          ...transform,
          position: {
            ...transform.position,
            y: Math.max(0, transform.position.y),
          },
        };
        obj.transform = clamped;
        // Save scale + rotation per-stage (position is shared across all stages)
        if (obj.growthStages && obj.activeStageIndex != null && obj.growthStages[obj.activeStageIndex]) {
          const stage = obj.growthStages[obj.activeStageIndex];
          stage.userScale = { ...clamped.scale };
          stage.userRotation = { ...clamped.rotation };
        }
      });
    },

    setObjectTransformLive: (sceneId, objectId, transform) => {
      set((state) => {
        const obj = state.project?.scenes[sceneId]?.objects[objectId];
        if (!obj) return;
        const clamped = {
          ...transform,
          position: {
            ...transform.position,
            y: Math.max(0, transform.position.y),
          },
        };
        obj.transform = clamped;
        if (obj.growthStages && obj.activeStageIndex != null && obj.growthStages[obj.activeStageIndex]) {
          const stage = obj.growthStages[obj.activeStageIndex];
          stage.userScale = { ...clamped.scale };
          stage.userRotation = { ...clamped.rotation };
        }
      });
    },

    setObjectMaterial: (sceneId, objectId, material) => {
      get()._pushUndo();
      set((state) => {
        const obj = state.project?.scenes[sceneId]?.objects[objectId];
        if (obj) obj.material = material;
      });
    },

    setActiveCamera: (sceneId, cameraObjectId) => {
      get()._pushUndo();
      set((state) => {
        const scene = state.project?.scenes[sceneId];
        if (!scene) return;
        // Unset isEntry on all other cameras, set on the target
        for (const obj of Object.values(scene.objects)) {
          if (obj.type === 'camera') {
            obj.metadata.isEntry = obj.id === cameraObjectId;
          }
        }
        state.project!.updatedAt = new Date().toISOString();
      });
    },

    groupObjects: (sceneId, objectIds) => {
      if (objectIds.length < 2) return null;
      const groupId = uuid();
      get()._pushUndo();
      set((state) => {
        const scene = state.project?.scenes[sceneId];
        if (!scene) return;
        // Compute center of all objects to place group there
        let cx = 0, cy = 0, cz = 0;
        const valid: string[] = [];
        for (const id of objectIds) {
          const obj = scene.objects[id];
          if (obj) {
            cx += obj.transform.position.x;
            cy += obj.transform.position.y;
            cz += obj.transform.position.z;
            valid.push(id);
          }
        }
        if (valid.length < 2) return;
        cx /= valid.length;
        cy /= valid.length;
        cz /= valid.length;

        // Create group object at the center
        const group: SceneObject = {
          id: groupId,
          name: `Group`,
          type: 'group',
          parentId: null,
          transform: {
            position: { x: cx, y: cy, z: cz },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            scale: { x: 1, y: 1, z: 1 },
          },
          tags: [],
          metadata: {},
          visible: true,
          locked: false,
        };
        scene.objects[groupId] = group;

        // Reparent children and offset their positions relative to group center
        for (const id of valid) {
          const obj = scene.objects[id];
          if (!obj) continue;
          obj.parentId = groupId;
          obj.transform.position.x -= cx;
          obj.transform.position.y -= cy;
          obj.transform.position.z -= cz;
        }
        state.editor.selectedObjectIds = [groupId];
        state.project!.updatedAt = new Date().toISOString();
      });
      return groupId;
    },

    ungroupObject: (sceneId, groupId) => {
      get()._pushUndo();
      set((state) => {
        const scene = state.project?.scenes[sceneId];
        if (!scene) return;
        const group = scene.objects[groupId];
        if (!group || group.type !== 'group') return;

        const gx = group.transform.position.x;
        const gy = group.transform.position.y;
        const gz = group.transform.position.z;

        // Move children back to world space
        const childIds: string[] = [];
        for (const obj of Object.values(scene.objects)) {
          if (obj.parentId === groupId) {
            obj.parentId = group.parentId; // preserve nesting if group was inside another group
            obj.transform.position.x += gx;
            obj.transform.position.y += gy;
            obj.transform.position.z += gz;
            childIds.push(obj.id);
          }
        }

        // Delete the group object
        delete scene.objects[groupId];
        state.editor.selectedObjectIds = childIds;
        state.project!.updatedAt = new Date().toISOString();
      });
    },

    addZone: (sceneId, zone) => {
      const id = uuid();
      get()._pushUndo();
      set((state) => {
        const scene = state.project?.scenes[sceneId];
        if (!scene) return;
        scene.zones[id] = { ...zone, id };
        state.project!.updatedAt = new Date().toISOString();
      });
      return id;
    },

    updateZone: (sceneId, zoneId, updates) => {
      get()._pushUndo();
      set((state) => {
        const zone = state.project?.scenes[sceneId]?.zones[zoneId];
        if (zone) Object.assign(zone, updates);
      });
    },

    deleteZone: (sceneId, zoneId) => {
      get()._pushUndo();
      set((state) => {
        const scene = state.project?.scenes[sceneId];
        if (scene) delete scene.zones[zoneId];
      });
    },

    addAsset: (asset) => {
      set((state) => {
        if (state.project) {
          state.project.assets[asset.id] = asset;
        }
      });
    },

    updateAsset: (assetId, updates) => {
      set((state) => {
        const asset = state.project?.assets[assetId];
        if (asset) Object.assign(asset, updates);
      });
    },

    removeAsset: (assetId) => {
      set((state) => {
        if (state.project) delete state.project.assets[assetId];
      });
    },

    selectObject: (objectId, addToSelection = false) => {
      set((state) => {
        if (objectId === null) {
          state.editor.selectedObjectIds = [];
        } else if (addToSelection) {
          const idx = state.editor.selectedObjectIds.indexOf(objectId);
          if (idx >= 0) {
            state.editor.selectedObjectIds.splice(idx, 1);
          } else {
            state.editor.selectedObjectIds.push(objectId);
          }
        } else {
          state.editor.selectedObjectIds = [objectId];
        }
        // Close add panel when selecting an object
        if (objectId && state.editor.activeTool === 'place') {
          state.editor.activeTool = 'select';
          state.editor.placementType = null;
        }
        state.editor.contextMenu.visible = false;
      });
    },

    deleteSelected: (sceneId) => {
      const ids = get().editor.selectedObjectIds;
      if (ids.length === 0) return;
      get()._pushUndo();
      set((state) => {
        const scene = state.project?.scenes[sceneId];
        if (!scene) return;
        for (const id of ids) {
          delete scene.objects[id];
          // Delete children
          for (const [childId, child] of Object.entries(scene.objects)) {
            if (child.parentId === id) delete scene.objects[childId];
          }
        }
        state.editor.selectedObjectIds = [];
        state.project!.updatedAt = new Date().toISOString();
      });
    },

    duplicateSelected: (sceneId) => {
      const ids = get().editor.selectedObjectIds;
      if (ids.length === 0) return;
      get()._pushUndo();
      const newIds: string[] = [];
      set((state) => {
        const scene = state.project?.scenes[sceneId];
        if (!scene) return;
        for (const id of ids) {
          const original = scene.objects[id];
          if (!original) continue;
          const newId = uuid();
          newIds.push(newId);
          const clone: SceneObject = {
            ...JSON.parse(JSON.stringify(original)),
            id: newId,
            name: `${original.name} (copy)`,
            transform: {
              ...original.transform,
              position: { ...original.transform.position, x: original.transform.position.x + 1 },
            },
          };
          if (clone.growthStages) {
            for (const stage of clone.growthStages) {
              delete stage.userScale;
            delete stage.userRotation;
            }
          }
          scene.objects[newId] = clone;
        }
        state.editor.selectedObjectIds = newIds;
        state.project!.updatedAt = new Date().toISOString();
      });
    },

    setActiveScene: (sceneId) => {
      set((state) => {
        state.editor.activeSceneId = sceneId;
        state.editor.selectedObjectIds = [];
      });
    },

    setActiveTool: (tool) => {
      set((state) => {
        state.editor.activeTool = tool;
        if (tool !== 'place') {
          state.editor.placementType = null;
        }
      });
    },

    setPlacementType: (type) => {
      set((state) => {
        state.editor.placementType = type;
        if (type) {
          state.editor.activeTool = 'place';
        }
        // Reset placement settings when switching type
        state.editor.placementSettings = {};
      });
    },

    setPlacementSettings: (settings) => {
      set((state) => {
        state.editor.placementSettings = settings;
      });
    },

    setRenderMode: (mode) => {
      set((state) => {
        state.editor.renderMode = mode;
      });
    },

    focusOnSelected: () => {
      const { editor } = get();
      if (editor.isFocused) {
        set((state) => {
          state.editor.isFocused = false;
          state.editor.focusTargetId = '__unfocus__';
        });
        return;
      }
      const firstSelected = editor.selectedObjectIds[0];
      if (firstSelected) {
        set((state) => {
          state.editor.focusTargetId = firstSelected;
          state.editor.isFocused = true;
        });
      }
    },

    unfocus: () => {
      set((state) => {
        state.editor.isFocused = false;
        state.editor.focusTargetId = '__unfocus__';
      });
    },

    clearFocusTarget: () => {
      set((state) => {
        state.editor.focusTargetId = null;
      });
    },

    setViewMode: (mode) => {
      set((state) => {
        state.editor.viewMode = mode;
      });
    },

    togglePanel: (panel) => {
      set((state) => {
        state.editor[panel] = !state.editor[panel];
      });
    },

    // --- Context menu ---
    openContextMenu: (x, y, objectId) => {
      set((state) => {
        state.editor.contextMenu = { visible: true, x, y, objectId };
      });
    },

    closeContextMenu: () => {
      set((state) => {
        state.editor.contextMenu.visible = false;
      });
    },

    // --- Zone drawing ---
    startZoneDraw: (preset, opts) => {
      set((state) => {
        const defaults: Record<ZonePreset, { color: string; walkable: boolean; hasCollision: boolean }> = {
          walkable:  { color: '#22c55e', walkable: true,  hasCollision: false },
          collision: { color: '#ef4444', walkable: false, hasCollision: true  },
          custom:    { color: '#3b82f6', walkable: true,  hasCollision: false },
        };
        const d = defaults[preset];
        state.editor.zoneDraw = {
          active: true,
          preset,
          corner1: null,
          hoverPos: null,
          name: opts.name ?? '',
          height: opts.height ?? 2.5,
          color: opts.color ?? d.color,
          walkable: opts.walkable ?? d.walkable,
          hasCollision: opts.hasCollision ?? d.hasCollision,
        };
        state.editor.activeTool = 'place';
        state.editor.placementType = 'zone';
      });
    },

    setZoneDrawHover: (pos) => {
      set((state) => {
        state.editor.zoneDraw.hoverPos = pos;
      });
    },

    setZoneDrawCorner1: (pos) => {
      set((state) => {
        state.editor.zoneDraw.corner1 = pos;
      });
    },

    finishZoneDraw: () => {
      const { editor } = get();
      const zd = editor.zoneDraw;
      if (!zd.corner1 || !zd.hoverPos || !editor.activeSceneId) return;

      const x1 = zd.corner1.x, z1 = zd.corner1.z;
      const x2 = zd.hoverPos.x, z2 = zd.hoverPos.z;
      const cx = (x1 + x2) / 2;
      const cz = (z1 + z2) / 2;
      const sx = Math.abs(x2 - x1) || 1;
      const sz = Math.abs(z2 - z1) || 1;

      const r = parseInt(zd.color.slice(1, 3), 16) / 255;
      const g = parseInt(zd.color.slice(3, 5), 16) / 255;
      const b = parseInt(zd.color.slice(5, 7), 16) / 255;

      const sceneId = editor.activeSceneId;
      const zoneCount = Object.keys(get().project?.scenes[sceneId]?.zones ?? {}).length;
      const zoneName = zd.name || `Zone ${zoneCount + 1}`;

      get().addZone(sceneId, {
        name: zoneName,
        shape: 'box',
        points: [{ x: cx, y: 0, z: cz }],
        size: { x: sx, y: zd.height, z: sz },
        walkable: zd.walkable,
        hasCollision: zd.hasCollision,
        label: zoneName,
        color: { r, g, b, a: 0.15 },
      });

      // Reset draw state but keep active for another draw
      set((state) => {
        state.editor.zoneDraw.corner1 = null;
        state.editor.zoneDraw.hoverPos = null;
      });
    },

    cancelZoneDraw: () => {
      set((state) => {
        state.editor.zoneDraw = {
          active: false, preset: 'walkable', corner1: null, hoverPos: null,
          name: '', height: 2.5, color: '#22c55e', walkable: true, hasCollision: false,
        };
      });
    },

    updateZoneDraw: (updates) => {
      set((state) => {
        Object.assign(state.editor.zoneDraw, updates);
      });
    },

    // --- Growth staging ---
    setActiveGrowthYear: (year) => {
      set((state) => {
        state.editor.activeGrowthYear = year;
        if (state.project && state.editor.activeSceneId) {
          const scene = state.project.scenes[state.editor.activeSceneId];
          if (scene) {
            for (const obj of Object.values(scene.objects)) {
              if (obj.growthStages && obj.growthStages.length > 0 && year !== null) {
                let bestIdx = 0;
                for (let i = 0; i < obj.growthStages.length; i++) {
                  if (obj.growthStages[i].year <= year) bestIdx = i;
                }
                obj.activeStageIndex = bestIdx;
                // Restore per-stage scale + rotation; position stays untouched
                const stage = obj.growthStages[bestIdx];
                if (stage.userScale) {
                  obj.transform.scale = { ...stage.userScale };
                } else {
                  obj.transform.scale = { x: stage.scale[0], y: stage.scale[1], z: stage.scale[2] };
                }
                if (stage.userRotation) {
                  obj.transform.rotation = { ...stage.userRotation };
                }
              }
            }
          }
        }
      });
    },

    setObjectGrowthStages: (sceneId, objectId, stages) => {
      get()._pushUndo();
      set((state) => {
        const obj = state.project?.scenes[sceneId]?.objects[objectId];
        if (!obj) return;
        obj.growthStages = stages;
        obj.activeStageIndex = 0;
        state.project!.updatedAt = new Date().toISOString();
      });
    },

    setObjectActiveStage: (sceneId, objectId, stageIndex) => {
      set((state) => {
        const obj = state.project?.scenes[sceneId]?.objects[objectId];
        if (!obj || !obj.growthStages) return;
        if (stageIndex >= 0 && stageIndex < obj.growthStages.length) {
          obj.activeStageIndex = stageIndex;
          // Restore per-stage scale + rotation; position stays untouched
          const stage = obj.growthStages[stageIndex];
          if (stage.userScale) {
            obj.transform.scale = { ...stage.userScale };
          } else {
            obj.transform.scale = { x: stage.scale[0], y: stage.scale[1], z: stage.scale[2] };
          }
          if (stage.userRotation) {
            obj.transform.rotation = { ...stage.userRotation };
          }
        }
      });
    },

    // --- Reference overlays ---
    addReferenceOverlay: (sceneId, overlay) => {
      const id = uuid();
      get()._pushUndo();
      set((state) => {
        const scene = state.project?.scenes[sceneId];
        if (!scene) return;
        if (!scene.referenceOverlays) scene.referenceOverlays = {};
        scene.referenceOverlays[id] = { ...overlay, id };
        state.project!.updatedAt = new Date().toISOString();
      });
      return id;
    },

    updateReferenceOverlay: (sceneId, overlayId, updates) => {
      get()._pushUndo();
      set((state) => {
        const overlay = state.project?.scenes[sceneId]?.referenceOverlays?.[overlayId];
        if (overlay) Object.assign(overlay, updates);
      });
    },

    deleteReferenceOverlay: (sceneId, overlayId) => {
      get()._pushUndo();
      set((state) => {
        const scene = state.project?.scenes[sceneId];
        if (scene?.referenceOverlays) {
          delete scene.referenceOverlays[overlayId];
        }
      });
    },

    setValidationReport: (report) => {
      set((state) => {
        state.validationReport = report;
      });
    },

    goHome: () => {
      set((state) => {
        state.project = null;
        state.editor = { ...defaultEditorState };
        state.validationReport = null;
        state._undoStack = [];
        state._redoStack = [];
      });
    },

    loadProject: (project) => {
      set((state) => {
        state.project = project;
        state.editor = {
          ...defaultEditorState,
          activeSceneId: Object.keys(project.scenes)[0] ?? null,
        };
        state.validationReport = null;
        state._undoStack = [];
        state._redoStack = [];
      });
    },
  }))
);

// Auto-save project to localStorage on every change
useProjectStore.subscribe((state) => {
  saveProject(state.project);
});
