# Emulator Camera Display Issue - Fix

## Problem

The Android emulator shows a **mosaic pattern** (green/brown rectangles) instead of the camera feed.

## Root Cause

The `CameraView` component structure was incorrect. The overlay needs to be a **child** of `CameraView`, not a sibling.

## Fix Applied

### Before (Incorrect):
```typescript
<View style={styles.cameraContainer}>
  <CameraView style={styles.camera} />
  <View style={styles.overlay}>
    {/* UI elements */}
  </View>
</View>
```

### After (Correct):
```typescript
<CameraView style={styles.camera}>
  <View style={styles.overlay} pointerEvents="box-none">
    {/* UI elements */}
  </View>
</CameraView>
```

## Additional Fixes

1. **Removed unnecessary container**: `cameraContainer` wrapper removed
2. **Added `pointerEvents="box-none"`**: Allows touch events to pass through overlay to camera
3. **Simplified styles**: Camera now uses `flex: 1` directly

## Android Emulator Camera Setup

If camera still doesn't work in emulator:

### Option 1: Use Physical Device
- Connect Android device via USB
- Enable USB debugging
- Run: `npm run android`

### Option 2: Configure Emulator Camera

1. **Open Android Studio**
2. **AVD Manager** → Edit your emulator
3. **Show Advanced Settings**
4. **Camera**: 
   - Front: `Webcam0` or `VirtualScene`
   - Back: `Webcam0` or `VirtualScene`
5. **Save and restart emulator**

### Option 3: Use Web Platform

For testing MediaPipe integration:
```bash
npm run web
```

Web platform has full camera support and MediaPipe works perfectly.

## Verification

After fix, you should see:
- ✅ Camera feed displaying (not mosaic)
- ✅ Rep counter overlay visible
- ✅ UI elements positioned correctly
- ✅ Touch events working

## If Issue Persists

1. **Check camera permissions**: Ensure emulator has camera access
2. **Restart emulator**: Sometimes emulator needs restart
3. **Check logs**: Look for camera initialization errors
4. **Try physical device**: Best for real-world testing

