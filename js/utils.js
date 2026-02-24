// Math utility functions for the neural network evolution simulation

/**
 * Calculate distance between two 2D points
 */
export function distance(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate a point extended from a position at a given angle and distance
 * @param {Object} position - {x, y} starting position
 * @param {number} angleInDegrees - angle in degrees
 * @param {number} length - distance to extend
 * @returns {Object} {x, y} extended point
 */
export function extendedPoint(position, angleInDegrees, length) {
  const radians = angleInDegrees * Math.PI / 180;
  return {
    x: position.x + Math.cos(radians) * length,
    y: position.y + Math.sin(radians) * length
  };
}

/**
 * Hyperbolic tangent activation function
 * Returns value between -1 and 1
 */
export function hyperbolicTangent(x) {
  return (1 - Math.exp(-2 * x)) / (1 + Math.exp(-2 * x));
}

/**
 * Clamp a value between min and max
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Random float between min and max
 */
export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * Random integer between min (inclusive) and max (exclusive)
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * Convert degrees to radians
 */
export function degToRad(degrees) {
  return degrees * Math.PI / 180;
}

/**
 * Convert radians to degrees
 */
export function radToDeg(radians) {
  return radians * 180 / Math.PI;
}
