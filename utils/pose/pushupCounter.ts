import { calculateAngle, interpolate } from './calculateAngle';

/**
 * MediaPipe Pose landmark indices for push-ups
 * 11: Left shoulder
 * 12: Right shoulder
 * 13: Left elbow
 * 14: Right elbow
 * 15: Left wrist
 * 16: Right wrist
 */
export interface PushUpState {
  count: number;
  stage: 'up' | 'down';
  leftArmPercentage: number;
  rightArmPercentage: number;
}

/**
 * Count push-up repetitions based on arm angles
 * 
 * @param landmarks MediaPipe pose landmarks array
 * @param currentState Current state (count, stage, etc.)
 * @returns Updated state with new count and stage
 */
export function countPushUp(
  landmarks: Array<{ x: number; y: number; z?: number; visibility?: number }> | null,
  currentState: PushUpState
): PushUpState {
  if (!landmarks || landmarks.length < 17) {
    return currentState;
  }

  // Extract relevant landmarks
  // Right arm: 12 (shoulder) - 14 (elbow) - 16 (wrist)
  // Left arm: 15 (wrist) - 13 (elbow) - 11 (shoulder)
  const rightShoulder = landmarks[12];
  const rightElbow = landmarks[14];
  const rightWrist = landmarks[16];
  
  const leftShoulder = landmarks[11];
  const leftElbow = landmarks[13];
  const leftWrist = landmarks[15];

  // Check visibility (if available)
  if (
    (rightShoulder.visibility !== undefined && rightShoulder.visibility < 0.5) ||
    (rightElbow.visibility !== undefined && rightElbow.visibility < 0.5) ||
    (rightWrist.visibility !== undefined && rightWrist.visibility < 0.5) ||
    (leftShoulder.visibility !== undefined && leftShoulder.visibility < 0.5) ||
    (leftElbow.visibility !== undefined && leftElbow.visibility < 0.5) ||
    (leftWrist.visibility !== undefined && leftWrist.visibility < 0.5)
  ) {
    return currentState;
  }

  // Calculate angles
  const rightAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
  const leftAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);

  // Interpolate to percentage (80-175 degrees -> 100-0%)
  // Based on Python: np.interp(angle, (80, 175), (100, 0))
  const rightPercentage = Math.round(interpolate(rightAngle, [80, 175], [100, 0]));
  const leftPercentage = Math.round(interpolate(leftAngle, [80, 175], [100, 0]));

  // Clamp percentage to 0-100
  const clampedRight = Math.max(0, Math.min(100, rightPercentage));
  const clampedLeft = Math.max(0, Math.min(100, leftPercentage));

  let { count, stage } = currentState;
  let newStage = stage;

  // Rep counting logic (based on Python code)
  // Both arms at 100% (down position) -> going down
  // Both arms at 0% (up position) -> going up
  if (clampedRight === 100 && clampedLeft === 100) {
    if (stage === 'up') {
      // Completed going down, now going up
      newStage = 'down';
      count += 0.5;
    }
  } else if (clampedRight === 0 && clampedLeft === 0) {
    if (stage === 'down') {
      // Completed going up, now going down
      newStage = 'up';
      count += 0.5;
    }
  }

  return {
    count,
    stage: newStage,
    leftArmPercentage: clampedLeft,
    rightArmPercentage: clampedRight,
  };
}

/**
 * Initialize push-up counter state
 */
export function initPushUpState(): PushUpState {
  return {
    count: 0,
    stage: 'up',
    leftArmPercentage: 0,
    rightArmPercentage: 0,
  };
}

