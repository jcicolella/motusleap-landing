// Shared surge state — written by ParticleField, read by BrandOverlay.
// Plain module-level object for zero-overhead cross-component communication.

export const surgeState = {
  majorIntensity: 0, // 0-1, sinusoidal
  minorIntensity: 0, // 0-1, sinusoidal
  majorWaveY: -999, // world-space y of major wave front
  minorWaveY: -999,
};
