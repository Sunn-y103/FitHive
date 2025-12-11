/**
 * Pose Detector - Full MediaPipe Integration for React Native/Expo
 * 
 * This module provides complete pose detection using @mediapipe/tasks-vision
 * Based on Python PoseModule.py structure
 * 
 * Python Mapping:
 * - PoseDetector.__init__() → constructor + initialize()
 * - findPose() → detectPose()
 * - findPosition() → extractLandmarks()
 * - findAngle() → (moved to angleUtil.ts)
 */

import { FilesetResolver, PoseLandmarker, PoseLandmarkerResult } from '@mediapipe/tasks-vision';

/**
 * MediaPipe Pose landmark structure
 * Maps to Python: lmList = [[cx, cy, cz], ...]
 */
export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

/**
 * Pose detection result
 * Maps to Python: (lmList, bboxInfo)
 */
export interface PoseDetectionResult {
  landmarks: PoseLandmark[] | null;
  bbox: { bbox: [number, number, number, number]; center: [number, number] } | null;
  hasPose: boolean;
}

/**
 * Pose detector configuration (matches Python PoseDetector __init__)
 * 
 * Python: PoseDetector(
 *     staticMode=False,
 *     modelComplexity=1,
 *     smoothLandmarks=True,
 *     detectionCon=0.5,
 *     trackCon=0.5
 * )
 */
export interface PoseDetectorConfig {
  staticMode?: boolean;
  modelComplexity?: 0 | 1 | 2;
  smoothLandmarks?: boolean;
  enableSegmentation?: boolean;
  smoothSegmentation?: boolean;
  detectionCon?: number; // min_detection_confidence (default: 0.5)
  trackCon?: number; // min_tracking_confidence (default: 0.5)
}

/**
 * Pose Detector class (matches Python PoseModule structure)
 */
export class PoseDetector {
  private config: Required<PoseDetectorConfig>;
  private poseLandmarker: PoseLandmarker | null = null;
  private isInitialized: boolean = false;
  private lastVideoTime: number = -1;

  constructor(config: PoseDetectorConfig = {}) {
    this.config = {
      staticMode: config.staticMode ?? false,
      modelComplexity: config.modelComplexity ?? 1,
      smoothLandmarks: config.smoothLandmarks ?? true,
      enableSegmentation: config.enableSegmentation ?? false,
      smoothSegmentation: config.smoothSegmentation ?? true,
      detectionCon: config.detectionCon ?? 0.5,
      trackCon: config.trackCon ?? 0.5,
    };
  }

  /**
   * Initialize MediaPipe Pose processor
   * Must be called before using the detector
   * 
   * Python equivalent: detector = PoseDetector(detectionCon=0.69)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('✅ Pose detector already initialized');
      return;
    }

    try {
      console.log('🔄 Initializing MediaPipe Pose detector...');

      // Load MediaPipe Vision Tasks
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.11/wasm'
      );

      // Create PoseLandmarker
      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_${this.config.modelComplexity === 0 ? 'lite' : this.config.modelComplexity === 1 ? 'full' : 'heavy'}/float16/1/pose_landmarker_${this.config.modelComplexity === 0 ? 'lite' : this.config.modelComplexity === 1 ? 'full' : 'heavy'}.task`,
          delegate: 'GPU', // Use GPU if available, falls back to CPU
        },
        runningMode: this.config.staticMode ? 'IMAGE' : 'VIDEO',
        numPoses: 1, // Only detect one person
        minPoseDetectionConfidence: this.config.detectionCon,
        minPosePresenceConfidence: this.config.trackCon,
        minTrackingConfidence: this.config.trackCon,
        outputSegmentationMasks: this.config.enableSegmentation,
      });

      this.isInitialized = true;
      console.log('✅ Pose detector initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing pose detector:', error);
      throw error;
    }
  }

  /**
   * Detect pose in image/frame (matches Python findPose)
   * 
   * Python: img = detector.findPose(img, draw=True)
   * 
   * @param imageData Image data (ImageData, HTMLImageElement, or frame)
   * @param timestamp Video timestamp (required for VIDEO mode)
   * @returns Pose detection result
   */
  async detectPose(
    imageData: ImageData | HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    timestamp?: number
  ): Promise<PoseDetectionResult> {
    if (!this.poseLandmarker || !this.isInitialized) {
      console.warn('⚠️ Pose detector not initialized. Call initialize() first.');
      return {
        landmarks: null,
        bbox: null,
        hasPose: false,
      };
    }

    try {
      let result: PoseLandmarkerResult;

      if (this.config.staticMode) {
        // IMAGE mode (static)
        result = this.poseLandmarker.detect(imageData);
      } else {
        // VIDEO mode (real-time)
        if (timestamp === undefined) {
          timestamp = performance.now();
        }
        result = this.poseLandmarker.detectForVideo(imageData, timestamp);
        this.lastVideoTime = timestamp;
      }

      // Extract landmarks
      return this.extractLandmarks(result, imageData);
    } catch (error) {
      console.error('❌ Error detecting pose:', error);
      return {
        landmarks: null,
        bbox: null,
        hasPose: false,
      };
    }
  }

  /**
   * Extract landmark positions (matches Python findPosition)
   * 
   * Python: lmList, bbox = detector.findPosition(img, draw=False)
   * 
   * @param result MediaPipe pose detection result
   * @param imageData Original image data for dimensions
   * @param bboxWithHands Whether to include hands in bounding box
   * @returns Pose detection result with landmarks and bounding box
   */
  private extractLandmarks(
    result: PoseLandmarkerResult,
    imageData: ImageData | HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    bboxWithHands: boolean = false
  ): PoseDetectionResult {
    if (!result.landmarks || result.landmarks.length === 0) {
      return {
        landmarks: null,
        bbox: null,
        hasPose: false,
      };
    }

    // Get image dimensions
    const imageWidth = 'width' in imageData ? imageData.width : imageData instanceof HTMLImageElement ? imageData.naturalWidth : 640;
    const imageHeight = 'height' in imageData ? imageData.height : imageData instanceof HTMLImageElement ? imageData.naturalHeight : 480;

    // Extract landmarks (matches Python: lmList = [[cx, cy, cz], ...])
    // Python: cx, cy, cz = int(lm.x * w), int(lm.y * h), int(lm.z * w)
    const landmarks: PoseLandmark[] = result.landmarks[0].map((lm) => ({
      x: lm.x * imageWidth,
      y: lm.y * imageHeight,
      z: lm.z * imageWidth, // z is typically scaled by width
      visibility: lm.visibility,
    }));

    // Calculate bounding box (using utility function)
    const { calculateBoundingBox } = await import('./angleUtil');
    const bbox = calculateBoundingBox(
      landmarks.map((lm) => [lm.x, lm.y, lm.z] as [number, number, number]),
      bboxWithHands
    );

    return {
      landmarks,
      bbox,
      hasPose: true,
    };
  }

  /**
   * Process camera frame and extract pose landmarks
   * Main entry point for real-time pose detection
   * 
   * @param frame Camera frame from expo-camera (converted to ImageData)
   * @param timestamp Frame timestamp
   * @returns Pose detection result
   */
  async processFrame(
    frame: ImageData | HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    timestamp?: number
  ): Promise<PoseDetectionResult> {
    return this.detectPose(frame, timestamp);
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    // MediaPipe PoseLandmarker doesn't have explicit dispose, but we can clear the reference
    this.poseLandmarker = null;
    this.isInitialized = false;
    this.lastVideoTime = -1;
  }
}

/**
 * Create a pose detector instance with default settings
 * Matches Python: detector = PoseDetector(detectionCon=0.69)
 */
export function createPoseDetector(config?: PoseDetectorConfig): PoseDetector {
  return new PoseDetector(config);
}
