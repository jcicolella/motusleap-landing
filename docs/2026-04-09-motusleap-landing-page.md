# Motus Leap Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **REQUIRED SUB-SKILL:** Use `frontend-design:frontend-design` skill when implementing visual components (Tasks 3, 4, 5) for high design quality.

**Goal:** Build an interactive WebGL particle landing page for motusleap.com — a single-page experience with Three.js particles responding to mouse movement, the brand name floating over it, and nothing else.

**Architecture:** Next.js 16 App Router with a single page. A full-viewport `<canvas>` renders the Three.js particle system behind an absolutely positioned typography overlay. `@react-three/fiber` provides the React integration for Three.js, keeping the component model clean. Deployed via Coolify/Nixpacks.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Three.js, @react-three/fiber, @react-three/drei, Space Grotesk (Google Fonts)

**Spec:** `docs/superpowers/specs/2026-04-09-motusleap-landing-page-design.md`

---

## File Structure

```
motusleap-landing/
├── app/
│   ├── layout.tsx          # Root layout — font loading, metadata, global styles
│   ├── page.tsx            # Single page — composes ParticleCanvas + BrandOverlay
│   └── globals.css         # Tailwind import + @theme tokens (Motus Leap palette)
├── components/
│   ├── ParticleCanvas.tsx  # R3F Canvas wrapper — sets up scene, camera, renderer
│   ├── ParticleField.tsx   # The particle system — geometry, shaders, animation, mouse interaction
│   └── BrandOverlay.tsx    # "MOTUS LEAP" typography — centered, animated, translucent
├── public/
│   └── favicon.svg         # Geometric mark favicon
├── __tests__/
│   ├── page.test.tsx       # Page renders canvas + overlay
│   └── BrandOverlay.test.tsx # Typography renders correctly
├── next.config.ts          # Next.js config (minimal)
├── tsconfig.json
├── postcss.config.mjs
├── package.json
└── .gitignore
```

**Responsibilities:**
- `layout.tsx`: Font loading via `next/font/google`, `<html>` + `<body>` setup, metadata (title, OG, theme-color)
- `page.tsx`: Composes the two visual layers — canvas (background) and overlay (foreground)
- `globals.css`: Tailwind base import, Motus Leap color tokens via `@theme`
- `ParticleCanvas.tsx`: R3F `<Canvas>` with camera config, renderer settings (alpha, antialias), resize handling. Client component (`"use client"`)
- `ParticleField.tsx`: The core visual — creates a `BufferGeometry` of ~1500 particles with position/velocity/color attributes, runs a `useFrame` animation loop that applies drift + mouse-based attraction/repulsion forces, renders as `<points>` with a custom `ShaderMaterial`
- `BrandOverlay.tsx`: Absolutely positioned div centered over the canvas, "MOTUS LEAP" text with wide tracking, fade-in animation on mount

---

## Task 1: Project Scaffolding

**Files:**
- Create: `motusleap-landing/package.json`
- Create: `motusleap-landing/tsconfig.json`
- Create: `motusleap-landing/next.config.ts`
- Create: `motusleap-landing/postcss.config.mjs`
- Create: `motusleap-landing/.gitignore`
- Create: `motusleap-landing/app/globals.css`
- Create: `motusleap-landing/app/layout.tsx`
- Create: `motusleap-landing/app/page.tsx`

- [ ] **Step 1: Create the project directory and initialize git**

```bash
cd "/Users/johncicolella/Coding Projects"
mkdir motusleap-landing
cd motusleap-landing
git init
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "motusleap-landing",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@react-three/drei": "^10.0.0",
    "@react-three/fiber": "^9.0.0",
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "three": "^0.175.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/react": "^16.0.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/three": "^0.175.0",
    "@vitejs/plugin-react": "^4.0.0",
    "jsdom": "^26.0.0",
    "postcss": "^8.5.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create next.config.ts**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Three.js needs transpiling for tree-shaking
  transpilePackages: ["three"],
};

export default nextConfig;
```

- [ ] **Step 5: Create postcss.config.mjs**

```js
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

- [ ] **Step 6: Create .gitignore**

```
node_modules/
.next/
out/
.env
.env.local
*.tsbuildinfo
next-env.d.ts
```

- [ ] **Step 7: Create app/globals.css with Motus Leap color tokens**

```css
@import "tailwindcss";

@theme {
  --color-ml-void: #0a0e1a;
  --color-ml-teal: #00d4ff;
  --color-ml-amber: #ff8a00;
  --color-ml-white: #e0e6f0;
  --color-ml-text: #f0f2f5;
}
```

- [ ] **Step 8: Create app/layout.tsx with font loading and metadata**

```tsx
import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "Motus Leap",
  openGraph: {
    title: "Motus Leap",
  },
  other: {
    "theme-color": "#0a0e1a",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <body className="bg-ml-void text-ml-text antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 9: Create a placeholder app/page.tsx**

```tsx
export default function Home() {
  return (
    <main className="flex h-dvh w-dvw items-center justify-center">
      <h1 className="text-4xl font-light tracking-[0.3em] text-ml-text">
        MOTUS LEAP
      </h1>
    </main>
  );
}
```

- [ ] **Step 10: Install dependencies and verify dev server starts**

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` — should show "MOTUS LEAP" centered on a dark navy background.

- [ ] **Step 11: Commit scaffolding**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Tailwind and Motus Leap tokens"
```

---

## Task 2: Test Setup & Smoke Tests

**Files:**
- Create: `motusleap-landing/vitest.config.ts`
- Create: `motusleap-landing/__tests__/page.test.tsx`

- [ ] **Step 1: Create vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: [],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

- [ ] **Step 2: Write a smoke test for the page**

Create `__tests__/page.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Home from "@/app/page";

// Mock R3F Canvas — it requires WebGL which jsdom doesn't have
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="r3f-canvas">{children}</div>
  ),
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({
    size: { width: 1920, height: 1080 },
    mouse: { x: 0, y: 0 },
  })),
}));

vi.mock("@react-three/drei", () => ({}));

describe("Home page", () => {
  it("renders the brand name", () => {
    render(<Home />);
    expect(screen.getByText("MOTUS LEAP")).toBeDefined();
  });
});
```

- [ ] **Step 3: Run the test to verify it passes**

```bash
npx vitest run
```

Expected: PASS — "renders the brand name"

- [ ] **Step 4: Commit test setup**

```bash
git add vitest.config.ts __tests__/
git commit -m "test: add vitest setup and page smoke test"
```

---

## Task 3: Particle System — Core Component

> **Use `frontend-design:frontend-design` skill for visual quality.**

**Files:**
- Create: `motusleap-landing/components/ParticleCanvas.tsx`
- Create: `motusleap-landing/components/ParticleField.tsx`

- [ ] **Step 1: Create the ParticleCanvas wrapper**

Create `components/ParticleCanvas.tsx`:

```tsx
"use client";

import { Canvas } from "@react-three/fiber";
import { ParticleField } from "./ParticleField";

export function ParticleCanvas() {
  return (
    <div className="fixed inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 2]}
      >
        <ParticleField />
      </Canvas>
    </div>
  );
}
```

- [ ] **Step 2: Create the ParticleField component**

Create `components/ParticleField.tsx`:

This is the core visual component. It creates a buffer geometry with ~1500 particles, each with:
- Random initial position in a sphere
- Individual velocity for drift
- Color sampled from teal/amber/white palette
- Size variation for depth

The `useFrame` loop:
1. Applies gentle drift velocity to each particle
2. Calculates mouse influence (attraction at medium range, gentle repulsion up close)
3. Wraps particles that drift too far
4. Updates the buffer attributes

```tsx
"use client";

import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const PARTICLE_COUNT = 1500;

const COLORS = [
  new THREE.Color("#00d4ff"), // teal
  new THREE.Color("#00d4ff"),
  new THREE.Color("#ff8a00"), // amber
  new THREE.Color("#e0e6f0"), // white
  new THREE.Color("#e0e6f0"),
];

const vertexShader = `
  attribute float aSize;
  attribute float aOpacity;
  varying float vOpacity;
  varying vec3 vColor;

  void main() {
    vOpacity = aOpacity;
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying float vOpacity;
  varying vec3 vColor;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float alpha = smoothstep(0.5, 0.1, dist) * vOpacity;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

export function ParticleField() {
  const pointsRef = useRef<THREE.Points>(null);
  const mouseRef = useRef(new THREE.Vector2(0, 0));
  const { size } = useThree();

  const { positions, velocities, colors, sizes, opacities } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const opacities = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      // Spread particles in a sphere
      const radius = 4 + Math.random() * 4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = (Math.random() - 0.5) * 4;

      // Gentle random drift
      velocities[i3] = (Math.random() - 0.5) * 0.003;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.003;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.001;

      // Pick a color from the palette
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      sizes[i] = 1.5 + Math.random() * 3;
      opacities[i] = 0.3 + Math.random() * 0.7;
    }

    return { positions, velocities, colors, sizes, opacities };
  }, []);

  // Track mouse position in normalized device coordinates
  useMemo(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useFrame((_state, delta) => {
    if (!pointsRef.current) return;

    const posAttr = pointsRef.current.geometry.getAttribute(
      "position"
    ) as THREE.BufferAttribute;
    const posArray = posAttr.array as Float32Array;

    // Convert mouse NDC to world-space approximate position
    const mouseWorld = new THREE.Vector3(
      mouseRef.current.x * 5,
      mouseRef.current.y * 3,
      0
    );

    const clampedDelta = Math.min(delta, 0.05); // Prevent huge jumps on tab refocus

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      // Apply drift velocity
      posArray[i3] += velocities[i3] * clampedDelta * 60;
      posArray[i3 + 1] += velocities[i3 + 1] * clampedDelta * 60;
      posArray[i3 + 2] += velocities[i3 + 2] * clampedDelta * 60;

      // Mouse interaction — attraction at range, repulsion up close
      const dx = mouseWorld.x - posArray[i3];
      const dy = mouseWorld.y - posArray[i3 + 1];
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 3 && dist > 0.01) {
        const force = dist < 0.8 ? -0.015 : 0.003;
        const nx = dx / dist;
        const ny = dy / dist;
        posArray[i3] += nx * force * clampedDelta * 60;
        posArray[i3 + 1] += ny * force * clampedDelta * 60;
      }

      // Wrap particles that drift too far
      if (Math.abs(posArray[i3]) > 8) posArray[i3] *= -0.9;
      if (Math.abs(posArray[i3 + 1]) > 6) posArray[i3 + 1] *= -0.9;
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
        <bufferAttribute
          attach="attributes-aSize"
          args={[sizes, 1]}
        />
        <bufferAttribute
          attach="attributes-aOpacity"
          args={[opacities, 1]}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexColors
      />
    </points>
  );
}
```

- [ ] **Step 3: Run tests to confirm nothing broke**

```bash
npx vitest run
```

Expected: PASS

- [ ] **Step 4: Commit particle system**

```bash
git add components/
git commit -m "feat: add Three.js particle field with mouse interaction"
```

---

## Task 4: Brand Typography Overlay

> **Use `frontend-design:frontend-design` skill for visual quality.**

**Files:**
- Create: `motusleap-landing/components/BrandOverlay.tsx`
- Create: `motusleap-landing/__tests__/BrandOverlay.test.tsx`

- [ ] **Step 1: Write the failing test for BrandOverlay**

Create `__tests__/BrandOverlay.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BrandOverlay } from "@/components/BrandOverlay";

describe("BrandOverlay", () => {
  it("renders MOTUS LEAP text", () => {
    render(<BrandOverlay />);
    expect(screen.getByText("MOTUS LEAP")).toBeDefined();
  });

  it("has the correct accessibility role", () => {
    render(<BrandOverlay />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("MOTUS LEAP");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/BrandOverlay.test.tsx
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement BrandOverlay**

Create `components/BrandOverlay.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

export function BrandOverlay() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center">
      <h1
        className="text-center font-[family-name:var(--font-space-grotesk)] font-extralight tracking-[0.3em] text-ml-text transition-all duration-1000 ease-out sm:text-5xl md:text-7xl lg:text-8xl"
        style={{
          fontSize: "clamp(1.5rem, 6vw, 6rem)",
          opacity: visible ? 0.9 : 0,
          transform: visible ? "translateY(0)" : "translateY(12px)",
        }}
      >
        MOTUS LEAP
      </h1>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run __tests__/BrandOverlay.test.tsx
```

Expected: PASS — both tests green

- [ ] **Step 5: Commit overlay**

```bash
git add components/BrandOverlay.tsx __tests__/BrandOverlay.test.tsx
git commit -m "feat: add brand typography overlay with fade-in animation"
```

---

## Task 5: Compose the Page

> **Use `frontend-design:frontend-design` skill for visual quality.**

**Files:**
- Modify: `motusleap-landing/app/page.tsx`
- Modify: `motusleap-landing/__tests__/page.test.tsx`

- [ ] **Step 1: Update the page test to check for both layers**

Update `__tests__/page.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Home from "@/app/page";

vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="r3f-canvas">{children}</div>
  ),
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({
    size: { width: 1920, height: 1080 },
    mouse: { x: 0, y: 0 },
  })),
}));

vi.mock("@react-three/drei", () => ({}));

describe("Home page", () => {
  it("renders the brand name", () => {
    render(<Home />);
    expect(screen.getByText("MOTUS LEAP")).toBeDefined();
  });

  it("renders the Three.js canvas", () => {
    render(<Home />);
    expect(screen.getByTestId("r3f-canvas")).toBeDefined();
  });

  it("renders the brand name as an h1", () => {
    render(<Home />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("MOTUS LEAP");
  });
});
```

- [ ] **Step 2: Run tests to see the canvas test fail**

```bash
npx vitest run __tests__/page.test.tsx
```

Expected: FAIL — no element with testid "r3f-canvas" (page still uses placeholder)

- [ ] **Step 3: Update page.tsx to compose both layers**

Replace `app/page.tsx`:

```tsx
import { ParticleCanvas } from "@/components/ParticleCanvas";
import { BrandOverlay } from "@/components/BrandOverlay";

export default function Home() {
  return (
    <main className="h-dvh w-dvw overflow-hidden bg-ml-void">
      <ParticleCanvas />
      <BrandOverlay />
    </main>
  );
}
```

- [ ] **Step 4: Run tests to verify all pass**

```bash
npx vitest run
```

Expected: All tests PASS

- [ ] **Step 5: Run dev server and visually verify**

```bash
npm run dev
```

Visit `http://localhost:3000` — should show the particle field with "MOTUS LEAP" floating over it, particles responding to mouse movement.

- [ ] **Step 6: Commit composed page**

```bash
git add app/page.tsx __tests__/page.test.tsx
git commit -m "feat: compose particle canvas and brand overlay on home page"
```

---

## Task 6: Favicon

**Files:**
- Create: `motusleap-landing/public/favicon.svg`
- Modify: `motusleap-landing/app/layout.tsx`

- [ ] **Step 1: Create the geometric favicon**

Create `public/favicon.svg` — an abstract forward-leaping arc using the teal/amber palette:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <rect width="32" height="32" rx="6" fill="#0a0e1a"/>
  <path d="M8 22 Q16 4 26 14" stroke="#00d4ff" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <circle cx="26" cy="14" r="2.5" fill="#ff8a00"/>
</svg>
```

This draws a sweeping arc (the "leap") from bottom-left toward upper-right, ending in an amber dot — kinetic, minimal, recognizable at small sizes.

- [ ] **Step 2: Add favicon link to layout.tsx**

Add to the metadata export in `app/layout.tsx`:

```tsx
export const metadata: Metadata = {
  title: "Motus Leap",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Motus Leap",
  },
  other: {
    "theme-color": "#0a0e1a",
  },
};
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```

Check the browser tab — should show the geometric mark.

- [ ] **Step 4: Commit favicon**

```bash
git add public/favicon.svg app/layout.tsx
git commit -m "feat: add geometric favicon with leaping arc mark"
```

---

## Task 7: Mobile & Responsive Polish

**Files:**
- Modify: `motusleap-landing/components/ParticleField.tsx`
- Modify: `motusleap-landing/components/ParticleCanvas.tsx`

- [ ] **Step 1: Add responsive particle count**

In `ParticleField.tsx`, replace the static `PARTICLE_COUNT` with a responsive value. Update the component:

At the top of the `ParticleField` component function, before the `useMemo` that creates particle data:

```tsx
const { size } = useThree();
const particleCount = useMemo(() => {
  const area = size.width * size.height;
  if (area < 500000) return 800;   // mobile
  if (area < 1500000) return 1200; // tablet
  return 1500;                     // desktop
}, [size.width, size.height]);
```

Update the `useMemo` that creates positions/velocities/colors/sizes/opacities to use `particleCount` instead of `PARTICLE_COUNT`, and add `particleCount` to its dependency array.

Update the `useFrame` loop to iterate `particleCount` instead of `PARTICLE_COUNT`.

- [ ] **Step 2: Add touch event support to ParticleField**

Add alongside the existing `mousemove` listener in the `useMemo`:

```tsx
const handleTouchMove = (e: TouchEvent) => {
  if (e.touches.length > 0) {
    mouseRef.current.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
    mouseRef.current.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
  }
};
window.addEventListener("touchmove", handleTouchMove, { passive: true });
```

And clean it up in the return:

```tsx
return () => {
  window.removeEventListener("mousemove", handleMouseMove);
  window.removeEventListener("touchmove", handleTouchMove);
};
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run
```

Expected: PASS

- [ ] **Step 4: Commit responsive improvements**

```bash
git add components/
git commit -m "feat: add responsive particle count and touch support"
```

---

## Task 8: Production Build & Final Verification

**Files:**
- No new files

- [ ] **Step 1: Run the full test suite**

```bash
npx vitest run
```

Expected: All tests PASS

- [ ] **Step 2: Run a production build**

```bash
npm run build
```

Expected: Build succeeds with no errors. Note any warnings.

- [ ] **Step 3: Test the production server**

```bash
npm run start
```

Visit `http://localhost:3000` — verify:
- Particles render and drift
- Mouse interaction works (particles attract/repel)
- "MOTUS LEAP" fades in after ~1 second
- Favicon shows in browser tab
- Page is full viewport, no scroll
- Background is deep navy `#0a0e1a`

- [ ] **Step 4: Commit any fixes from production testing**

If the build required changes, commit them:

```bash
git add -A
git commit -m "fix: resolve production build issues"
```

If no changes were needed, skip this step.

---

## Task 9: Deploy to Coolify

**Files:**
- No code changes — deployment configuration only

- [ ] **Step 1: Create GitHub repository**

```bash
gh repo create motusleap-landing --public --source=. --push
```

- [ ] **Step 2: Deploy via Coolify**

In Coolify dashboard (`https://coolify.motusleap.com`):
1. New Resource -> Application -> GitHub -> select `motusleap-landing`
2. Coolify auto-detects Next.js via Nixpacks
3. Set environment variable: `NIXPACKS_NODE_VERSION=24`
4. Configure domain: `motusleap.com`
5. Deploy

- [ ] **Step 3: Verify live site**

Visit `https://motusleap.com` — full interactive experience should be live.

- [ ] **Step 4: Commit any deployment-related adjustments**

If Nixpacks or Coolify required config tweaks (e.g., a `nixpacks.toml`), commit them:

```bash
git add -A
git commit -m "chore: add deployment config for Coolify"
git push
```
