"use client";

import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Viewport bounds (in world units at z=0 for camera at z=5, fov=75)
const CAM_Z = 5;
const CAM_FOV = 75;
const HALF_H = CAM_Z * Math.tan((CAM_FOV / 2) * (Math.PI / 180)); // ~3.73
const BASE_RISE_SPEED = 0.4; // base upward speed (world units/sec)
const WOBBLE_STRENGTH = 0.3; // horizontal sine drift amplitude
const SURGE_INTERVAL = 8; // seconds between cascade surges
const SURGE_DURATION = 2.5; // how long a surge lasts
const SURGE_MULTIPLIER = 3.0; // how much faster particles move during surge
const GLOBAL_ROTATION_SPEED = 0.006;

// Brand palette
const PALETTE = [
  new THREE.Color("#00d4ff"), // electric teal
  new THREE.Color("#ff8a00"), // warm amber
  new THREE.Color("#e0e6f0"), // cool white
];
const PALETTE_WEIGHTS = [0.6, 0.2, 0.2];

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aOpacity;
  attribute float aPhase;
  uniform float uTime;
  uniform float uSurgeProgress; // 0 = no surge, 0→1 = wave sweeping up
  uniform float uSurgeActive;   // 0 or 1
  varying float vOpacity;
  varying vec3 vColor;

  void main() {
    // Brightness pulse + surge brightening
    float pulse = 0.85 + 0.15 * sin(uTime * 1.2 + aPhase * 6.2831);

    // During surge, particles near the wave front glow brighter
    float surgeGlow = 0.0;
    if (uSurgeActive > 0.5) {
      // Wave front position in normalized y (-1 to 1)
      float waveFront = mix(-1.2, 1.2, uSurgeProgress);
      // How close this particle is to the wave front (in clip space y)
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      float normalizedY = worldPos.y / 3.73; // approximate half-height
      float distToWave = abs(normalizedY - waveFront);
      surgeGlow = smoothstep(0.6, 0.0, distToWave) * 0.4;
    }

    vOpacity = aOpacity * (pulse + surgeGlow);
    vColor = color;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (80.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  varying float vOpacity;
  varying vec3 vColor;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float alpha = smoothstep(0.5, 0.05, dist) * vOpacity;
    gl_FragColor = vec4(vColor * alpha, alpha);
  }
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickColor(rng: number): THREE.Color {
  let acc = 0;
  for (let i = 0; i < PALETTE.length; i++) {
    acc += PALETTE_WEIGHTS[i];
    if (rng < acc) return PALETTE[i];
  }
  return PALETTE[PALETTE.length - 1];
}

// Spawn a particle at a random position within the viewport bounds
function spawnParticle(
  posArr: Float32Array,
  i3: number,
  halfW: number,
  yPosition?: number,
) {
  posArr[i3] = (Math.random() - 0.5) * halfW * 2; // x: full width
  posArr[i3 + 1] = yPosition ?? (Math.random() - 0.5) * HALF_H * 2; // y
  posArr[i3 + 2] = (Math.random() - 0.5) * 3; // z: shallow depth
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ParticleField() {
  const { size } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);

  const halfW = useMemo(
    () => HALF_H * (size.width / size.height),
    [size.width, size.height],
  );

  // Responsive particle count
  const particleCount = useMemo(() => {
    const area = size.width * size.height;
    if (area < 500000) return 800;
    if (area < 1500000) return 1200;
    return 1500;
  }, [size.width, size.height]);

  // Initialize particle data
  const { positions, riseSpeeds, colors, sizes, opacities, phases } =
    useMemo(() => {
      const pos = new Float32Array(particleCount * 3);
      const rise = new Float32Array(particleCount); // per-particle rise speed
      const col = new Float32Array(particleCount * 3);
      const sz = new Float32Array(particleCount);
      const op = new Float32Array(particleCount);
      const ph = new Float32Array(particleCount);

      for (let i = 0; i < particleCount; i++) {
        // Spread across the visible viewport
        spawnParticle(pos, i * 3, halfW);

        // Each particle rises at a slightly different speed
        rise[i] = BASE_RISE_SPEED * (0.6 + Math.random() * 0.8);

        const c = pickColor(Math.random());
        col[i * 3] = c.r;
        col[i * 3 + 1] = c.g;
        col[i * 3 + 2] = c.b;

        sz[i] = 1.0 + Math.random() * 2.5;
        op[i] = 0.15 + Math.random() * 0.45;
        ph[i] = Math.random();
      }

      return {
        positions: pos,
        riseSpeeds: rise,
        colors: col,
        sizes: sz,
        opacities: op,
        phases: ph,
      };
    }, [particleCount, halfW]);

  // Uniforms
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSurgeProgress: { value: 0 },
      uSurgeActive: { value: 0 },
    }),
    [],
  );

  // Geometry
  const particleGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute("aOpacity", new THREE.BufferAttribute(opacities, 1));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    return geo;
  }, [positions, colors, sizes, opacities, phases]);

  // Animation loop
  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;

    const dt = Math.min(delta, 0.05);
    uniforms.uTime.value += dt;
    const t = uniforms.uTime.value;

    // --- Cascade surge timing ---
    const cycleTime = t % SURGE_INTERVAL;
    const surgeStart = SURGE_INTERVAL - SURGE_DURATION;
    const isSurging = cycleTime > surgeStart;
    const surgeProgress = isSurging
      ? (cycleTime - surgeStart) / SURGE_DURATION
      : 0;
    uniforms.uSurgeActive.value = isSurging ? 1 : 0;
    uniforms.uSurgeProgress.value = surgeProgress;

    // Wave front y-position (sweeps from bottom to top during surge)
    const waveFrontY = isSurging
      ? -HALF_H + surgeProgress * HALF_H * 2.4
      : -999;

    const topEdge = HALF_H + 0.5; // slightly above visible area
    const bottomEdge = -HALF_H - 0.5; // slightly below

    // --- Update particles ---
    for (let i = 0; i < particleCount; i++) {
      const ix = i * 3;
      const iy = ix + 1;
      const iz = ix + 2;

      let py = posArr[iy];
      const phase = phases[i] * Math.PI * 2;

      // Base upward rise
      let riseSpeed = riseSpeeds[i];

      // Surge boost — particles near the wave front get accelerated
      if (isSurging) {
        const distToWave = Math.abs(py - waveFrontY);
        if (distToWave < 1.5) {
          const boost = (1 - distToWave / 1.5) * SURGE_MULTIPLIER;
          riseSpeed *= 1 + boost;
        }
      }

      // Apply upward movement
      posArr[iy] += riseSpeed * dt;

      // Gentle horizontal wobble (sine-driven, unique per particle)
      posArr[ix] += Math.sin(t * 0.4 + phase) * WOBBLE_STRENGTH * dt;

      // Very subtle z wobble
      posArr[iz] += Math.sin(t * 0.2 + phase * 1.7) * 0.05 * dt;

      // Recycle particles that rise above the viewport
      if (posArr[iy] > topEdge) {
        spawnParticle(posArr, ix, halfW, bottomEdge);
      }
    }

    posAttr.needsUpdate = true;

    // Subtle global rotation
    if (groupRef.current) {
      groupRef.current.rotation.y += GLOBAL_ROTATION_SPEED * dt;
      groupRef.current.rotation.x = Math.sin(t * 0.1) * 0.015;
    }
  });

  return (
    <group ref={groupRef}>
      <points ref={pointsRef} geometry={particleGeometry}>
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
