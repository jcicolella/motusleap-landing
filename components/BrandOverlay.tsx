"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export function BrandOverlay() {
  const [visible, setVisible] = useState(false);
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const rafRef = useRef<number>(0);
  const smoothRef = useRef({ x: 0, y: 0, shadowX: 0, shadowY: 0 });

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

  // Smooth animation loop — parallax + directional glow
  useEffect(() => {
    const animate = () => {
      const s = smoothRef.current;
      const m = mouseRef.current;

      // Parallax: mouse at center = no offset, edges = ±3px (inverted for depth)
      const targetX = (m.x - 0.5) * -6;
      const targetY = (m.y - 0.5) * -6;

      // Shadow offset: glow shifts TOWARD the mouse
      const targetShadowX = (m.x - 0.5) * 20;
      const targetShadowY = (m.y - 0.5) * 12;

      // Smooth lerp
      const lerp = 0.05;
      s.x += (targetX - s.x) * lerp;
      s.y += (targetY - s.y) * lerp;
      s.shadowX += (targetShadowX - s.shadowX) * lerp;
      s.shadowY += (targetShadowY - s.shadowY) * lerp;

      if (h1Ref.current) {
        h1Ref.current.style.transform = visible
          ? `translate(${s.x}px, ${s.y}px)`
          : `translate(${s.x}px, ${s.y + 12}px)`;

        // Directional teal glow that follows the cursor
        h1Ref.current.style.textShadow = [
          `${s.shadowX}px ${s.shadowY}px 50px rgba(0, 212, 255, 0.2)`,
          `0 0 30px rgba(0, 212, 255, 0.08)`,
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
          textShadow: "0 0 40px rgba(0, 212, 255, 0.15)",
        }}
      >
        MOTUS LEAP
      </h1>
    </div>
  );
}
