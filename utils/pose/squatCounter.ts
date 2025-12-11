import { calculateAngle, interpolate } from './calculateAngle';

/**
 * MediaPipe Pose landmark indices for squats
 * 24: Right hip
 * 26: Right knee
 * 28: Right ankle
 */
export interface SquatState {
  count: number;
  stage: 'up' | 'down';
  legPercentage: number;
}

/**
 * Count squat repetitions based on leg angle
 * 
 * @param landmarks MediaPipe pose landmarks array
 * @param currentState Current state (count, stage, etc.)
 * @returns Updated state with new count and stage
 */
export function countSquat(
  landmarks: Array<{ x: number; y: number; z?: number; visibility?: number }> | null,
  currentState: SquatState
): SquatState {
  if (!landmarks || landmarks.length < 29) {
    return currentState;
  }

  // Extract relevant landmarks
  // Right leg: 24 (hip) - 26 (knee) - 28 (ankle)
  const rightHip = landmarks[24];
  const rightKnee = landmarks[26];
  const rightAnkle = landmarks[28];

  // Check visibility (if available)
  if (
    (rightHip.visibility !== undefined && rightHip.visibility < 0.5) ||
    (rightKnee.visibility !== undefined && rightKnee.visibility < 0.5) ||
    (rightAnkle.visibility !== undefined && rightAnkle.visibility < 0.5)
  ) {
    return currentState;
  }

  // Calculate angle
  const angle = calculateAngle(rightHip, rightKnee, rightAnkle);

  // Interpolate to percentage (100-170 degrees -> 100-0%)
  // Based on Python: np.interp(angle, (100, 170), (100, 0))
  const percentage = Math.round(interpolate(angle, [100, 170], [100, 0]));

  // Clamp percentage to 0-100
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  let { count, stage } = currentState;
  let newStage = stage;

  // Rep counting logic (based on Python code)
  // 100% (down position) -> going down
  // 0% (up position) -> going up
  if (clampedPercentage === 100) {
    if (stage === 'up') {
      // Completed going down, now going up
      newStage = 'down';
      count += 0.5;
    }
  } else if (clampedPercentage === 0) {
    if (stage === 'down') {
      // Completed going up, now going down
      newStage = 'up';
      count += 0.5;
    }
  }

  return {
    count,
    stage: newStage,
    legPercentage: clampedPercentage,
  };
}

/**
 * Initialize squat counter state
 */
export function initSquatState(): SquatState {
  return {
    count: 0,
    stage: 'up',
    legPercentage: 0,
  };
}

