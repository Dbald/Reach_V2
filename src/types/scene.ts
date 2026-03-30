/**
 * Canonical content model for Reach V2.
 * Maps to PRD section 2.4 - the durable scene schema that all layers reference.
 */

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Transform {
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

// --- Asset types ---

export type AssetFormat = 'glb' | 'gltf' | 'obj' | 'fbx' | 'png' | 'jpg' | 'hdr';

export type AssetStatus = 'uploading' | 'processing' | 'ready' | 'error';

export interface AssetReference {
  id: string;
  name: string;
  format: AssetFormat;
  url: string;
  thumbnailUrl?: string;
  fileSizeBytes: number;
  status: AssetStatus;
  metadata: Record<string, unknown>;
  validationErrors: ValidationMessage[];
  createdAt: string;
  updatedAt: string;
}

// --- Growth staging ---

export interface GrowthStage {
  year: number;
  label: string;
  shape?: 'box' | 'sphere' | 'cylinder' | 'plane';
  scale: [number, number, number];
  color?: string;
  yOffset?: number;
  /** Direct GLB model URL for this stage */
  modelUrl?: string;
  /** Reference to an asset in the project's asset library */
  assetId?: string;
  /** Optional metadata displayed on the label */
  info?: Record<string, string>;
  /** User-adjusted scale for this stage (overrides default scale) */
  userScale?: { x: number; y: number; z: number };
  /** User-adjusted rotation for this stage */
  userRotation?: { x: number; y: number; z: number; w: number };
}

// --- Scene objects ---

export type SceneObjectType =
  | 'mesh'
  | 'group'
  | 'light'
  | 'camera'
  | 'zone'
  | 'boundary'
  | 'label'
  | 'navpoint'
  | 'video'
  | 'audio'
  | 'text';

export interface MaterialConfig {
  color?: Color;
  textureAssetId?: string;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  transparent?: boolean;
}

export interface SceneObject {
  id: string;
  name: string;
  type: SceneObjectType;
  parentId: string | null;
  transform: Transform;
  assetId?: string;
  material?: MaterialConfig;
  tags: string[];
  metadata: Record<string, unknown>;
  visible: boolean;
  locked: boolean;
  /** Growth stages for time-based visualization (e.g., trees over years) */
  growthStages?: GrowthStage[];
  /** Index of the currently active growth stage */
  activeStageIndex?: number;
}

// --- Zones and boundaries ---

export type ZoneShape = 'box' | 'polygon' | 'circle';

export interface Zone {
  id: string;
  name: string;
  shape: ZoneShape;
  points: Vector3[];
  size: Vector3;
  walkable: boolean;
  hasCollision: boolean;
  label?: string;
  color?: Color;
}

// --- Camera / viewpoints ---

export interface Viewpoint {
  id: string;
  name: string;
  transform: Transform;
  isEntry: boolean;
  fov: number;
}

// --- Navigation ---

export interface NavigationLink {
  id: string;
  fromSceneId: string;
  toSceneId: string;
  triggerObjectId?: string;
  label?: string;
}

// --- Interaction blocks (future-ready) ---

export type InteractionTrigger = 'click' | 'gaze' | 'proximity' | 'collide';
export type InteractionAction = 'navigate' | 'toggle' | 'animate' | 'showInfo';

export interface InteractionBlock {
  id: string;
  trigger: InteractionTrigger;
  action: InteractionAction;
  targetObjectId: string;
  params: Record<string, unknown>;
  enabled: boolean;
}

// --- Environment ---

export type GroundMaterial = 'grass' | 'stone' | 'concrete' | 'gravel' | 'wood-deck' | 'pavers' | 'mulch' | 'sand' | 'dirt' | 'custom';

export interface EnvironmentConfig {
  skybox?: string;
  ambientLightColor: Color;
  ambientLightIntensity: number;
  fogEnabled: boolean;
  fogColor?: Color;
  fogNear?: number;
  fogFar?: number;
  groundPlane: boolean;
  groundColor?: Color;
  groundSize?: Vector3;
  groundMaterial?: GroundMaterial;
}

// --- Scene ---

export interface Scene {
  id: string;
  name: string;
  environment: EnvironmentConfig;
  objects: Record<string, SceneObject>;
  zones: Record<string, Zone>;
  viewpoints: Record<string, Viewpoint>;
  navigationLinks: NavigationLink[];
  interactions: InteractionBlock[];
}

// --- Publish config ---

export type PublishStatus = 'draft' | 'preflight' | 'publishing' | 'published' | 'failed';

export interface PublishConfig {
  entrySceneId: string;
  entryViewpointId?: string;
  shareUrl?: string;
  status: PublishStatus;
  performanceProfile: 'low' | 'medium' | 'high';
  vrEnabled: boolean;
  mobileEnabled: boolean;
  lastPublishedAt?: string;
}

// --- Project (top-level container) ---

export type TemplateType =
  | 'yard-plan'
  | 'garden-layout'
  | 'event-space'
  | 'room-layout'
  | 'blank';

export interface Project {
  id: string;
  name: string;
  description: string;
  templateType: TemplateType;
  ownerId: string;
  scenes: Record<string, Scene>;
  assets: Record<string, AssetReference>;
  publishConfig: PublishConfig;
  settings: ProjectSettings;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSettings {
  units: 'meters' | 'feet';
  gridSize: number;
  snapToGrid: boolean;
  showGrid: boolean;
  showAxes: boolean;
}

// --- Validation ---

export type ValidationSeverity = 'blocker' | 'warning' | 'suggestion';

export interface ValidationMessage {
  id: string;
  ruleId: string;
  severity: ValidationSeverity;
  message: string;
  fix?: string;
  objectId?: string;
  assetId?: string;
}

export interface ValidationReport {
  score: number;
  messages: ValidationMessage[];
  passedRules: string[];
  timestamp: string;
}
