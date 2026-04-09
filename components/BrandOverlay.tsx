"use client";

import { useState, useEffect } from "react";

export function BrandOverlay() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
      <h1
        className="font-[family-name:var(--font-syne)] font-extralight tracking-[0.3em] transition-all duration-1000 ease-out"
        style={{
          fontSize: "clamp(1.5rem, 6vw, 6rem)",
          opacity: visible ? 0.9 : 0,
          transform: visible ? "translateY(0)" : "translateY(12px)",
          textShadow: "0 0 40px rgba(0, 212, 255, 0.15)",
        }}
      >
        MOTUS LEAP
      </h1>
    </div>
  );
}
