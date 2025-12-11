/**
 * Calculate angle between three points (landmarks)
 * Based on MediaPipe Pose landmarks
 * 
 * @param point1 First point (x, y)
 * @param point2 Middle point (vertex of the angle)
 * @param point3 Third point (x, y)
 * @returns Angle in degrees (0-180)
 */
export function calculateAngle(
  point1: { x: number; y: number },
  point2: { x: number; y: number },
  point3: { x: number; y: number }
): number {
  // Calculate vectors
  const vector1 = {
    x: point1.x - point2.x,
    y: point1.y - point2.y,
  };
  
  const vector2 = {
    x: point3.x - point2.x,
    y: point3.y - point2.y,
  };

  // Calculate dot product
  const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y;

  // Calculate magnitudes
  const magnitude1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
  const magnitude2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);

  // Avoid division by zero
  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }

  // Calculate angle in radians, then convert to degrees
  const cosAngle = dotProduct / (magnitude1 * magnitude2);
  // Clamp to [-1, 1] to avoid NaN from Math.acos
  const clampedCos = Math.max(-1, Math.min(1, cosAngle));
  const angleRadians = Math.acos(clampedCos);
  const angleDegrees = (angleRadians * 180) / Math.PI;

  return angleDegrees;
}

/**
 * Interpolate a value from one range to another
 * Equivalent to numpy.interp
 * 
 * @param value Input value
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

