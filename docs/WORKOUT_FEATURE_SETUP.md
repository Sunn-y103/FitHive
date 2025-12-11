# Workout Feature Setup Guide

## Overview

The AI Rep Counter feature has been integrated into your FitHive app. This guide will help you complete the setup.

## ✅ Completed

1. ✅ TypeScript utility functions for angle calculation and rep counting
2. ✅ Exercise pose detection hook (`useExercisePose`)
3. ✅ Workout camera screen with UI
4. ✅ Supabase integration functions
5. ✅ Navigation updates
6. ✅ Workout selection modal
7. ✅ All Health Data screen integration

## 📋 Setup Steps

### 1. Install Dependencies

Run the following command to install the required camera package:

```bash
npm install expo-camera
```

### 2. Create Supabase Table

Run the SQL migration in your Supabase console:

1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `supabase/migrations/002_create_workouts_table.sql`
3. Click "Run"

This will create the `workouts` table with:
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key to auth.users)
- `exercise` (TEXT: 'pushup', 'curl', or 'squat')
- `reps` (INTEGER)
- `created_at` (TIMESTAMPTZ)

### 3. MediaPipe Pose Integration

**Important:** The camera screen currently has a placeholder for MediaPipe Pose detection. You need to integrate a pose detection library.

See `docs/MEDIAPIPE_INTEGRATION.md` for detailed instructions on:
- Available integration options
- Step-by-step implementation
- MediaPipe landmark indices used

**Quick Start Options:**

**Option A: TensorFlow.js (Recommended for Expo)**
```bash
npm install @tensorflow/tfjs @tensorflow-models/pose-detection
```

**Option B: MediaPipe WASM**
```bash
npm install @mediapipe/pose @mediapipe/camera_utils
```

### 4. Test the Feature

1. Navigate to "All Health Data" screen
2. Tap on "Workout" card
3. Select an exercise type (Push-Ups, Bicep Curls, or Squats)
4. Grant camera permissions
5. The camera screen will open (pose detection needs to be implemented)

## 📁 File Structure

```
src/
├── components/
│   └── WorkoutSelectionModal.tsx    # Exercise selection modal
├── hooks/
│   └── useExercisePose.ts            # Exercise pose detection hook
├── lib/
│   └── supabase/
│       └── saveWorkoutResult.ts      # Supabase workout functions
├── screens/
│   └── WorkoutCameraScreen.tsx       # Main camera screen
└── utils/
    └── pose/
        ├── calculateAngle.ts         # Angle calculation utility
        ├── curlCounter.ts            # Bicep curl rep counter
        ├── pushupCounter.ts          # Push-up rep counter
        └── squatCounter.ts           # Squat rep counter
```

## 🎯 Exercise Logic

### Push-Ups
- Tracks both arms (left and right)
- Uses landmarks: 11-13-15 (left) and 12-14-16 (right)
- Angle range: 80-175 degrees → 100-0% completion
- Counts rep when both arms reach 100% (down) then 0% (up)

### Bicep Curls
- Tracks right arm
- Uses landmarks: 16-14-12 (wrist-elbow-shoulder)
- Angle range: 22-170 degrees → 100-0% completion
- Counts rep when arm reaches 100% (down) then 0% (up)

### Squats
- Tracks right leg
- Uses landmarks: 24-26-28 (hip-knee-ankle)
- Angle range: 100-170 degrees → 100-0% completion
- Counts rep when leg reaches 100% (down) then 0% (up)

## 🔧 Troubleshooting

### Camera Permission Issues
- Ensure `expo-camera` is installed
- Check app permissions in device settings
- Restart the app after granting permissions

### Supabase Errors
- Verify the `workouts` table exists
- Check RLS policies are correctly set
- Ensure user is authenticated

### Rep Counting Not Working
- Verify MediaPipe Pose is integrated
- Check that landmarks are being extracted correctly
- Ensure visibility thresholds are appropriate (currently 0.5)

## 📝 Next Steps

1. **Complete MediaPipe Integration** (see `docs/MEDIAPIPE_INTEGRATION.md`)
2. **Test with real exercises** to verify rep counting accuracy
3. **Adjust angle thresholds** if needed for better accuracy
4. **Add workout history view** (optional enhancement)
5. **Add workout statistics** (optional enhancement)

## 🎨 UI Features

- Real-time rep counter display
- Progress bars for exercise completion
- Dual progress bars for push-ups (left/right arms)
- Stage indicator (UP/DOWN)
- End workout button with save option
- Workout history in All Health Data screen

## 🔐 Security

- RLS policies ensure users can only access their own workouts
- All database operations are authenticated
- Camera permissions are properly requested

