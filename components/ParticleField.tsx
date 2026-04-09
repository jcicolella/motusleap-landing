"use client";

import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SPREAD = 5; // radius of initial sphere
const DRIFT_SPEED = 0.03; // gentle — noise drives flow, not acceleration
const WRAP_BOUND = 6;
const MAX_VELOCITY = 0.008; // velocity cap prevents streaking
const GLOBAL_ROTATION_SPEED = 0.008; // rad/s — very slow cloud rotation

// Brand palette (linear-space values will be computed from these)
const PALETTE = [
  new THREE.Color("#00d4ff"), // electric teal
  new THREE.Color("#ff8a00"), // warm amber
  new THREE.Color("#e0e6f0"), // cool white
];

// Weight towards teal-heavy palette for cohesion (60/20/20 split)
const PALETTE_WEIGHTS = [0.6, 0.2, 0.2];

// ---------------------------------------------------------------------------
// Simplex-ish 3D noise (fast, good enough for flow fields)
// We use a classic permutation-table approach inlined for zero deps.
// ---------------------------------------------------------------------------

function buildPermTable(): Uint8Array {
  const p = new Uint8Array(512);
  const base = new Uint8Array(256);
  for (let i = 0; i < 256; i++) base[i] = i;
  // Fisher-Yates with deterministic seed
  let seed = 42;
  for (let i = 255; i > 0; i--) {
    seed = (seed * 16807) % 2147483647;
    const j = seed % (i + 1);
    [base[i], base[j]] = [base[j], base[i]];
  }
  for (let i = 0; i < 512; i++) p[i] = base[i & 255];
  return p;
}

const PERM = buildPermTable();

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function grad3d(hash: number, x: number, y: number, z: number): number {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

function noise3d(x: number, y: number, z: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const zf = z - Math.floor(z);
  const u = fade(xf);
  const v = fade(yf);
  const w = fade(zf);
  const A = PERM[X] + Y;
  const AA = PERM[A] + Z;
  const AB = PERM[A + 1] + Z;
  const B = PERM[X + 1] + Y;
  const BA = PERM[B] + Z;
  const BB = PERM[B + 1] + Z;
  return lerp(
    lerp(
      lerp(
        grad3d(PERM[AA], xf, yf, zf),
        grad3d(PERM[BA], xf - 1, yf, zf),
        u,
      ),
      lerp(
        grad3d(PERM[AB], xf, yf - 1, zf),
        grad3d(PERM[BB], xf - 1, yf - 1, zf),
        u,
      ),
      v,
    ),
    lerp(
      lerp(
        grad3d(PERM[AA + 1], xf, yf, zf - 1),
        grad3d(PERM[BA + 1], xf - 1, yf, zf - 1),
        u,
      ),
      lerp(
        grad3d(PERM[AB + 1], xf, yf - 1, zf - 1),
        grad3d(PERM[BB + 1], xf - 1, yf - 1, zf - 1),
        u,
      ),
      v,
    ),
    w,
  );
}

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aOpacity;
  attribute float aPhase;
  uniform float uTime;
  varying float vOpacity;
  varying vec3 vColor;

  void main() {
    // Subtle brightness pulse per-particle
    float pulse = 0.85 + 0.15 * sin(uTime * 1.2 + aPhase * 6.2831);
    vOpacity = aOpacity * pulse;
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

    // Soft glow falloff — brighter center, gentle fade
    float alpha = smoothstep(0.5, 0.05, dist) * vOpacity;

    // Additive-friendly: let color shine through
    gl_FragColor = vec4(vColor * alpha, alpha);
  }
`;

// ---------------------------------------------------------------------------
// Weighted random palette pick
// ---------------------------------------------------------------------------

function pickColor(rng: number): THREE.Color {
  let acc = 0;
  for (let i = 0; i < PALETTE.length; i++) {
    acc += PALETTE_WEIGHTS[i];
    if (rng < acc) return PALETTE[i];
  }
  return PALETTE[PALETTE.length - 1];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ParticleField() {
  const { size } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);

  // -------------------------------------------------------------------------
  // Responsive particle count
  // -------------------------------------------------------------------------

  const particleCount = useMemo(() => {
    const area = size.width * size.height;
    if (area < 500000) return 800;   // mobile
    if (area < 1500000) return 1200; // tablet
    return 1500;                     // desktop
  }, [size.width, size.height]);

  // -------------------------------------------------------------------------
  // Initialize particle data
  // -------------------------------------------------------------------------

  const { positions, velocities, colors, sizes, opacities, phases } =
    useMemo(() => {
      const pos = new Float32Array(particleCount * 3);
      const vel = new Float32Array(particleCount * 3);
      const col = new Float32Array(particleCount * 3);
      const sz = new Float32Array(particleCount);
      const op = new Float32Array(particleCount);
      const ph = new Float32Array(particleCount);

      for (let i = 0; i < particleCount; i++) {
        // Distribute in a sphere with slight clustering toward center
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = SPREAD * Math.pow(Math.random(), 0.45); // bias toward center
        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i * 3 + 2] = r * Math.cos(phi);

        // Small initial velocities
        vel[i * 3] = (Math.random() - 0.5) * 0.01;
        vel[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
        vel[i * 3 + 2] = (Math.random() - 0.5) * 0.01;

        // Color
        const c = pickColor(Math.random());
        col[i * 3] = c.r;
        col[i * 3 + 1] = c.g;
        col[i * 3 + 2] = c.b;

        // Varied sizes for depth — small and subtle
        sz[i] = 1.0 + Math.random() * 2.5;

        // Opacity — soft glow, not blinding
        op[i] = 0.2 + Math.random() * 0.5;

        // Phase offset for per-particle animations
        ph[i] = Math.random();
      }

      return {
        positions: pos,
        velocities: vel,
        colors: col,
        sizes: sz,
        opacities: op,
        phases: ph,
      };
    }, [particleCount]);

  // -------------------------------------------------------------------------
  // Initialize line geometry (pre-allocated buffer, updated each frame)
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // Uniforms
  // -------------------------------------------------------------------------

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
    }),
    [],
  );

  // -------------------------------------------------------------------------
  // Animation loop
  // -------------------------------------------------------------------------

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const geo = pointsRef.current.geometry;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;

    const dt = Math.min(delta, 0.05); // clamp to avoid jumps
    uniforms.uTime.value += dt;
    const t = uniforms.uTime.value;

    // --- Update particles ---
    for (let i = 0; i < particleCount; i++) {
      const ix = i * 3;
      const iy = ix + 1;
      const iz = ix + 2;

      let px = posArr[ix];
      let py = posArr[iy];
      let pz = posArr[iz];

      // Flow-field driven drift using 3D Perlin noise
      const noiseScale = 0.25;
      const nxVal = noise3d(
        px * noiseScale + t * 0.08,
        py * noiseScale,
        pz * noiseScale,
      );
      const nyVal = noise3d(
        px * noiseScale,
        py * noiseScale + t * 0.08,
        pz * noiseScale + 3.7,
      );
      const nzVal = noise3d(
        px * noiseScale + 7.1,
        py * noiseScale,
        pz * noiseScale + t * 0.08,
      );

      // Apply noise as acceleration
      velocities[ix] += nxVal * DRIFT_SPEED * dt;
      velocities[iy] += nyVal * DRIFT_SPEED * dt;
      velocities[iz] += nzVal * DRIFT_SPEED * dt;

      // Per-particle sine drift (unique phase, different frequencies per axis)
      const phase = phases[i] * Math.PI * 2;
      velocities[ix] += Math.sin(t * 0.3 + phase) * 0.0005 * dt;
      velocities[iy] += Math.cos(t * 0.25 + phase * 1.3) * 0.0005 * dt;
      velocities[iz] += Math.sin(t * 0.2 + phase * 0.7) * 0.0003 * dt;

      // Spring force — always pulls toward center, stronger the farther out
      // Prevents noise from sweeping all particles to one side
      const distFromOrigin = Math.sqrt(px * px + py * py + pz * pz);
      if (distFromOrigin > 0.1) {
        const springStrength = 0.0015 * distFromOrigin;
        velocities[ix] -= (px / distFromOrigin) * springStrength * dt;
        velocities[iy] -= (py / distFromOrigin) * springStrength * dt;
        velocities[iz] -= (pz / distFromOrigin) * springStrength * dt;
      }

      // Velocity cap
      const speed = Math.sqrt(
        velocities[ix] ** 2 + velocities[iy] ** 2 + velocities[iz] ** 2,
      );
      if (speed > MAX_VELOCITY) {
        const scale = MAX_VELOCITY / speed;
        velocities[ix] *= scale;
        velocities[iy] *= scale;
        velocities[iz] *= scale;
      }

      // Damping
      const damping = 0.94;
      velocities[ix] *= damping;
      velocities[iy] *= damping;
      velocities[iz] *= damping;

      // Apply velocity
      px += velocities[ix] * dt * 60;
      py += velocities[iy] * dt * 60;
      pz += velocities[iz] * dt * 60;

      // Soft wrapping — pull back toward center when too far out
      const distFromCenter = Math.sqrt(px * px + py * py + pz * pz);
      if (distFromCenter > WRAP_BOUND) {
        const pullback = 0.03 * (distFromCenter - WRAP_BOUND);
        px -= (px / distFromCenter) * pullback;
        py -= (py / distFromCenter) * pullback;
        pz -= (pz / distFromCenter) * pullback;
      }

      posArr[ix] = px;
      posArr[iy] = py;
      posArr[iz] = pz;
    }

    posAttr.needsUpdate = true;

    // --- Subtle global rotation ---
    if (groupRef.current) {
      groupRef.current.rotation.y += GLOBAL_ROTATION_SPEED * dt;
      groupRef.current.rotation.x =
        Math.sin(t * 0.1) * 0.02; // very gentle tilt oscillation
    }
  });

  // Build geometries imperatively (avoids R3F v9 bufferAttribute type issues)
  const particleGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute("aOpacity", new THREE.BufferAttribute(opacities, 1));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    return geo;
  }, [positions, colors, sizes, opacities, phases]);

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
