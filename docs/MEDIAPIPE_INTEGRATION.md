# MediaPipe Pose Integration Guide

## Overview

The workout camera screen (`WorkoutCameraScreen.tsx`) is set up with a placeholder for MediaPipe Pose integration. To complete the implementation, you need to integrate MediaPipe Pose for real-time pose detection.

## Current Status

The camera screen is fully functional with:
- ✅ Camera permissions handling
- ✅ UI for rep counting display
- ✅ Exercise selection
- ✅ Workout saving to Supabase
- ⚠️ **MediaPipe Pose detection (placeholder - needs implementation)**

## Integration Options

### Option 1: MediaPipe Pose WASM (Recommended for Expo Go)

MediaPipe Pose can run in the browser using WebAssembly. However, for React Native/Expo, you'll need to use a compatible solution.

**Installation:**
```bash
npm install @mediapipe/pose @mediapipe/camera_utils
```

**Note:** This may require additional setup for React Native compatibility.

### Option 2: TensorFlow.js Pose Detection

Use TensorFlow.js with a pose detection model that works in React Native.

**Installation:**
```bash
npm install @tensorflow/tfjs @tensorflow-models/pose-detection
```

### Option 3: React Native Pose Detection Library

Use a React Native-specific pose detection library.

**Example:**
```bash
npm install react-native-pose-detection
```

## Implementation Steps

1. **Install the chosen library** (see options above)

2. **Update `WorkoutCameraScreen.tsx`:**

   Replace the placeholder `processFrame` function with actual pose detection:

   ```typescript
   // Example with TensorFlow.js
   import * as poseDetection from '@tensorflow-models/pose-detection';
   import '@tensorflow/tfjs-react-native';

   const processFrame = async (frame: any) => {
     if (isProcessing) return;
     
     setIsProcessing(true);
     
     try {
       // Initialize detector (do this once, not every frame)
       const detector = await poseDetection.createDetector(
         poseDetection.SupportedModels.MoveNet,
         { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
       );

       // Process frame
       const poses = await detector.estimatePoses(frame);
       
       if (poses.length > 0) {
         const landmarks = poses[0].keypoints.map(kp => ({
           x: kp.x,
           y: kp.y,
           z: kp.z || 0,
           visibility: kp.score,
         }));
         updatePose(landmarks);
       } else {
         updatePose(null);
       }
     } catch (error) {
       console.error('❌ Error processing frame:', error);
     } finally {
       setIsProcessing(false);
     }
   };
   ```

3. **Connect to Camera Frames:**

   Update the `CameraView` component to process frames:

   ```typescript
   <CameraView
     ref={cameraRef}
     style={styles.camera}
     facing="front"
     onCameraReady={() => {
       // Start frame processing
     }}
     onFrame={(frame) => {
       processFrame(frame);
     }}
   />
   ```

## MediaPipe Landmark Indices

The rep counting logic uses these MediaPipe Pose landmark indices:

### Push-Ups
- **Right arm**: 12 (shoulder) - 14 (elbow) - 16 (wrist)
- **Left arm**: 11 (shoulder) - 13 (elbow) - 15 (wrist)

### Bicep Curls
- **Right arm**: 16 (wrist) - 14 (elbow) - 12 (shoulder)

### Squats
- **Right leg**: 24 (hip) - 26 (knee) - 28 (ankle)

## Testing

1. Test with a simple mock to verify the rep counting logic works
2. Test with actual pose detection to ensure landmarks are correctly extracted
3. Verify rep counting accuracy with real exercises

## Notes

- The current implementation uses angle calculations and percentage interpolation, matching the original Python code
- The rep counting state machine tracks "up" and "down" stages
- Count increments by 0.5 when transitioning between stages, so a full rep = 1.0

## Troubleshooting

- **Camera not working**: Check permissions and ensure `expo-camera` is properly installed
- **Pose detection not working**: Verify the pose detection library is compatible with Expo Go
- **Reps not counting**: Check that landmarks are being extracted correctly and visibility thresholds are appropriate

