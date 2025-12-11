/**
 * Angle calculation utilities
 * Based on Python PoseModule.py findAngle method
 * Uses atan2 for exact match with Python implementation
 */

/**
 * Calculate angle between three points using atan2 (matches Python exactly)
 * 
 * Python implementation:
 * angle = math.degrees(
 *     math.atan2(y3 - y2, x3 - x2) -
 *     math.atan2(y1 - y2, x1 - x2)
 * )
 * if angle < 0:
 *     angle += 360
 * 
 * @param p1 First point [x, y]
 * @param p2 Middle point (vertex) [x, y]
 * @param p3 Third point [x, y]
 * @returns Angle in degrees (0-360)
 */
export function findAngle(
  p1: [number, number],
  p2: [number, number],
  p3: [number, number]
): number {
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  const [x3, y3] = p3;

  // Calculate angle using atan2 (matches Python exactly)
  const angle = (Math.atan2(y3 - y2, x3 - x2) - Math.atan2(y1 - y2, x1 - x2)) * (180 / Math.PI);

  // Normalize to 0-360 range (matches Python)
  if (angle < 0) {
    return angle + 360;
  }

  return angle;
}

/**
 * Interpolate value from one range to another (matches numpy.interp)
 * 
 * Python: np.interp(value, (inputMin, inputMax), (outputMin, outputMax))
 * 
 * @param value Input value to interpolate
 * @param inputRange [min, max] of input range
 * @param outputRange [min, max] of output range
 * @returns Interpolated value
 */
export function interpolate(
  value: number,
  inputRange: [number, number],
  outputRange: [number, number]
): number {
  const [inputMin, inputMax] = inputRange;
  const [outputMin, outputMax] = outputRange;

  // Clamp value to input range
  const clampedValue = Math.max(inputMin, Math.min(inputMax, value));

  // Calculate interpolation
  const inputRangeSize = inputMax - inputMin;
  if (inputRangeSize === 0) {
    return outputMin;
  }

  const normalizedValue = (clampedValue - inputMin) / inputRangeSize;
  return outputMin + normalizedValue * (outputMax - outputMin);
}

/**
 * Calculate distance between two points
 * 
 * @param p1 First point [x, y]
 * @param p2 Second point [x, y]
 * @returns Distance
 */
export function findDistance(p1: [number, number], p2: [number, number]): number {
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  return Math.hypot(x2 - x1, y2 - y1);
}

/**
 * Calculate bounding box from landmarks (matches Python findPosition)
 * 
 * @param landmarks Array of landmark points
 * @param bboxWithHands Whether to include hands in bounding box
 * @returns Bounding box info {bbox: [x, y, width, height], center: [cx, cy]}
 */
export function calculateBoundingBox(
  landmarks: Array<[number, number, number]>,
  bboxWithHands: boolean = false
): { bbox: [number, number, number, number]; center: [number, number] } | null {
  if (landmarks.length < 30) {
    return null;
  }

  // Calculate average distance between shoulders
  const ad = Math.abs(landmarks[12][0] - landmarks[11][0]) / 2;

  let x1: number, x2: number;

  if (bboxWithHands) {
    x1 = landmarks[16][0] - ad; // Right wrist
    x2 = landmarks[15][0] + ad;  // Left wrist
  } else {
    x1 = landmarks[12][0] - ad; // Right shoulder
    x2 = landmarks[11][0] + ad; // Left shoulder
  }

  const y2 = landmarks[29][1] + ad; // Right ankle
  const y1 = landmarks[1][1] - ad;  // Nose

  const bbox: [number, number, number, number] = [x1, y1, x2 - x1, y2 - y1];
  const cx = bbox[0] + bbox[2] / 2;
  const cy = bbox[1] + bbox[3] / 2;

  return {
    bbox,
    center: [cx, cy],
  };
}

