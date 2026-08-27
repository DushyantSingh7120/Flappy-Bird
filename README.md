# 🐤 Flappy Bird Arcade

A physics-driven retro arcade game built with React, TypeScript, and HTML5 Canvas that combines responsive controls with multi-theme rendering and procedural Web Audio synthesis. Players navigate dynamic obstacle courses with customizable bird skins, visual particle effects, and persistent local high-score tracking.

🕹️ **Live demo:** [flappy-dushyant.vercel.app](https://flappy-dushyant.vercel.app/)

## ✨ Features

- **Custom Physics & Dynamic Game Feel:** Parabolic jump arcs featuring gravity acceleration (`1050 px/s²`), flap impulse (`-340 px/s`), terminal fall speed capping (`700 px/s`), smooth velocity-driven rotational lerping, and camera screen shake on milestone scores.
- **Fair Inset AABB Collision Engine:** Axis-aligned bounding box collision detection with a 28% inset player hitbox (13px radius) for responsive, player-friendly collision testing against the ground, ceiling, and pipe columns.
- **Multiple Environments & Character Skins:** 3 themed map worlds (*Modern Flat Vector*, *Desert Jurassic*, and *Steampunk Brass*) with dedicated Light/Dark mode color palettes and 3 selectable bird skins (*Classic*, *Vector*, and *8-Bit Retro Pixel*).
- **Procedural Web Audio System:** Zero-asset audio engine powered by the browser Web Audio API that synthesizes real-time sound effects (flap, point score, pipe hit, button click, victory fanfare) and adaptive, tempo-scaling background music loops.
- **Persistent High Scores & Medal Tiers:** Per-map high score tracking stored via `localStorage`, awarding tiered achievement medals (*Bronze*, *Silver*, *Gold*, *Platinum*) with animated `motion` UI overlays.
- **PWA & Offline Play:** Complete Progressive Web App implementation with a Service Worker (`sw.js`) utilizing a stale-while-revalidate caching strategy and web app manifest for installable, offline-capable gameplay.

## 🛠️ Tech Stack

- **Frontend Framework:** React 19 (`react`, `react-dom`)
- **Language:** TypeScript (`~5.8.2`)
- **Build Tool & Bundler:** Vite 6 (`vite`, `@vitejs/plugin-react`)
- **Styling:** Tailwind CSS v4 (`tailwindcss`, `@tailwindcss/vite`)
- **Animations & Icons:** Motion (`motion`) and Lucide React (`lucide-react`)
- **Audio Engine:** Browser Web Audio API (procedural oscillator and gain synthesis)
- **PWA & Service Worker:** Custom Service Worker (`sw.js`) and Web App Manifest (`manifest.json`)

## ⚙️ How It Works

1. **Decoupled Game Loop & Canvas Rendering:** The game runs on a 60 FPS `requestAnimationFrame` loop inside `CanvasGame.tsx`. While screen states (start, playing, paused, gameover) and menus are managed declaratively using React hooks (`useState`, `useCallback`), all fast-path physics updates, particle systems (flap dust, weather effects, score bursts), and parallax background rendering are executed imperatively on a mutable `useRef` game state to eliminate React re-render overhead.
2. **Delta Time Physics with Frame Clamping:** Physics calculations calculate time deltas (`dt = (time - lastTime) / 1000`) and clamp `dt` to 50ms maximum. This protects against physics tunneling and runaway acceleration when switching or restoring browser tabs while maintaining smooth, frame-rate independent gravity integration and sprite rotation easing.
3. **Deterministic Inset AABB Collision Detection:** Collision tests evaluate an axis-aligned bounding box where the bird's hitbox is inset by 5px (`BIRD_HIT_R = 13px`) relative to its visual sprite radius (`BIRD_RADIUS = 18px`). The engine performs horizontal and vertical interval overlap checks against oncoming pipe pairs, the ceiling boundary, and the ground surface with floor-snapping to prevent sprite clipping.
4. **Procedural Web Audio & Particle Dispatch:** When flap, scoring, or collision events trigger, the engine dispatches directional particle instances into memory-managed particle arrays and simultaneously instructs `soundEngine` to generate dynamic sound waves via Web Audio oscillators, envelope gains, and noise buffers without loading external audio files.

## 🚀 Running Locally

- Clone this repository: `git clone https://github.com/DushyantSingh7120/Flappy-Bird.git`
- Install dependencies: `npm install`
- Start the dev server: `npm run dev`

## 🧠 What This Project Demonstrates

Built to showcase frontend game development fundamentals. It highlights how to bridge the gap between declarative React state management and the imperative, performance-heavy rendering required by the HTML5 Canvas API, all while maintaining strict typing with TypeScript.
