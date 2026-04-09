# Motus Leap Landing Page — Design Spec

**Date:** 2026-04-09
**Status:** Approved
**Domain:** motusleap.com

## Purpose

A single-page, full-viewport interactive experience serving as the landing page for motusleap.com. The page presents the "Motus Leap" brand with deliberate ambiguity — no description of what it is, no calls to action, no promises. Just the name over a mesmerizing generative visual.

motusleap.com is a personal infrastructure domain hosting ACC-related projects on subdomains. The landing page exists to make the root domain look intentional and polished, not to market or explain anything.

## Visual Design

### Interactive WebGL Background

- **Engine:** Three.js particle/fluid simulation
- **Behavior:** A field of softly glowing particles that drift organically, reacting to mouse movement with subtle attraction/repulsion physics
- **Particles form loose, flowing structures** — never static, always evolving. The motion itself is the brand expression ("Motus" = movement, "Leap" = forward energy)
- **Color palette:**
  - Background void: deep navy `#0a0e1a`
  - Particle colors: electric teal `#00d4ff`, warm amber `#ff8a00`, cool white `#e0e6f0`
  - Colors create depth and energy against the dark backdrop
- **Mobile behavior:** Particles drift autonomously with gentle ambient motion. Gyroscope response if available, otherwise purely autonomous drift. No degraded experience — just a different input.

### Typography

- **Text:** "MOTUS LEAP" — large, centered, wide letter-spacing
- **Font:** Clean geometric sans-serif — Inter or Space Grotesk (Google Fonts)
- **Treatment:** Slightly translucent (`opacity: ~0.9`) so the particle field bleeds through subtly behind the text
- **Load animation:** Fade in with smooth opacity transition + slight upward drift, ~1s after page load
- **Nothing else:** No tagline, subtitle, description, links, navigation, or footer

### Favicon

- SVG geometric mark — abstract, minimal shape evoking forward motion (e.g., angular chevron, stylized "M" fragment, or leaping arc). Uses the same teal/amber palette as the particle system. Included from day one.

## Technical Architecture

### Framework & Deployment

- **Framework:** Next.js (App Router)
- **Single page:** `app/page.tsx` — no routing needed
- **Deployment:** Coolify on DigitalOcean VPS via Nixpacks
- **Domain:** motusleap.com (configured in Coolify)
- **Node version:** Pin to current LTS (verify at build time, currently 24.x)

### Three.js Particle System

- **Rendering:** WebGLRenderer, full viewport canvas behind the typography
- **Particle count:** Tuned for 60fps on mid-range hardware (~1000-2000 particles, scale with screen size)
- **Animation loop:** `requestAnimationFrame`
- **Mouse interaction:** Raycaster or projected mouse coordinates influence particle velocities (attraction within a radius, gentle repulsion at close range)
- **Particle properties:** Position, velocity, color, size, opacity — each particle slightly unique for organic feel
- **No heavy assets:** No textures, models, or large imports. Geometry + shaders only.

### Responsive Behavior

- Full viewport (`100dvh x 100dvw`) on all devices
- Particle density scales with screen size (fewer particles on small screens for performance)
- Typography scales with `clamp()` for fluid sizing
- Touch events mapped to particle interaction on mobile (touch point = mouse position)

### Meta / SEO

- `<title>`: "Motus Leap"
- OG tags: title only, no description (ambiguity is intentional)
- No robots restrictions — let it be indexed, there's just nothing to explain
- Minimal `<meta>` — viewport, charset, theme-color (`#0a0e1a`)

## Explicit Non-Goals

- No "coming soon" messaging
- No email signup or contact form
- No navigation, footer, or links to subdomains
- No social media links
- No analytics or tracking
- No ACC branding or color palette — fully separate identity
- No content beyond the brand name

## Dependencies

- `next` — framework
- `three` — WebGL/3D rendering
- `@react-three/fiber` + `@react-three/drei` — React bindings for Three.js (evaluate whether raw Three.js is simpler for this use case)
- Google Fonts (Inter or Space Grotesk) — loaded via `next/font`

## Open Questions

None — scope is intentionally minimal.
