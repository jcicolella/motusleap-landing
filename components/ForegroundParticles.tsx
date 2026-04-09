"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const COUNT = 80;
const SPREAD = 6;
const DRIFT = 0.003;

const PALETTE = [
  new THREE.Color("#00d4ff"),
  new THREE.Color("#00d4ff"),
  new THREE.Color("#ff8a00"),
  new THREE.Color("#e0e6f0"),
];

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aOpacity;
  attribute float aPhase;
  uniform float uTime;
  varying float vOpacity;
  varying vec3 vColor;

  void main() {
    float pulse = 0.8 + 0.2 * sin(uTime * 0.8 + aPhase * 6.2831);
    vOpacity = aOpacity * pulse;
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (120.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  varying float vOpacity;
  varying vec3 vColor;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float alpha = smoothstep(0.5, 0.15, dist) * vOpacity;
    gl_FragColor = vec4(vColor * alpha, alpha);
  }
`;

export function ForegroundParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const groupRef = useRef<THREE.Group>(null);

  const { positions, velocities, colors, sizes, opacities, phases } =
    useMemo(() => {
      const pos = new Float32Array(COUNT * 3);
      const vel = new Float32Array(COUNT * 3);
      const col = new Float32Array(COUNT * 3);
      const sz = new Float32Array(COUNT);
      const op = new Float32Array(COUNT);
      const ph = new Float32Array(COUNT);

      for (let i = 0; i < COUNT; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = SPREAD * Math.pow(Math.random(), 0.4);
        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i * 3 + 2] = r * Math.cos(phi);

        vel[i * 3] = (Math.random() - 0.5) * DRIFT;
        vel[i * 3 + 1] = (Math.random() - 0.5) * DRIFT;
        vel[i * 3 + 2] = (Math.random() - 0.5) * DRIFT * 0.3;

        const c = PALETTE[Math.floor(Math.random() * PALETTE.length)];
        col[i * 3] = c.r;
        col[i * 3 + 1] = c.g;
        col[i * 3 + 2] = c.b;

        // Larger than background particles — "closer to camera"
        sz[i] = 1.5 + Math.random() * 3.0;

        // Much dimmer — don't obscure the text
        op[i] = 0.06 + Math.random() * 0.12;

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
    }, []);

  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute("aOpacity", new THREE.BufferAttribute(opacities, 1));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    return geo;
  }, [positions, colors, sizes, opacities, phases]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const dt = Math.min(delta, 0.05);
    uniforms.uTime.value += dt;

    const posAttr = pointsRef.current.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;

    for (let i = 0; i < COUNT; i++) {
      const ix = i * 3;
      // Gentle sine-driven drift — no noise needed for a small count
      const phase = phases[i] * Math.PI * 2;
      const t = uniforms.uTime.value;
      posArr[ix] += (velocities[ix] + Math.sin(t * 0.2 + phase) * 0.001) * dt * 60;
      posArr[ix + 1] += (velocities[ix + 1] + Math.cos(t * 0.15 + phase) * 0.001) * dt * 60;
      posArr[ix + 2] += velocities[ix + 2] * dt * 60;

      // Soft wrap
      const dist = Math.sqrt(posArr[ix] ** 2 + posArr[ix + 1] ** 2 + posArr[ix + 2] ** 2);
      if (dist > SPREAD + 1) {
        const pull = 0.02 * (dist - SPREAD);
        posArr[ix] -= (posArr[ix] / dist) * pull;
        posArr[ix + 1] -= (posArr[ix + 1] / dist) * pull;
        posArr[ix + 2] -= (posArr[ix + 2] / dist) * pull;
      }
    }

    posAttr.needsUpdate = true;

    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005 * dt;
    }
  });

  return (
    <group ref={groupRef}>
      <points ref={pointsRef} geometry={geometry}>
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
