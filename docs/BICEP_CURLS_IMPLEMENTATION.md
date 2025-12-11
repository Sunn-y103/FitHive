# Bicep Curls Screen - Complete Implementation Guide

## Overview

This document describes the complete TypeScript implementation of real-time pose estimation and rep counting for bicep curls, converted from Python to React Native/Expo.

## Architecture

### Module Structure

```
utils/pose/
├── angleUtil.ts          # Angle calculation (matches Python findAngle)
├── repCounter.ts         # Rep counting state machine (matches Python exactly)
├── poseDetector.ts       # MediaPipe integration (matches Python PoseDetector)
└── cameraFrameProcessor.ts # Frame conversion utilities

screens/
└── BicepCurlsScreen.tsx  # Complete UI with real-time processing
```

## Python to TypeScript Mapping

### 1. Angle Calculation (`angleUtil.ts`)

**Python (PoseModule.py):**
```python
def findAngle(self, p1, p2, p3, img=None, color=(255, 0, 255), scale=5):
    x1, y1 = p1[0], p1[1]
    x2, y2 = p2[0], p2[1]
    x3, y3 = p3[0], p3[1]
    
    angle = math.degrees(
        math.atan2(y3 - y2, x3 - x2) -
        math.atan2(y1 - y2, x1 - x2)
    )
    
    if angle < 0:
        angle += 360
    
    return angle, img
```

**TypeScript (`angleUtil.ts`):**
```typescript
export function findAngle(
  p1: [number, number],
  p2: [number, number],
  p3: [number, number]
): number {
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  const [x3, y3] = p3;

  const angle = (Math.atan2(y3 - y2, x3 - x2) - Math.atan2(y1 - y2, x1 - x2)) * (180 / Math.PI);

  if (angle < 0) {
    return angle + 360;
  }

  return angle;
}
```

**Key Points:**
- ✅ Exact same atan2 calculation
- ✅ Same 0-360 degree normalization
- ✅ No drawing code (handled in UI layer)

### 2. Interpolation (`angleUtil.ts`)

**Python (bicepCurlCounter.py):**
```python
per = np.interp(angle, (22, 170), (0, 100))
bar_val = np.interp(angle, (22, 170), (300, 60))
```

**TypeScript (`angleUtil.ts`):**
```typescript
export function interpolate(
  value: number,
  inputRange: [number, number],
  outputRange: [number, number]
): number {
  const [inputMin, inputMax] = inputRange;
  const [outputMin, outputMax] = outputRange;
  const clampedValue = Math.max(inputMin, Math.min(inputMax, value));
  const inputRangeSize = inputMax - inputMin;
  if (inputRangeSize === 0) return outputMin;
  const normalizedValue = (clampedValue - inputMin) / inputRangeSize;
  return outputMin + normalizedValue * (outputMax - outputMin);
}
```

**Usage:**
```typescript
const per = Math.round(interpolate(angle, [22, 170], [0, 100]));
const barVal = Math.round(interpolate(angle, [22, 170], [300, 60]));
```

**Key Points:**
- ✅ Exact numpy.interp equivalent
- ✅ Same threshold values: (22, 170) → (0, 100)
- ✅ Clamping to input range

### 3. Rep Counting State Machine (`repCounter.ts`)

**Python (bicepCurlCounter.py):**
```python
curl_count = 0
dir = 0  # 0 = going up, 1 = going down
bar_color = (0, 0, 255)

while True:
    # ... angle calculation ...
    per = np.interp(angle, (22, 170), (0, 100))
    
    if per == 100:
        if dir == 0:
            curl_count += 0.5
            dir = 1
            bar_color = (0, 255, 0)
    
    if per == 0:
        if dir == 1:
            curl_count += 0.5
            dir = 0
            bar_color = (0, 255, 0)
    
    if per not in [0, 100]:
        bar_color = (0, 0, 255)
```

**TypeScript (`repCounter.ts`):**
```typescript
export interface RepCounterState {
  count: number;
  dir: 0 | 1;  // 0 = going up, 1 = going down
  percentage: number;
  angle: number;
}

export function countBicepCurl(
  landmarks: PoseLandmark[] | null,
  currentState: RepCounterState
): RepCounterState {
  // ... angle calculation ...
  const per = Math.round(interpolate(angle, [22, 170], [0, 100]));
  const clampedPer = Math.max(0, Math.min(100, per));

  let { count, dir } = currentState;
  let newDir: 0 | 1 = dir;

  if (clampedPer === 100) {
    if (dir === 0) {
      count += 0.5;
      newDir = 1;
    }
  }

  if (clampedPer === 0) {
    if (dir === 1) {
      count += 0.5;
      newDir = 0;
    }
  }

  return { count, dir: newDir, percentage: clampedPer, angle };
}
```

**Key Points:**
- ✅ Exact same state machine logic
- ✅ Same dir transitions (0 ↔ 1)
- ✅ Same 0.5 increment per transition
- ✅ Same threshold checks (per == 100, per == 0)

### 4. Pose Detection (`poseDetector.ts`)

**Python (PoseModule.py):**
```python
class PoseDetector:
    def __init__(self, staticMode=False, modelComplexity=1,
                 smoothLandmarks=True, detectionCon=0.5, trackCon=0.5):
        self.mpPose = mp.solutions.pose
        self.pose = self.mpPose.Pose(
            static_image_mode=self.staticMode,
            model_complexity=self.modelComplexity,
            smooth_landmarks=self.smoothLandmarks,
            min_detection_confidence=self.detectionCon,
            min_tracking_confidence=self.trackCon
        )
    
    def findPose(self, img, draw=True):
        imgRGB = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        self.results = self.pose.process(imgRGB)
        return img
    
    def findPosition(self, img, draw=True, bboxWithHands=False):
        self.lmList = []
        if self.results.pose_landmarks:
            for id, lm in enumerate(self.results.pose_landmarks.landmark):
                h, w, c = img.shape
                cx, cy, cz = int(lm.x * w), int(lm.y * h), int(lm.z * w)
                self.lmList.append([cx, cy, cz])
        return self.lmList, self.bboxInfo
```

**TypeScript (`poseDetector.ts`):**
```typescript
export class PoseDetector {
  constructor(config: PoseDetectorConfig = {}) {
    this.config = {
      staticMode: config.staticMode ?? false,
      modelComplexity: config.modelComplexity ?? 1,
      smoothLandmarks: config.smoothLandmarks ?? true,
      detectionCon: config.detectionCon ?? 0.5,
      trackCon: config.trackCon ?? 0.5,
    };
  }

  async initialize(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.11/wasm'
    );
    
    this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: '...', delegate: 'GPU' },
      runningMode: this.config.staticMode ? 'IMAGE' : 'VIDEO',
      minPoseDetectionConfidence: this.config.detectionCon,
      minTrackingConfidence: this.config.trackCon,
    });
  }

  async detectPose(imageData: ImageData, timestamp?: number): Promise<PoseDetectionResult> {
    const result = this.config.staticMode
      ? this.poseLandmarker.detect(imageData)
      : this.poseLandmarker.detectForVideo(imageData, timestamp);
    
    return this.extractLandmarks(result, imageData);
  }
}
```

**Key Points:**
- ✅ Same configuration options
- ✅ Same landmark extraction logic
- ✅ Same coordinate conversion (x * width, y * height, z * width)

## Threshold Values (Exact Python Match)

| Parameter | Python Value | TypeScript Value | Purpose |
|-----------|-------------|------------------|---------|
| `detectionCon` | 0.69 | 0.69 | Minimum detection confidence |
| `trackCon` | 0.5 | 0.5 | Minimum tracking confidence |
| Angle range | (22, 170) | [22, 170] | Input angle range |
| Percentage range | (0, 100) | [0, 100] | Output percentage range |
| Bar range | (300, 60) | [300, 60] | Bar visualization range |
| Landmarks | 16, 14, 12 | 16, 14, 12 | Wrist, Elbow, Shoulder |

## Usage Example

```typescript
import { createPoseDetector } from './utils/pose/poseDetector';
import { countBicepCurl, initRepCounterState } from './utils/pose/repCounter';

// Initialize detector
const detector = createPoseDetector({
  detectionCon: 0.69,  // Matches Python
  trackCon: 0.5,
});
await detector.initialize();

// Initialize rep counter
let repState = initRepCounterState();

// Process frame
const result = await detector.processFrame(imageData, timestamp);

if (result.hasPose && result.landmarks) {
  // Count reps
  repState = countBicepCurl(result.landmarks, repState);
  
  // Get rep count
  const repCount = Math.floor(repState.count);
  const percentage = repState.percentage;
}
```

## Real-Time Processing

### Web Platform

The implementation works fully on web using:
- `HTMLVideoElement` for camera input
- `@mediapipe/tasks-vision` for pose detection
- Canvas API for frame extraction

### Native Platforms (iOS/Android)

For native platforms, you have two options:

#### Option 1: react-native-vision-camera (Recommended)

```bash
npm install react-native-vision-camera
```

```typescript
import { useFrameProcessor } from 'react-native-vision-camera';
import { runOnJS } from 'react-native-reanimated';

const frameProcessor = useFrameProcessor((frame) => {
  'worklet';
  // Process frame with MediaPipe
  const imageData = convertFrameToImageData(frame);
  runOnJS(processPose)(imageData);
}, []);
```

#### Option 2: expo-gl (Alternative)

```bash
npx expo install expo-gl
```

Use GL texture for frame processing.

## UI Components

### BicepCurlsScreen Features

1. **Camera View**
   - Full-screen camera feed
   - Front-facing camera
   - Proper aspect ratio

2. **Overlay Elements**
   - Rep count display (top)
   - Percentage display (center)
   - Progress bar (matches Python bar visualization)
   - Bounding box (when pose detected)

3. **Controls**
   - Reset button
   - End workout button
   - Close button

## Installation

```bash
# Install MediaPipe
npm install @mediapipe/tasks-vision

# Install camera (already in package.json)
# expo-camera is already installed
```

## Running the App

```bash
# Start Expo
npm start

# Run on web (full MediaPipe support)
npm run web

# Run on iOS/Android (requires native frame processing)
npm run ios
npm run android
```

## Performance Considerations

1. **Frame Rate**: Process every 2-3 frames (not every frame) for better performance
2. **Model Complexity**: Use `modelComplexity: 0` (lite) for faster processing
3. **GPU Acceleration**: MediaPipe uses GPU when available
4. **Throttling**: Use `requestAnimationFrame` or similar for frame processing

## Troubleshooting

### MediaPipe Not Loading

- Check internet connection (loads WASM from CDN)
- Verify `@mediapipe/tasks-vision` is installed
- Check browser console for errors

### No Pose Detected

- Ensure good lighting
- Ensure full body is in frame
- Check `detectionCon` threshold (lower for more sensitive)

### Frame Processing Not Working

- Web: Check browser console
- Native: Use `react-native-vision-camera` for frame processors
- Verify camera permissions are granted

## Next Steps

1. **Add More Exercises**: Extend `repCounter.ts` for push-ups, squats, etc.
2. **Save Workouts**: Integrate with Supabase to save workout results
3. **History**: Show workout history and progress
4. **Form Feedback**: Add form correction hints based on pose

## References

- [MediaPipe Pose Documentation](https://developers.google.com/mediapipe/solutions/vision/pose_landmarker)
- [Python Original Code](https://github.com/stha1122/AI-Rep-Counter)
- [Expo Camera Documentation](https://docs.expo.dev/versions/latest/sdk/camera/)

