"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { surgeState } from "./surgeState";

// Text sits at roughly y=0 in world space. HALF_H ≈ 3.73.
// We check how close each wave front is to the text's vertical position.
const TEXT_WORLD_Y = 0;
const GLOW_REACH = 2.0; // how close the wave front needs to be to affect the text

export function BrandOverlay() {
  const [visible, setVisible] = useState(false);
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const rafRef = useRef<number>(0);
  const smoothRef = useRef({ x: 0, y: 0, glow: 0 });

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseRef.current.x = e.clientX / window.innerWidth;
    mouseRef.current.y = e.clientY / window.innerHeight;
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  useEffect(() => {
    const animate = () => {
      const s = smoothRef.current;
      const m = mouseRef.current;

      // Parallax (still mouse-driven — this is depth, not glow)
      const targetX = (m.x - 0.5) * -24;
      const targetY = (m.y - 0.5) * -16;
      s.x += (targetX - s.x) * 0.04;
      s.y += (targetY - s.y) * 0.04;

      // Surge-driven glow — how close is each wave front to the text?
      let targetGlow = 0;

      if (surgeState.majorWaveY > -900) {
        const dist = Math.abs(TEXT_WORLD_Y - surgeState.majorWaveY);
        if (dist < GLOW_REACH) {
          targetGlow += (1 - dist / GLOW_REACH) * surgeState.majorIntensity;
        }
      }

      if (surgeState.minorWaveY > -900) {
        const dist = Math.abs(TEXT_WORLD_Y - surgeState.minorWaveY);
        if (dist < GLOW_REACH) {
          targetGlow += (1 - dist / GLOW_REACH) * surgeState.minorIntensity * 0.5;
        }
      }

      targetGlow = Math.min(targetGlow, 1);
      s.glow += (targetGlow - s.glow) * 0.08; // slightly faster lerp for responsiveness

      if (h1Ref.current) {
        h1Ref.current.style.transform = visible
          ? `translate(${s.x}px, ${s.y}px)`
          : `translate(${s.x}px, ${s.y + 12}px)`;

        // Glow from below (particles are rising up through the text)
        // Shifts upward during surge, as if the wave is pushing light through
        const glowAlpha = 0.15 + s.glow * 0.6;
        const glowSpread = 12 + s.glow * 25;
        const glowY = 2 + s.glow * 6; // glow shifts upward during surge
        const wideAlpha = 0.08 + s.glow * 0.25;
        const wideSpread = 30 + s.glow * 20;

        h1Ref.current.style.textShadow = [
          // Core glow (shifts upward with surge)
          `0 ${glowY}px ${glowSpread}px rgba(0, 212, 255, ${glowAlpha})`,
          // Wide ambient halo
          `0 ${glowY * 0.5}px ${wideSpread}px rgba(0, 212, 255, ${wideAlpha})`,
          // Constant subtle base
          `0 2px 8px rgba(0, 212, 255, 0.12)`,
        ].join(", ");
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [visible]);

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center">
      <h1
        ref={h1Ref}
        className="text-ml-text font-[family-name:var(--font-syne)] font-extralight tracking-[0.3em] transition-opacity duration-1000 ease-out"
        style={{
          fontSize: "clamp(1.5rem, 6vw, 6rem)",
          opacity: visible ? 0.9 : 0,
          transform: "translateY(12px)",
          textShadow: "0 2px 8px rgba(0, 212, 255, 0.12)",
        }}
      >
        MOTUS LEAP
      </h1>
    </div>
  );
}
