# motusleap-landing

Landing page for motusleap.com — an interactive WebGL particle experience.

## Architecture

Single-page Next.js 16 app with three visual layers stacked via z-index:

| Layer | z-index | Component | Purpose |
|-------|---------|-----------|---------|
| Background particles | 0 | `ParticleCanvas` → `ParticleField` | 1500 rising particles with cascade surges |
| Brand text | 10 | `BrandOverlay` | "MOTUS LEAP" with parallax + surge-synced glow |
| Foreground particles | 20 | `ForegroundCanvas` → `ForegroundParticles` | 60 dim particles for depth |

Shared surge timing is communicated via `surgeState.ts` — a plain module-level object (not React state). ParticleField writes, BrandOverlay reads, both at 60fps.

## Design Principles

- **"Motus" = purposeful upward motion.** Particles always rise. Never aimless drift.
- **"Leap" = periodic surge.** Golden ratio dual rhythm: major every 8s, minor every ~4.94s (8/phi). They never fully sync.
- **All motion is bounded.** Use `x = base + sin(t) * amplitude`, never `x += speed * dt`. Cumulative physics causes drift over time.
- **No mouse interaction on particles.** Cursor only affects text (parallax + is read by glow, but glow follows surges not mouse).
- **Separate brand identity.** This is NOT an ACC project. No ACC colors, no Lato font.

## Color Palette

- Void background: `#0a0e1a`
- Electric teal: `#00d4ff` (60% of particles)
- Warm amber: `#ff8a00` (20%)
- Cool white: `#e0e6f0` (20%)
- Text: `#f0f2f5`

## Font

**Syne** (Google Fonts) — angular, futuristic geometric sans-serif. Chosen for its kinetic character. Do NOT switch to Space Grotesk, Inter, or other common defaults.

## Key Constants (ParticleField.tsx)

| Constant | Value | Purpose |
|----------|-------|---------|
| `MAJOR_INTERVAL` | 8 | Seconds between major surges |
| `MINOR_INTERVAL` | 8/phi ≈ 4.94 | Minor surge interval |
| `MAJOR_DURATION` | 2.5 | How long a major surge lasts |
| `MINOR_DURATION` | 1.5 | How long a minor surge lasts |
| `BASE_RISE_SPEED` | 0.4 | World units/sec upward |
| `WOBBLE_STRENGTH` | 0.3 | Horizontal sine amplitude |

## Deployment

- **Platform:** Coolify on DigitalOcean VPS (Nixpacks)
- **Domain:** motusleap.com
- **Env var:** `NIXPACKS_NODE_VERSION=24` + `engines.node` in package.json
- **Build:** `npm run build` (Next.js static prerender)

## Development

```bash
npm run dev      # dev server at localhost:3000
npm run test     # vitest
npm run build    # production build
```

## Gotchas

- **Nixpacks + Node 24:** Must have `"engines": { "node": ">=24.0.0" }` in package.json for Nixpacks to select the correct nixpkgs archive. The env var alone is not sufficient.
- **Two Canvas elements:** Page renders two R3F `<Canvas>` instances (background + foreground). Tests must use `getAllByTestId` not `getByTestId`.
- **Particle sizes:** Use a weighted distribution (70% tiny, 22% medium, 8% large), not a uniform range — uniform looks monotone.
