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
// Phi-based dual surge rhythm — two cycles that never fully sync
const PHI = 1.618033988749895;
const MAJOR_INTERVAL = 8; // major surge cycle (seconds)
const MINOR_INTERVAL = MAJOR_INTERVAL / PHI; // ~4.94s — golden ratio relationship
const MAJOR_DURATION = 2.5;
const MINOR_DURATION = 1.5;
const MAJOR_MULTIPLIER = 3.0;
const MINOR_MULTIPLIER = 1.8;

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
  uniform float uMajorWaveFront; // y-position of major wave front (-999 = inactive)
  uniform float uMinorWaveFront; // y-position of minor wave front (-999 = inactive)
  uniform float uMajorIntensity; // 0-1 intensity of major surge
  uniform float uMinorIntensity; // 0-1 intensity of minor surge
  varying float vOpacity;
  varying vec3 vColor;

  void main() {
    float pulse = 0.85 + 0.15 * sin(uTime * 1.2 + aPhase * 6.2831);

    // Surge glow — particles near either wave front brighten
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    float py = worldPos.y;

    float majorGlow = 0.0;
    if (uMajorWaveFront > -900.0) {
      float dist = abs(py - uMajorWaveFront);
      majorGlow = smoothstep(1.5, 0.0, dist) * 0.5 * uMajorIntensity;
    }

    float minorGlow = 0.0;
    if (uMinorWaveFront > -900.0) {
      float dist = abs(py - uMinorWaveFront);
      minorGlow = smoothstep(1.0, 0.0, dist) * 0.25 * uMinorIntensity;
    }

    vOpacity = aOpacity * (pulse + majorGlow + minorGlow);
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
  const { positions, baseX, riseSpeeds, colors, sizes, opacities, phases } =
    useMemo(() => {
      const pos = new Float32Array(particleCount * 3);
      const bx = new Float32Array(particleCount); // home x position for wobble
      const rise = new Float32Array(particleCount);
      const col = new Float32Array(particleCount * 3);
      const sz = new Float32Array(particleCount);
      const op = new Float32Array(particleCount);
      const ph = new Float32Array(particleCount);

      for (let i = 0; i < particleCount; i++) {
        spawnParticle(pos, i * 3, halfW);
        bx[i] = pos[i * 3]; // store initial x as home position

        rise[i] = BASE_RISE_SPEED * (0.6 + Math.random() * 0.8);

        const c = pickColor(Math.random());
        col[i * 3] = c.r;
        col[i * 3 + 1] = c.g;
        col[i * 3 + 2] = c.b;

        // Power curve — mostly small with a few noticeably larger ones
        const sizeRoll = Math.random();
        sz[i] = sizeRoll < 0.7
          ? 0.5 + Math.random() * 1.5   // 70%: tiny specks (0.5-2.0)
          : sizeRoll < 0.92
            ? 2.0 + Math.random() * 2.5 // 22%: medium (2.0-4.5)
            : 4.5 + Math.random() * 3.5; // 8%: large glowing dots (4.5-8.0)
        op[i] = 0.15 + Math.random() * 0.45;
        ph[i] = Math.random();
      }

      return {
        positions: pos,
        baseX: bx,
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
      uMajorWaveFront: { value: -999 },
      uMinorWaveFront: { value: -999 },
      uMajorIntensity: { value: 0 },
      uMinorIntensity: { value: 0 },
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

    // --- Dual surge timing (golden ratio rhythm) ---
    // Major surge
    const majorCycle = t % MAJOR_INTERVAL;
    const majorStart = MAJOR_INTERVAL - MAJOR_DURATION;
    const majorActive = majorCycle > majorStart;
    const majorProgress = majorActive
      ? (majorCycle - majorStart) / MAJOR_DURATION
      : 0;
    // Smooth intensity: ease in and out
    const majorIntensity = majorActive
      ? Math.sin(majorProgress * Math.PI)
      : 0;
    const majorWaveY = majorActive
      ? -HALF_H + majorProgress * HALF_H * 2.4
      : -999;

    // Minor surge (phi-offset cycle)
    const minorCycle = t % MINOR_INTERVAL;
    const minorStart = MINOR_INTERVAL - MINOR_DURATION;
    const minorActive = minorCycle > minorStart;
    const minorProgress = minorActive
      ? (minorCycle - minorStart) / MINOR_DURATION
      : 0;
    const minorIntensity = minorActive
      ? Math.sin(minorProgress * Math.PI)
      : 0;
    const minorWaveY = minorActive
      ? -HALF_H + minorProgress * HALF_H * 2.4
      : -999;

    // Pass to shader
    uniforms.uMajorWaveFront.value = majorWaveY;
    uniforms.uMinorWaveFront.value = minorWaveY;
    uniforms.uMajorIntensity.value = majorIntensity;
    uniforms.uMinorIntensity.value = minorIntensity;

    const topEdge = HALF_H + 0.5;
    const bottomEdge = -HALF_H - 0.5;

    // --- Update particles ---
    for (let i = 0; i < particleCount; i++) {
      const ix = i * 3;
      const iy = ix + 1;
      const iz = ix + 2;

      let py = posArr[iy];
      const phase = phases[i] * Math.PI * 2;

      // Base upward rise
      let riseSpeed = riseSpeeds[i];

      // Major surge boost
      if (majorActive) {
        const dist = Math.abs(py - majorWaveY);
        if (dist < 1.5) {
          const boost = (1 - dist / 1.5) * MAJOR_MULTIPLIER * majorIntensity;
          riseSpeed *= 1 + boost;
        }
      }

      // Minor surge boost
      if (minorActive) {
        const dist = Math.abs(py - minorWaveY);
        if (dist < 1.0) {
          const boost = (1 - dist / 1.0) * MINOR_MULTIPLIER * minorIntensity;
          riseSpeed *= 1 + boost;
        }
      }

      // Apply upward movement
      posArr[iy] += riseSpeed * dt;

      // Horizontal wobble — absolute offset from home x (no drift)
      posArr[ix] = baseX[i] + Math.sin(t * 0.4 + phase) * WOBBLE_STRENGTH;

      // Subtle z wobble — also absolute
      posArr[iz] = Math.sin(t * 0.2 + phase * 1.7) * 0.3;

      // Recycle at top
      if (posArr[iy] > topEdge) {
        spawnParticle(posArr, ix, halfW, bottomEdge);
        baseX[i] = posArr[ix]; // new home x
      }
    }

    posAttr.needsUpdate = true;

    // Subtle global rotation
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.03) * 0.08;
      groupRef.current.rotation.x = Math.sin(t * 0.02) * 0.015;
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
