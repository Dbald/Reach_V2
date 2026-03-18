import { v4 as uuid } from 'uuid';
import type {
  Transform,
  Vector3,
  Quaternion,
  Color,
  EnvironmentConfig,
  ProjectSettings,
  Scene,
  Viewpoint,
  PublishConfig,
  Project,
  TemplateType,
} from '@/types';

export const vec3 = (x = 0, y = 0, z = 0): Vector3 => ({ x, y, z });
export const quat = (x = 0, y = 0, z = 0, w = 1): Quaternion => ({ x, y, z, w });
export const color = (r = 1, g = 1, b = 1, a = 1): Color => ({ r, g, b, a });

export const defaultTransform = (): Transform => ({
  position: vec3(),
  rotation: quat(),
  scale: vec3(1, 1, 1),
});

export const defaultEnvironment = (): EnvironmentConfig => ({
  ambientLightColor: color(1, 1, 1),
  ambientLightIntensity: 0.6,
  fogEnabled: false,
  groundPlane: true,
  groundColor: color(0.85, 0.9, 0.82),
  groundSize: vec3(50, 0.1, 50),
});

export const defaultProjectSettings = (): ProjectSettings => ({
  units: 'meters',
  gridSize: 1,
  snapToGrid: true,
  showGrid: true,
  showAxes: false,
});

export const defaultViewpoint = (isEntry = false): Viewpoint => ({
  id: uuid(),
  name: isEntry ? 'Entry Camera' : 'Viewpoint',
  transform: {
    position: vec3(0, 1.6, 5),
    rotation: quat(),
    scale: vec3(1, 1, 1),
  },
  isEntry,
  fov: 60,
});

export const defaultScene = (name = 'Main Scene'): Scene => {
  const entryViewpoint = defaultViewpoint(true);
  return {
    id: uuid(),
    name,
    environment: defaultEnvironment(),
    objects: {},
    zones: {},
    viewpoints: { [entryViewpoint.id]: entryViewpoint },
    navigationLinks: [],
    interactions: [],
  };
};

export const defaultPublishConfig = (entrySceneId: string): PublishConfig => ({
  entrySceneId,
  status: 'draft',
  performanceProfile: 'medium',
  vrEnabled: true,
  mobileEnabled: true,
});

export const createProject = (
  name: string,
  templateType: TemplateType,
  ownerId = 'local-user'
): Project => {
  const scene = defaultScene();
  const now = new Date().toISOString();
  return {
    id: uuid(),
    name,
    description: '',
    templateType,
    ownerId,
    scenes: { [scene.id]: scene },
    assets: {},
    publishConfig: defaultPublishConfig(scene.id),
    settings: defaultProjectSettings(),
    createdAt: now,
    updatedAt: now,
  };
};
