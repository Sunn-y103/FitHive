import { useState, useCallback } from 'react';
import { countPushUp, initPushUpState, PushUpState } from '../utils/pose/pushupCounter';
import { countCurl, initCurlState, CurlState } from '../utils/pose/curlCounter';
import { countSquat, initSquatState, SquatState } from '../utils/pose/squatCounter';

export type ExerciseType = 'pushup' | 'curl' | 'squat';

export type ExerciseState = PushUpState | CurlState | SquatState;

export interface UseExercisePoseResult {
  repCount: number;
  stage: 'up' | 'down';
  percentage: number;
  leftArmPercentage?: number;
  rightArmPercentage?: number;
  updatePose: (landmarks: Array<{ x: number; y: number; z?: number; visibility?: number }> | null) => void;
  reset: () => void;
}

/**
 * Hook for exercise pose detection and rep counting
 * 
 * @param exerciseType Type of exercise: 'pushup', 'curl', or 'squat'
 * @returns Exercise state and update function
 */
export function useExercisePose(exerciseType: ExerciseType): UseExercisePoseResult {
  // Initialize state based on exercise type
  const getInitialState = useCallback((): ExerciseState => {
    switch (exerciseType) {
      case 'pushup':
        return initPushUpState();
      case 'curl':
        return initCurlState();
      case 'squat':
        return initSquatState();
      default:
        return initPushUpState();
    }
  }, [exerciseType]);

  const [state, setState] = useState<ExerciseState>(getInitialState);

  // Update pose based on landmarks
  const updatePose = useCallback(
    (landmarks: Array<{ x: number; y: number; z?: number; visibility?: number }> | null) => {
      setState((currentState) => {
        switch (exerciseType) {
          case 'pushup':
            return countPushUp(landmarks, currentState as PushUpState);
          case 'curl':
            return countCurl(landmarks, currentState as CurlState);
          case 'squat':
            return countSquat(landmarks, currentState as SquatState);
          default:
            return currentState;
        }
      });
    },
    [exerciseType]
  );

  // Reset counter
  const reset = useCallback(() => {
    setState(getInitialState());
  }, [getInitialState]);

  // Extract values based on exercise type
  const repCount = Math.floor(state.count);
  const stage = state.stage;

  let percentage: number;
  let leftArmPercentage: number | undefined;
  let rightArmPercentage: number | undefined;

  if (exerciseType === 'pushup') {
    const pushUpState = state as PushUpState;
    percentage = (pushUpState.leftArmPercentage + pushUpState.rightArmPercentage) / 2;
    leftArmPercentage = pushUpState.leftArmPercentage;
    rightArmPercentage = pushUpState.rightArmPercentage;
  } else if (exerciseType === 'curl') {
    const curlState = state as CurlState;
    percentage = curlState.armPercentage;
  } else {
    const squatState = state as SquatState;
    percentage = squatState.legPercentage;
  }

  return {
    repCount,
    stage,
    percentage,
    leftArmPercentage,
    rightArmPercentage,
    updatePose,
    reset,
  };
}

