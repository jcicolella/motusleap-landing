"use client";

import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const COUNT = 60;
const CAM_Z = 5;
const CAM_FOV = 75;
const HALF_H = CAM_Z * Math.tan((CAM_FOV / 2) * (Math.PI / 180));
const BASE_RISE_SPEED = 0.25; // slower than background — feels "closer"

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
  const { size } = useThree();
  const pointsRef = useRef<THREE.Points>(null);
  const groupRef = useRef<THREE.Group>(null);

  const halfW = useMemo(
    () => HALF_H * (size.width / size.height),
    [size.width, size.height],
  );

  const { positions, baseX, riseSpeeds, colors, sizes, opacities, phases } =
    useMemo(() => {
      const pos = new Float32Array(COUNT * 3);
      const bx = new Float32Array(COUNT);
      const rise = new Float32Array(COUNT);
      const col = new Float32Array(COUNT * 3);
      const sz = new Float32Array(COUNT);
      const op = new Float32Array(COUNT);
      const ph = new Float32Array(COUNT);

      for (let i = 0; i < COUNT; i++) {
        pos[i * 3] = (Math.random() - 0.5) * halfW * 2;
        pos[i * 3 + 1] = (Math.random() - 0.5) * HALF_H * 2;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 2;
        bx[i] = pos[i * 3];

        rise[i] = BASE_RISE_SPEED * (0.5 + Math.random() * 1.0);

        const c = PALETTE[Math.floor(Math.random() * PALETTE.length)];
        col[i * 3] = c.r;
        col[i * 3 + 1] = c.g;
        col[i * 3 + 2] = c.b;

        // Foreground: biased larger (closer to camera feel)
        sz[i] = Math.random() < 0.6
          ? 1.0 + Math.random() * 2.0
          : 3.5 + Math.random() * 4.0;
        op[i] = 0.08 + Math.random() * 0.18;
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
    }, [halfW]);

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
    const t = uniforms.uTime.value;

    const posAttr = pointsRef.current.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;

    const topEdge = HALF_H + 0.5;
    const bottomEdge = -HALF_H - 0.5;

    for (let i = 0; i < COUNT; i++) {
      const ix = i * 3;
      const phase = phases[i] * Math.PI * 2;

      // Upward drift
      posArr[ix + 1] += riseSpeeds[i] * dt;

      // Absolute wobble (no drift)
      posArr[ix] = baseX[i] + Math.sin(t * 0.3 + phase) * 0.2;

      // Recycle at top
      if (posArr[ix + 1] > topEdge) {
        const newX = (Math.random() - 0.5) * halfW * 2;
        posArr[ix] = newX;
        posArr[ix + 1] = bottomEdge;
        posArr[ix + 2] = (Math.random() - 0.5) * 2;
        baseX[i] = newX;
      }
    }

    posAttr.needsUpdate = true;

    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(uniforms.uTime.value * 0.025) * 0.06;
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
