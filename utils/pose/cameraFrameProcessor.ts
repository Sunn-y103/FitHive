/**
 * Camera Frame Processor - Bridge between expo-camera and MediaPipe
 * 
 * This module handles the conversion of camera frames to formats
 * compatible with MediaPipe Pose detection.
 * 
 * Note: expo-camera doesn't provide direct frame callbacks.
 * For real-time processing, consider:
 * - react-native-vision-camera (with frame processors)
 * - expo-gl (for texture-based processing)
 * - Web-based implementation using HTMLVideoElement
 */

/**
 * Convert expo-camera frame to ImageData for MediaPipe
 * 
 * @param frame Camera frame (format depends on platform)
 * @returns ImageData compatible with MediaPipe
 */
export async function frameToImageData(frame: any): Promise<ImageData | null> {
  try {
    // Platform-specific implementation
    if (Platform.OS === 'web') {
      // Web: Use HTMLVideoElement or HTMLCanvasElement
      return frameToImageDataWeb(frame);
    } else {
      // Native: Use expo-gl or react-native-vision-camera
      // For now, return null - implement based on your camera solution
      console.warn('⚠️ Native frame processing not implemented. Use react-native-vision-camera for real-time processing.');
      return null;
    }
  } catch (error) {
    console.error('❌ Error converting frame:', error);
    return null;
  }
}

/**
 * Web implementation: Convert video frame to ImageData
 */
function frameToImageDataWeb(videoElement: HTMLVideoElement | HTMLCanvasElement): ImageData | null {
  try {
    if (videoElement instanceof HTMLVideoElement) {
      // Create canvas to extract frame
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 640;
      canvas.height = videoElement.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        return null;
      }
      
      // Draw video frame to canvas
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      // Extract ImageData
      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    } else if (videoElement instanceof HTMLCanvasElement) {
      // Already a canvas, extract ImageData
      const ctx = videoElement.getContext('2d');
      if (!ctx) {
        return null;
      }
      return ctx.getImageData(0, 0, videoElement.width, videoElement.height);
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error in web frame conversion:', error);
    return null;
  }
}

/**
 * Check if platform supports real-time frame processing
 */
export function supportsFrameProcessing(): boolean {
  if (typeof Platform !== 'undefined') {
    return Platform.OS === 'web';
  }
  return false;
}

