/**
 * Bicep Curl Counter - Uses exact Python logic from bicepCurlCounter.py
 * 
 * This module wraps the repCounter.ts logic to maintain compatibility
 * with the existing hook interface while using the exact Python algorithm.
 */

import { countBicepCurl, initRepCounterState, RepCounterState } from './repCounter';

/**
 * MediaPipe Pose landmark indices for bicep curls
 * 12: Right shoulder
 * 14: Right elbow
 * 16: Right wrist
 * 
 * Interface maintained for compatibility with existing hooks
 */
export interface CurlState {
  count: number;
  stage: 'up' | 'down'; // Maps to dir: 0='up', 1='down'
  armPercentage: number;
}

/**
 * Internal state adapter - converts between RepCounterState and CurlState
 */
function adaptState(repState: RepCounterState): CurlState {
  return {
    count: repState.count,
    stage: repState.dir === 0 ? 'up' : 'down', // dir 0 = up, dir 1 = down
    armPercentage: repState.percentage,
  };
}

/**
 * Count bicep curl repetitions based on arm angle
 * Uses exact Python logic from bicepCurlCounter.py
 * 
 * @param landmarks MediaPipe pose landmarks array
 * @param currentState Current state (count, stage, etc.)
 * @returns Updated state with new count and stage
 */
export function countCurl(
  landmarks: Array<{ x: number; y: number; z?: number; visibility?: number }> | null,
  currentState: CurlState
): CurlState {
  // Convert CurlState to RepCounterState (internal format)
  const repState: RepCounterState = {
    count: currentState.count,
    dir: currentState.stage === 'up' ? 0 : 1, // up = 0, down = 1
    percentage: currentState.armPercentage,
    angle: 0,
  };

  // Use exact Python logic
  const updatedRepState = countBicepCurl(landmarks, repState);

  // Convert back to CurlState for compatibility
  return adaptState(updatedRepState);
}

/**
 * Initialize bicep curl counter state
 */
export function initCurlState(): CurlState {
  const repState = initRepCounterState();
  return adaptState(repState);
}

