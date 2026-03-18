/**
 * Validation / AI QC Service
 * Implements the quality-control rules from PRD section 3.
 * Runs at import, preview, and publish gates.
 */

import { v4 as uuid } from 'uuid';
import type {
  Project,
  Scene,
  ValidationMessage,
  ValidationReport,
  ValidationSeverity,
} from '@/types';
import { getEntryViewpoint, getWalkableZones, getSceneBounds } from './sceneGraph';

type RuleCheck = (project: Project, scene: Scene) => ValidationMessage[];

function msg(
  ruleId: string,
  severity: ValidationSeverity,
  message: string,
  fix?: string,
  objectId?: string
): ValidationMessage {
  return { id: uuid(), ruleId, severity, message, fix, objectId };
}

// --- Individual QC Rules ---

/** QC-02: Asset completeness - check referenced assets are valid */
const checkAssetCompleteness: RuleCheck = (project, scene) => {
  const messages: ValidationMessage[] = [];
  for (const obj of Object.values(scene.objects)) {
    if (obj.assetId) {
      const asset = project.assets[obj.assetId];
      if (!asset) {
        messages.push(
          msg('QC-02', 'blocker', `Object "${obj.name}" references missing asset.`, 'Re-import the asset or remove the object.', obj.id)
        );
      } else if (asset.status === 'error') {
        messages.push(
          msg('QC-02', 'blocker', `Object "${obj.name}" uses an asset that failed processing.`, 'Replace the asset with a valid file.', obj.id)
        );
      }
    }
  }
  return messages;
};

/** QC-03: Scene parity risk - check editor/publish compatibility */
const checkSceneParity: RuleCheck = (project, scene) => {
  const messages: ValidationMessage[] = [];
  for (const obj of Object.values(scene.objects)) {
    if (obj.material?.transparent && obj.material.opacity === 0) {
      messages.push(
        msg('QC-03', 'warning', `Object "${obj.name}" is fully transparent and will be invisible when published.`, 'Set opacity above 0 or remove the object.', obj.id)
      );
    }
  }
  return messages;
};

/** QC-04: Transition integrity - check navigation links resolve */
const checkTransitionIntegrity: RuleCheck = (project, scene) => {
  const messages: ValidationMessage[] = [];
  for (const link of scene.navigationLinks) {
    if (!project.scenes[link.toSceneId]) {
      messages.push(
        msg('QC-04', 'blocker', `Navigation link "${link.label ?? link.id}" points to a missing scene.`, 'Remove the broken navigation link or recreate the target scene.')
      );
    }
    if (link.triggerObjectId && !scene.objects[link.triggerObjectId]) {
      messages.push(
        msg('QC-04', 'warning', `Navigation link "${link.label ?? link.id}" trigger object is missing.`, 'Reassign the trigger to an existing object.')
      );
    }
  }
  return messages;
};

/** QC-05: Walkability and collision */
const checkWalkability: RuleCheck = (_project, scene) => {
  const messages: ValidationMessage[] = [];
  const walkableZones = getWalkableZones(scene);
  if (Object.keys(scene.objects).length > 0 && walkableZones.length === 0) {
    messages.push(
      msg('QC-05', 'warning', 'No walkable zones defined. VR users will not be able to move through the scene.', 'Add at least one walkable zone to enable VR navigation.')
    );
  }
  return messages;
};

/** QC-06: Scale sanity */
const checkScaleSanity: RuleCheck = (_project, scene) => {
  const messages: ValidationMessage[] = [];
  for (const obj of Object.values(scene.objects)) {
    const s = obj.transform.scale;
    const maxDim = Math.max(Math.abs(s.x), Math.abs(s.y), Math.abs(s.z));
    const minDim = Math.min(Math.abs(s.x), Math.abs(s.y), Math.abs(s.z));
    if (maxDim > 100) {
      messages.push(
        msg('QC-06', 'warning', `Object "${obj.name}" has an unusually large scale (${maxDim.toFixed(1)}x).`, 'Check that the scale is intentional.', obj.id)
      );
    }
    if (minDim < 0.001 && minDim > 0) {
      messages.push(
        msg('QC-06', 'warning', `Object "${obj.name}" has a very small scale dimension (${minDim.toFixed(4)}x).`, 'This object may appear invisible. Increase its scale.', obj.id)
      );
    }
  }
  return messages;
};

/** QC-07: Performance budget */
const checkPerformanceBudget: RuleCheck = (_project, scene) => {
  const messages: ValidationMessage[] = [];
  const objectCount = Object.keys(scene.objects).length;
  if (objectCount > 500) {
    messages.push(
      msg('QC-07', 'blocker', `Scene has ${objectCount} objects, exceeding the 500 object limit.`, 'Remove or merge some objects to improve performance.')
    );
  } else if (objectCount > 300) {
    messages.push(
      msg('QC-07', 'warning', `Scene has ${objectCount} objects. Performance may be affected on lower-end devices.`, 'Consider reducing object count for mobile/VR users.')
    );
  }
  return messages;
};

/** QC-08: Empty-state quality */
const checkEmptyState: RuleCheck = (_project, scene) => {
  const messages: ValidationMessage[] = [];
  if (Object.keys(scene.objects).length === 0) {
    messages.push(
      msg('QC-08', 'warning', 'Scene has no objects. Consider adding content before publishing.', 'Add objects, materials, or zones to create a meaningful experience.')
    );
  }
  return messages;
};

/** QC-10: Share readiness */
const checkShareReadiness: RuleCheck = (_project, scene) => {
  const messages: ValidationMessage[] = [];
  const entry = getEntryViewpoint(scene);
  if (!entry) {
    messages.push(
      msg('QC-10', 'blocker', 'No entry camera defined. Visitors will not have a starting viewpoint.', 'Add an entry viewpoint to the scene.')
    );
  }

  const bounds = getSceneBounds(scene);
  if (entry) {
    const p = entry.transform.position;
    if (p.x < bounds.min.x - 50 || p.x > bounds.max.x + 50 ||
        p.z < bounds.min.z - 50 || p.z > bounds.max.z + 50) {
      messages.push(
        msg('QC-10', 'warning', 'Entry camera is far from scene content. Visitors may see an empty space initially.', 'Move the entry camera closer to your scene objects.')
      );
    }
  }
  return messages;
};

// --- Rule registry ---

const ALL_RULES: Array<{ id: string; check: RuleCheck }> = [
  { id: 'QC-02', check: checkAssetCompleteness },
  { id: 'QC-03', check: checkSceneParity },
  { id: 'QC-04', check: checkTransitionIntegrity },
  { id: 'QC-05', check: checkWalkability },
  { id: 'QC-06', check: checkScaleSanity },
  { id: 'QC-07', check: checkPerformanceBudget },
  { id: 'QC-08', check: checkEmptyState },
  { id: 'QC-10', check: checkShareReadiness },
];

/** Run all validation rules and produce a report */
export function validateScene(project: Project, sceneId: string): ValidationReport {
  const scene = project.scenes[sceneId];
  if (!scene) {
    return {
      score: 0,
      messages: [msg('SYSTEM', 'blocker', 'Scene not found.')],
      passedRules: [],
      timestamp: new Date().toISOString(),
    };
  }

  const allMessages: ValidationMessage[] = [];
  const passedRules: string[] = [];

  for (const rule of ALL_RULES) {
    const ruleMessages = rule.check(project, scene);
    if (ruleMessages.length === 0) {
      passedRules.push(rule.id);
    } else {
      allMessages.push(...ruleMessages);
    }
  }

  const score = computeScore(allMessages, ALL_RULES.length);

  return {
    score,
    messages: allMessages,
    passedRules,
    timestamp: new Date().toISOString(),
  };
}

/** Compute publish readiness score (0-100) per PRD section 3.4 */
function computeScore(messages: ValidationMessage[], totalRules: number): number {
  if (totalRules === 0) return 100;

  const blockerCount = messages.filter((m) => m.severity === 'blocker').length;
  const warningCount = messages.filter((m) => m.severity === 'warning').length;
  const suggestionCount = messages.filter((m) => m.severity === 'suggestion').length;

  // Blockers have heavy weight, warnings moderate, suggestions light
  const deductions = blockerCount * 20 + warningCount * 5 + suggestionCount * 1;
  return Math.max(0, Math.min(100, 100 - deductions));
}

/** Get the publish readiness band */
export function getReadinessBand(score: number): 'ready' | 'needs-fixes' | 'not-publishable' {
  if (score >= 90) return 'ready';
  if (score >= 70) return 'needs-fixes';
  return 'not-publishable';
}

/** Check if publish should be blocked */
export function hasBlockers(report: ValidationReport): boolean {
  return report.messages.some((m) => m.severity === 'blocker');
}
