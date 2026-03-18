import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuid } from 'uuid';
import type {
  Project,
  Scene,
  SceneObject,
  SceneObjectType,
  Zone,
  AssetReference,
  TemplateType,
  Transform,
  MaterialConfig,
  ValidationReport,
} from '@/types';
import { createProject, defaultTransform } from '@/utils/defaults';

interface EditorState {
  selectedObjectId: string | null;
  activeSceneId: string | null;
  activeTool: 'select' | 'move' | 'rotate' | 'scale' | 'place' | 'zone';
  viewMode: 'editor' | 'preview' | 'vr';
  showGrid: boolean;
  showHierarchy: boolean;
  showInspector: boolean;
  showAssetTray: boolean;
}

interface ProjectStore {
  // State
  project: Project | null;
  editor: EditorState;
  validationReport: ValidationReport | null;

  // Project actions
  createNewProject: (name: string, template: TemplateType) => void;
  updateProjectName: (name: string) => void;

  // Scene object actions
  addObject: (sceneId: string, type: SceneObjectType, props?: Partial<SceneObject>) => string;
  updateObject: (sceneId: string, objectId: string, updates: Partial<SceneObject>) => void;
  deleteObject: (sceneId: string, objectId: string) => void;
  duplicateObject: (sceneId: string, objectId: string) => string | null;
  setObjectTransform: (sceneId: string, objectId: string, transform: Transform) => void;
  setObjectMaterial: (sceneId: string, objectId: string, material: MaterialConfig) => void;

  // Zone actions
  addZone: (sceneId: string, zone: Omit<Zone, 'id'>) => string;
  updateZone: (sceneId: string, zoneId: string, updates: Partial<Zone>) => void;
  deleteZone: (sceneId: string, zoneId: string) => void;

  // Asset actions
  addAsset: (asset: AssetReference) => void;
  updateAsset: (assetId: string, updates: Partial<AssetReference>) => void;
  removeAsset: (assetId: string) => void;

  // Editor actions
  selectObject: (objectId: string | null) => void;
  setActiveScene: (sceneId: string) => void;
  setActiveTool: (tool: EditorState['activeTool']) => void;
  setViewMode: (mode: EditorState['viewMode']) => void;
  togglePanel: (panel: 'showHierarchy' | 'showInspector' | 'showAssetTray') => void;

  // Validation
  setValidationReport: (report: ValidationReport | null) => void;
}

const defaultEditorState: EditorState = {
  selectedObjectId: null,
  activeSceneId: null,
  activeTool: 'select',
  viewMode: 'editor',
  showGrid: true,
  showHierarchy: true,
  showInspector: true,
  showAssetTray: true,
};

export const useProjectStore = create<ProjectStore>()(
  immer((set) => ({
    project: null,
    editor: defaultEditorState,
    validationReport: null,

    createNewProject: (name, template) => {
      set((state) => {
        const project = createProject(name, template);
        state.project = project;
        const firstSceneId = Object.keys(project.scenes)[0];
        state.editor.activeSceneId = firstSceneId;
        state.editor.selectedObjectId = null;
        state.validationReport = null;
      });
    },

    updateProjectName: (name) => {
      set((state) => {
        if (state.project) {
          state.project.name = name;
          state.project.updatedAt = new Date().toISOString();
        }
      });
    },

    addObject: (sceneId, type, props) => {
      const id = uuid();
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
        };
        scene.objects[id] = obj;
        state.project!.updatedAt = new Date().toISOString();
      });
      return id;
    },

    updateObject: (sceneId, objectId, updates) => {
      set((state) => {
        const obj = state.project?.scenes[sceneId]?.objects[objectId];
        if (!obj) return;
        Object.assign(obj, updates);
        state.project!.updatedAt = new Date().toISOString();
      });
    },

    deleteObject: (sceneId, objectId) => {
      set((state) => {
        const scene = state.project?.scenes[sceneId];
        if (!scene) return;
        delete scene.objects[objectId];
        // Remove children
        for (const [id, obj] of Object.entries(scene.objects)) {
          if (obj.parentId === objectId) {
            delete scene.objects[id];
          }
        }
        if (state.editor.selectedObjectId === objectId) {
          state.editor.selectedObjectId = null;
        }
        state.project!.updatedAt = new Date().toISOString();
      });
    },

    duplicateObject: (sceneId, objectId) => {
      let newId: string | null = null;
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
        scene.objects[newId] = clone;
        state.project!.updatedAt = new Date().toISOString();
      });
      return newId;
    },

    setObjectTransform: (sceneId, objectId, transform) => {
      set((state) => {
        const obj = state.project?.scenes[sceneId]?.objects[objectId];
        if (obj) obj.transform = transform;
      });
    },

    setObjectMaterial: (sceneId, objectId, material) => {
      set((state) => {
        const obj = state.project?.scenes[sceneId]?.objects[objectId];
        if (obj) obj.material = material;
      });
    },

    addZone: (sceneId, zone) => {
      const id = uuid();
      set((state) => {
        const scene = state.project?.scenes[sceneId];
        if (!scene) return;
        scene.zones[id] = { ...zone, id };
        state.project!.updatedAt = new Date().toISOString();
      });
      return id;
    },

    updateZone: (sceneId, zoneId, updates) => {
      set((state) => {
        const zone = state.project?.scenes[sceneId]?.zones[zoneId];
        if (zone) Object.assign(zone, updates);
      });
    },

    deleteZone: (sceneId, zoneId) => {
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

    selectObject: (objectId) => {
      set((state) => {
        state.editor.selectedObjectId = objectId;
      });
    },

    setActiveScene: (sceneId) => {
      set((state) => {
        state.editor.activeSceneId = sceneId;
        state.editor.selectedObjectId = null;
      });
    },

    setActiveTool: (tool) => {
      set((state) => {
        state.editor.activeTool = tool;
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

    setValidationReport: (report) => {
      set((state) => {
        state.validationReport = report;
      });
    },
  }))
);
