/**
 * Publish Service
 * Orchestrates preflight validation, packaging, and deployment.
 * Maps to PRD section 2.6.
 */

import type { Project, PublishConfig, ValidationReport } from '@/types';
import { validateScene, hasBlockers, getReadinessBand } from './validation';
import { encodeSceneToHash } from '@/components/viewer/SceneViewer';

export interface PublishResult {
  success: boolean;
  shareUrl?: string;
  report: ValidationReport;
  error?: string;
}

/** Run preflight checks on all scenes in the project */
export function runPreflight(project: Project): ValidationReport {
  const allReports: ValidationReport[] = [];

  for (const sceneId of Object.keys(project.scenes)) {
    allReports.push(validateScene(project, sceneId));
  }

  // Merge reports
  const mergedMessages = allReports.flatMap((r) => r.messages);
  const mergedPassed = allReports.flatMap((r) => r.passedRules);
  const avgScore =
    allReports.length > 0
      ? Math.round(allReports.reduce((sum, r) => sum + r.score, 0) / allReports.length)
      : 0;

  return {
    score: avgScore,
    messages: mergedMessages,
    passedRules: [...new Set(mergedPassed)],
    timestamp: new Date().toISOString(),
  };
}

/** Attempt to publish the project */
export async function publishProject(project: Project): Promise<PublishResult> {
  // Step 1: Preflight validation
  const report = runPreflight(project);

  if (hasBlockers(report)) {
    return {
      success: false,
      report,
      error: `Publish blocked: ${report.messages.filter((m) => m.severity === 'blocker').length} critical issue(s) must be resolved.`,
    };
  }

  const band = getReadinessBand(report.score);
  if (band === 'not-publishable') {
    return {
      success: false,
      report,
      error: 'Project readiness score is below the publish threshold (70). Please resolve warnings.',
    };
  }

  // Step 2: Package — encode scene data into shareable URL
  const scene = Object.values(project.scenes)[0];
  if (!scene) {
    return { success: false, report, error: 'No scene found to publish.' };
  }

  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  const shareUrl = encodeSceneToHash(scene, baseUrl);

  return {
    success: true,
    shareUrl,
    report,
  };
}

/** Get a summary of the publish config state */
export function getPublishSummary(config: PublishConfig): string {
  const parts = [
    `Status: ${config.status}`,
    config.vrEnabled ? 'VR enabled' : 'VR disabled',
    config.mobileEnabled ? 'Mobile enabled' : 'Mobile disabled',
    `Performance: ${config.performanceProfile}`,
  ];
  if (config.shareUrl) parts.push(`URL: ${config.shareUrl}`);
  if (config.lastPublishedAt) parts.push(`Last published: ${config.lastPublishedAt}`);
  return parts.join(' | ');
}
