"use client";

import { Canvas } from "@react-three/fiber";
import { ForegroundParticles } from "./ForegroundParticles";

export function ForegroundCanvas() {
  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 2]}
      >
        <ForegroundParticles />
      </Canvas>
    </div>
  );
}
