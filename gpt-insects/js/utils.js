export function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function extendedPoint(origin, angleDeg, dist) {
  const rad = angleDeg * Math.PI / 180;
  return {
    x: origin.x + Math.cos(rad) * dist,
    y: origin.y + Math.sin(rad) * dist
  };
}

export function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Discretize a continuous value into one of `bins` integer bins.
 * value is expected in [minVal, maxVal].
 */
export function discretize(value, minVal, maxVal, bins) {
  const norm = clamp((value - minVal) / (maxVal - minVal), 0, 1);
  return Math.min(Math.floor(norm * bins), bins - 1);
}

/**
 * Convert a bin index back to the center of its range.
 */
export function undiscretize(bin, minVal, maxVal, bins) {
  return minVal + (bin + 0.5) * (maxVal - minVal) / bins;
}

/**
 * Sample from a probability distribution.
 */
export function sampleFromProbs(probs) {
  let r = Math.random();
  for (let i = 0; i < probs.length; i++) {
    r -= probs[i];
    if (r <= 0) return i;
  }
  return probs.length - 1;
}

/**
 * Apply temperature to logits and return probabilities.
 */
export function softmaxWithTemp(logits, temperature = 1.0) {
  const scaled = logits.map(l => l / temperature);
  let maxVal = -Infinity;
  for (const v of scaled) if (v > maxVal) maxVal = v;
  const exps = scaled.map(v => Math.exp(v - maxVal));
  const total = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / total);
}
