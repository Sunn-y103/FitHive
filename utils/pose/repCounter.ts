/**
 * Rep Counter - Exact match with Python bicepCurlCounter.py logic
 * 
 * Python state machine:
 * - dir = 0: going up (initial state)
 * - dir = 1: going down
 * - When per == 100 and dir == 0: count += 0.5, dir = 1
 * - When per == 0 and dir == 1: count += 0.5, dir = 0
 */

import { findAngle, interpolate } from './angleUtil';

/**
 * Rep counter state (matches Python exactly)
 */
export interface RepCounterState {
  count: number;
  dir: 0 | 1; // 0 = going up, 1 = going down (matches Python)
  percentage: number;
  angle: number;
}

/**
 * Bicep curl rep counter - exact Python logic
 * 
 * Python thresholds:
 * - Angle interpolation: (22, 170) -> (0, 100)
 * - Landmarks: wrist(16), elbow(14), shoulder(12)
 * 
 * @param landmarks MediaPipe pose landmarks
 * @param currentState Current rep counter state
 * @returns Updated state
 */
export function countBicepCurl(
  landmarks: Array<{ x: number; y: number; z?: number; visibility?: number }> | null,
  currentState: RepCounterState
): RepCounterState {
  if (!landmarks || landmarks.length < 17) {
    return currentState;
  }

  // Extract landmarks (right arm)
  // Python: wrist(16), elbow(14), shoulder(12)
  const wrist = landmarks[16];
  const elbow = landmarks[14];
  const shoulder = landmarks[12];

  // Check visibility if available
  if (
    (wrist.visibility !== undefined && wrist.visibility < 0.5) ||
    (elbow.visibility !== undefined && elbow.visibility < 0.5) ||
    (shoulder.visibility !== undefined && shoulder.visibility < 0.5)
  ) {
    return currentState;
  }

  // Convert to [x, y] format for angle calculation
  const p1: [number, number] = [wrist.x, wrist.y];
  const p2: [number, number] = [elbow.x, elbow.y];
  const p3: [number, number] = [shoulder.x, shoulder.y];

  // Calculate angle (matches Python findAngle)
  const angle = findAngle(p1, p2, p3);

  // Interpolate angle to percentage (matches Python exactly)
  // Python: per = np.interp(angle, (22, 170), (0, 100))
  // This means: angle 22 -> 0%, angle 170 -> 100%
  const per = Math.round(interpolate(angle, [22, 170], [0, 100]));

  // Clamp percentage to 0-100
  const clampedPer = Math.max(0, Math.min(100, per));

  let { count, dir } = currentState;
  let newDir: 0 | 1 = dir;

  // Rep counting logic (EXACT Python match)
  // Python:
  // if per == 100:
  //     if dir == 0:
  //         curl_count += 0.5
  //         dir = 1
  if (clampedPer === 100) {
    if (dir === 0) {
      count += 0.5;
      newDir = 1;
    }
  }

  // Python:
  // if per == 0:
  //     if dir == 1:
  //         curl_count += 0.5
  //         dir = 0
  if (clampedPer === 0) {
    if (dir === 1) {
      count += 0.5;
      newDir = 0;
    }
  }

  return {
    count,
    dir: newDir,
    percentage: clampedPer,
    angle,
  };
}

/**
 * Initialize rep counter state (matches Python)
 */
export function initRepCounterState(): RepCounterState {
  return {
    count: 0,
    dir: 0, // Start going up (matches Python)
    percentage: 0,
    angle: 0,
  };
}

/**
 * Get bar value for visualization (matches Python)
 * Python: bar_val = np.interp(angle, (22, 170), (300, 60))
 * 
 * @param angle Current angle
 * @param barHeight Total bar height
 * @returns Bar position value
 */
export function getBarValue(angle: number, barHeight: number = 300): number {
  // Python: bar_val = np.interp(angle, (22, 170), (300, 60))
  return Math.round(interpolate(angle, [22, 170], [barHeight, 60]));
}

