import React, { useEffect, useRef, useCallback } from 'react';
import { BirdSkin, GameMode, GameSettings, Particle, Pipe, TapIndicator } from '../types';
import { getThemeColors } from '../utils/themes';
import { soundEngine } from '../utils/audio';

interface CanvasGameProps {
  gameMode: GameMode;
  settings: GameSettings;
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  onFirstFlap: () => void;
}

const GAME_WIDTH = 480;
const GAME_HEIGHT = 680;
const GROUND_HEIGHT = 80;
const BIRD_X = 110;
const BIRD_RADIUS = 18;

// Physics constants
const GRAVITY = 1050;           // px/s² — softened for a rounder, parabolic jump arc
const FLAP_IMPULSE = -340;      // px/s  — lighter impulse matches the lower gravity feel
const MAX_FALL_SPEED = 700;     // px/s  — terminal velocity cap, prevents runaway acceleration
const PIPE_SPEED = 185;         // px/s
const PIPE_SPAWN_INTERVAL = 1.65; // seconds
const PIPE_GAP = 160;           // px gap between top & bottom pipes
const MIN_PIPE_HEIGHT = 70;

// Collision hitbox: inset ~28% on every edge so the mathematical box
// is smaller than the visual sprite — gives players a fairer, more forgiving feel.
// BIRD_RADIUS=18 → inset 5px → effective half-extent = 13px on all axes.
const BIRD_HITBOX_INSET = 5;    // px shaved from each edge of the bounding circle radius
const BIRD_HIT_R = BIRD_RADIUS - BIRD_HITBOX_INSET; // = 13

// Visual rotation limits (radians). These are PURELY cosmetic — birdRotation
// is never read by collision code. The AABB hitbox is always axis-aligned.
const ROT_UP_MAX   = -Math.PI / 6;   // ≈ −30° — gentle nose-up tilt at jump peak
const ROT_DOWN_MAX =  Math.PI / 2;   // = +90°  — full nose-down at terminal velocity
const ROT_VEL_SCALE = 0.0028;        // maps px/s velocity → radians target angle
const ROT_LERP_SPEED = 7;            // lerp coefficient — lowered for smooth eased arc rotation

// Toggle true to render red outlines around every hitbox for visual QA.
const DEBUG_HITBOXES = false;

export const CanvasGame: React.FC<CanvasGameProps> = ({
  gameMode,
  settings,
  onScoreChange,
  onGameOver,
  onFirstFlap,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mutable game state stored in ref for 60fps render loop
  const gameState = useRef({
    birdY: GAME_HEIGHT / 2 - 40,
    birdVelocity: 0,
    birdRotation: 0,
    wingPhase: 0, // 0 to 1
    pipes: [] as Pipe[],
    particles: [] as Particle[],
    weatherParticles: [] as Particle[],
    tapIndicators: [] as TapIndicator[],
    score: 0,
    timeSinceLastPipe: 0,
    timeSinceWeatherSpawn: 0,
    groundOffset: 0,
    cloudOffset: 0,
    screenShakeTime: 0,
    screenShakeDuration: 0,
    screenShakeIntensity: 0,
    isDead: false,
    hasFlappedFirst: false,
  });

  const lastTimeRef = useRef<number>(0);
  const animFrameId = useRef<number | null>(null);

  const colors = getThemeColors(settings.mapTheme, settings.colorMode);

  // Sync mute state
  useEffect(() => {
    soundEngine.setMuted(!settings.soundEnabled);
  }, [settings.soundEnabled]);

  // Reset game state
  const resetGame = useCallback(() => {
    gameState.current = {
      birdY: GAME_HEIGHT / 2 - 40,
      birdVelocity: 0,
      birdRotation: 0,
      wingPhase: 0,
      pipes: [],
      particles: [],
      weatherParticles: [],
      tapIndicators: [],
      score: 0,
      timeSinceLastPipe: 1.0, // spawn first pipe soon
      timeSinceWeatherSpawn: 0,
      groundOffset: 0,
      cloudOffset: 0,
      screenShakeTime: 0,
      screenShakeDuration: 0,
      screenShakeIntensity: 0,
      isDead: false,
      hasFlappedFirst: false,
    };
    onScoreChange(0);
  }, [onScoreChange]);

  // Trigger Flap with optional tap coordinates
  const triggerFlap = useCallback((tapX?: number, tapY?: number) => {
    if (gameMode === 'start') {
      onFirstFlap();
      gameState.current.hasFlappedFirst = true;
    }

    if (gameMode !== 'playing' && gameMode !== 'start') return;

    soundEngine.playFlap();
    gameState.current.birdVelocity = FLAP_IMPULSE;
    gameState.current.wingPhase = 1.0; // max wing up

    const posX = tapX ?? BIRD_X;
    const posY = tapY ?? gameState.current.birdY;

    // Spawn visual TAP indicator / pulsing ripple
    gameState.current.tapIndicators.push({
      x: posX,
      y: posY,
      radius: 8,
      maxRadius: 44,
      life: 0,
      maxLife: 0.35,
      color: colors.birdPrimary,
      showText: true,
    });

    // Spawn flap particles (dust / feathers / steam)
    const pCount = 8;
    for (let i = 0; i < pCount; i++) {
      const pColor = i % 2 === 0 ? colors.birdPrimary : colors.particleColors[i % colors.particleColors.length];
      gameState.current.particles.push({
        x: BIRD_X - 10 + (Math.random() * 10 - 5),
        y: gameState.current.birdY + (Math.random() * 10 - 5),
        vx: -70 - Math.random() * 90,
        vy: (Math.random() - 0.5) * 90,
        size: Math.random() * 5 + 3,
        color: pColor,
        alpha: 1.0,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.25,
        rotation: Math.random() * Math.PI * 2,
        shape: settings.mapTheme === 'steampunk' ? 'square' : 'circle',
      });
    }
  }, [gameMode, onFirstFlap, colors, settings.mapTheme]);

  // Initialize & reset on gameMode change
  useEffect(() => {
    if (gameMode === 'start') {
      resetGame();
    }
  }, [gameMode, resetGame]);

  // Main Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset sentinel so the first frame of this loop instance is always a clean start
    lastTimeRef.current = 0;
    let running = true;

    const render = (time: number) => {
      if (!running) return;

      if (!lastTimeRef.current) lastTimeRef.current = time;
      let dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      // Clamp dt to 50 ms max — absorbs the safe budget after a tab-hide/restore
      // without physics tunneling or frame-time loss
      if (dt > 0.05) dt = 0.05;

      const state = gameState.current;

      // Update logic if playing
      if (gameMode === 'playing') {
        // Apply Gravity then clamp to terminal velocity
        state.birdVelocity += GRAVITY * dt;
        if (state.birdVelocity > MAX_FALL_SPEED) state.birdVelocity = MAX_FALL_SPEED;
        state.birdY += state.birdVelocity * dt;

        // Visual-only rotation — smoothly lerp current angle toward velocity-derived target.
        // birdRotation is NEVER read by AABB collision code; hitboxes remain axis-aligned.
        // Mapping: FLAP_IMPULSE (−340 px/s) → ROT_UP_MAX (≈−30°)
        //          MAX_FALL_SPEED (+700 px/s) → ROT_DOWN_MAX (+90°)
        // ROT_LERP_SPEED=7 ensures the tilt eases in/out like a smooth arc, not a snap.
        const targetRot = Math.min(ROT_DOWN_MAX, Math.max(ROT_UP_MAX, state.birdVelocity * ROT_VEL_SCALE));
        state.birdRotation += (targetRot - state.birdRotation) * ROT_LERP_SPEED * dt;

        // Wing flap cycle decay
        state.wingPhase = Math.max(0, state.wingPhase - 3 * dt);

        // Ground & Cloud scrolling
        state.groundOffset = (state.groundOffset + PIPE_SPEED * dt) % 30;
        state.cloudOffset = (state.cloudOffset + PIPE_SPEED * 0.2 * dt) % GAME_WIDTH;

        // Pipe Spawning
        state.timeSinceLastPipe += dt;
        if (state.timeSinceLastPipe >= PIPE_SPAWN_INTERVAL) {
          state.timeSinceLastPipe = 0;
          const maxPipeY = GAME_HEIGHT - GROUND_HEIGHT - MIN_PIPE_HEIGHT - PIPE_GAP;
          const topHeight = MIN_PIPE_HEIGHT + Math.random() * (maxPipeY - MIN_PIPE_HEIGHT);
          const bottomHeight = GAME_HEIGHT - GROUND_HEIGHT - topHeight - PIPE_GAP;

          state.pipes.push({
            x: GAME_WIDTH + 10,
            topHeight,
            bottomHeight,
            gap: PIPE_GAP,
            passed: false,
            width: 68,
            decoration: {
              gearY: Math.random() * (topHeight - 40) + 20,
              cactusBranchY: Math.random() * (bottomHeight - 40) + 20,
            },
          });
        }

        // Pipe Updates & Scoring
        for (let i = state.pipes.length - 1; i >= 0; i--) {
          const pipe = state.pipes[i];
          pipe.x -= PIPE_SPEED * dt;

          // Score point check
          if (!pipe.passed && pipe.x + pipe.width < BIRD_X) {
            pipe.passed = true;
            state.score += 1;
            onScoreChange(state.score);
            soundEngine.playScore();

            // Reward screen shake on passing through gap (subtle pulse, extra burst on milestone)
            const isMilestone = state.score > 0 && state.score % 5 === 0;
            state.screenShakeTime = isMilestone ? 0.22 : 0.14;
            state.screenShakeDuration = state.screenShakeTime;
            state.screenShakeIntensity = isMilestone ? 8 : 4;

            // Score burst particles
            for (let k = 0; k < 8; k++) {
              state.particles.push({
                x: BIRD_X,
                y: state.birdY,
                vx: (Math.random() - 0.5) * 120,
                vy: (Math.random() - 0.5) * 120,
                size: Math.random() * 4 + 2,
                color: colors.particleColors[k % colors.particleColors.length],
                alpha: 1.0,
                life: 0,
                maxLife: 0.4,
              });
            }
          }

          // Remove offscreen pipes
          if (pipe.x + pipe.width < -80) {
            state.pipes.splice(i, 1);
          }
        }

        // ── Collision Detection (Inset AABB) ───────────────────────────────────
        // Bird hitbox: axis-aligned rectangle, inset ~17% from visual radius on
        // every edge. Purely rectangular — no rotation, no trig.
        const groundY = GAME_HEIGHT - GROUND_HEIGHT;
        const bHitLeft   = BIRD_X      - BIRD_HIT_R;
        const bHitRight  = BIRD_X      + BIRD_HIT_R;
        const bHitTop    = state.birdY - BIRD_HIT_R;
        const bHitBottom = state.birdY + BIRD_HIT_R;

        // Ground hit — clamp Y so sprite rests visually on the floor before
        // game-over fires, preventing the bird from sinking into the ground.
        if (bHitBottom >= groundY) {
          state.birdY = groundY - BIRD_HIT_R; // snap to floor surface
          state.birdVelocity = 0;
          triggerGameOver('ground');
        }

        // Ceiling hit
        if (bHitTop <= 0) {
          state.birdY = BIRD_HIT_R; // snap to ceiling surface
          state.birdVelocity = 0;
          triggerGameOver('ground');
        }

        // Pipe AABB collision — pipe visual matches its logical rectangle exactly,
        // so no inset is applied to the pipe side.
        for (const pipe of state.pipes) {
          const pipeBottomEdge = groundY - pipe.bottomHeight;
          // X overlap
          if (bHitRight > pipe.x && bHitLeft < pipe.x + pipe.width) {
            // Y overlap with top pipe or bottom pipe
            if (bHitTop < pipe.topHeight || bHitBottom > pipeBottomEdge) {
              triggerGameOver('pipe');
              break;
            }
          }
        }
      } else if (gameMode === 'start') {
        // Idle gentle bobbing on home/start screen
        state.birdY = GAME_HEIGHT / 2 - 40 + Math.sin(time * 0.005) * 8;
        state.birdRotation = Math.sin(time * 0.005) * 0.08;
        state.groundOffset = (state.groundOffset + PIPE_SPEED * 0.5 * dt) % 30;
        state.cloudOffset = (state.cloudOffset + PIPE_SPEED * 0.1 * dt) % GAME_WIDTH;
      }

      // Weather Particle Spawning & Simulation
      state.timeSinceWeatherSpawn += dt;
      if (state.timeSinceWeatherSpawn >= 0.15) {
        state.timeSinceWeatherSpawn = 0;
        if (state.weatherParticles.length < 32) {
          if (settings.mapTheme === 'modern') {
            // Modern Vector: floating geometric diamond specks
            state.weatherParticles.push({
              x: GAME_WIDTH + 10,
              y: Math.random() * (GAME_HEIGHT - GROUND_HEIGHT - 40),
              vx: -70 - Math.random() * 50,
              vy: (Math.random() - 0.5) * 20,
              size: Math.random() * 3.5 + 2,
              color: colors.particleColors[Math.floor(Math.random() * colors.particleColors.length)],
              alpha: 0.8,
              life: 0,
              maxLife: 4.0 + Math.random() * 2,
              rotation: Math.random() * Math.PI,
              vRot: (Math.random() - 0.5) * 1.5,
              shape: 'diamond',
            });
          } else if (settings.mapTheme === 'desert') {
            // Desert Jurassic: sand dust grains drifting left with wave oscillation
            state.weatherParticles.push({
              x: GAME_WIDTH + 10,
              y: Math.random() * (GAME_HEIGHT - GROUND_HEIGHT - 20),
              vx: -110 - Math.random() * 80,
              vy: (Math.random() - 0.5) * 15,
              size: Math.random() * 3 + 1.5,
              color: colors.particleColors[Math.floor(Math.random() * colors.particleColors.length)],
              alpha: 0.75,
              life: 0,
              maxLife: 3.5 + Math.random() * 2,
              shape: 'circle',
            });
          } else if (settings.mapTheme === 'steampunk') {
            // Steampunk Brass: falling leaves/embers drifting down & left with rotation
            state.weatherParticles.push({
              x: Math.random() * (GAME_WIDTH + 120) - 40,
              y: -10,
              vx: -45 - Math.random() * 45,
              vy: 35 + Math.random() * 45,
              size: Math.random() * 5 + 3,
              color: colors.particleColors[Math.floor(Math.random() * colors.particleColors.length)],
              alpha: 0.85,
              life: 0,
              maxLife: 4.5 + Math.random() * 2,
              rotation: Math.random() * Math.PI * 2,
              vRot: (Math.random() - 0.5) * 2.5,
              shape: 'leaf',
            });
          }
        }
      }

      // Update Weather Particles
      for (let i = state.weatherParticles.length - 1; i >= 0; i--) {
        const p = state.weatherParticles[i];
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.vRot) p.rotation = (p.rotation || 0) + p.vRot * dt;

        if (settings.mapTheme === 'desert') {
          p.y += Math.sin((p.x + p.life * 120) * 0.02) * 0.6;
        } else if (settings.mapTheme === 'steampunk') {
          p.x += Math.sin(p.life * 3.5) * 0.8;
        }

        p.alpha = Math.min(1, Math.sin((p.life / p.maxLife) * Math.PI) * 0.85);

        if (p.life >= p.maxLife || p.x < -20 || p.y > GAME_HEIGHT - GROUND_HEIGHT + 10) {
          state.weatherParticles.splice(i, 1);
        }
      }

      // Update Action Particles (Flap/Explosion/Score)
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);
        if (p.life >= p.maxLife) {
          state.particles.splice(i, 1);
        }
      }

      // Update Tap Indicators
      for (let i = state.tapIndicators.length - 1; i >= 0; i--) {
        const t = state.tapIndicators[i];
        t.life += dt;
        if (t.life >= t.maxLife) {
          state.tapIndicators.splice(i, 1);
        }
      }

      // Decrement screen shake
      if (state.screenShakeTime > 0) {
        state.screenShakeTime = Math.max(0, state.screenShakeTime - dt);
      }

      // RENDER SECTION
      ctx.save();

      // Screen Shake translation with smooth intensity decay
      if (state.screenShakeTime > 0 && state.screenShakeDuration > 0) {
        const progress = state.screenShakeTime / state.screenShakeDuration;
        const currentMag = progress * state.screenShakeIntensity;
        const angle = Math.random() * Math.PI * 2;
        ctx.translate(Math.cos(angle) * currentMag, Math.sin(angle) * currentMag);
      }

      // Draw Background Gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
      bgGrad.addColorStop(0, colors.bg);
      bgGrad.addColorStop(1, colors.bgGradientEnd);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // Draw Background Parallax Elements (Clouds/Dunes/Gears)
      drawBackgroundDecorations(ctx, state.cloudOffset, settings.mapTheme, colors);

      // Draw Weather Particles (behind pipes and player)
      drawParticles(ctx, state.weatherParticles);

      // Draw Pipes
      state.pipes.forEach((pipe) => drawPipe(ctx, pipe, settings.mapTheme, colors));

      // Draw Ground
      drawGround(ctx, state.groundOffset, colors);

      // Draw Action Particles
      drawParticles(ctx, state.particles);

      // Draw Bird / Character
      drawCharacter(ctx, BIRD_X, state.birdY, state.birdRotation, state.wingPhase, settings.mapTheme, settings.birdSkin, colors);

      // Draw Tap Animations & Indicators
      drawTapIndicators(ctx, state.tapIndicators);

      // Debug hitbox outlines (set DEBUG_HITBOXES = true to enable)
      if (DEBUG_HITBOXES) {
        drawDebugHitboxes(ctx, state.birdY, state.pipes);
      }

      ctx.restore();

      animFrameId.current = requestAnimationFrame(render);
    };

    const triggerGameOver = (hitType: 'pipe' | 'ground' = 'pipe') => {
      const state = gameState.current;
      if (state.isDead) return;
      state.isDead = true;

      if (hitType === 'pipe') {
        state.screenShakeTime = 0.42;
        state.screenShakeDuration = 0.42;
        state.screenShakeIntensity = 18; // Heavy impact for obstacle collision
      } else {
        state.screenShakeTime = 0.32;
        state.screenShakeDuration = 0.32;
        state.screenShakeIntensity = 14; // Thud impact for ground/ceiling collision
      }

      soundEngine.playHit();

      // Spawn collision burst particles
      for (let i = 0; i < 24; i++) {
        const pColor = i % 2 === 0 ? colors.birdPrimary : colors.particleColors[i % colors.particleColors.length];
        state.particles.push({
          x: BIRD_X,
          y: state.birdY,
          vx: (Math.random() - 0.5) * 320,
          vy: (Math.random() - 0.5) * 320,
          size: Math.random() * 7 + 3,
          color: pColor,
          alpha: 1.0,
          life: 0,
          maxLife: 0.55,
          shape: settings.mapTheme === 'steampunk' ? 'square' : 'circle',
        });
      }

      onGameOver(state.score);
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      running = false;
      if (animFrameId.current !== null) {
        cancelAnimationFrame(animFrameId.current);
        animFrameId.current = null; // prevent stale-ID from cancelling a future unrelated frame
      }
    };
  }, [gameMode, settings.mapTheme, settings.colorMode, colors, onScoreChange, onGameOver]);

  // Keyboard & Click Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        triggerFlap();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerFlap]);

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement | null) => {
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e && (e as React.MouseEvent).clientX !== undefined) {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    } else {
      return null;
    }

    const scaleX = GAME_WIDTH / rect.width;
    const scaleY = GAME_HEIGHT / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (e.cancelable) {
      e.preventDefault();
    }
    e.stopPropagation();
    const coords = getCanvasCoords(e, canvasRef.current);
    triggerFlap(coords?.x, coords?.y);
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        onClick={handleCanvasClick}
        onTouchStart={handleCanvasClick}
        className="w-full max-w-[480px] h-full max-h-[680px] object-contain cursor-pointer shadow-2xl rounded-xl touch-none"
      />
    </div>
  );
};

// --- DRAWING HELPER FUNCTIONS ---

/**
 * DEBUG ONLY — renders red AABB outlines matching the exact collision boxes.
 * Bird box uses BIRD_HIT_R (inset). Pipe boxes match their visual rectangle exactly.
 * Enable by setting DEBUG_HITBOXES = true at the top of this file.
 */
function drawDebugHitboxes(ctx: CanvasRenderingContext2D, birdY: number, pipes: Pipe[]) {
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = '#ff0000';
  ctx.lineWidth = 1.5;

  // Bird inset AABB
  ctx.strokeRect(
    BIRD_X    - BIRD_HIT_R,
    birdY     - BIRD_HIT_R,
    BIRD_HIT_R * 2,
    BIRD_HIT_R * 2,
  );

  // Pipe AABBs (top + bottom, no inset)
  const groundY = GAME_HEIGHT - GROUND_HEIGHT;
  for (const pipe of pipes) {
    // Top pipe rectangle
    ctx.strokeRect(pipe.x, 0, pipe.width, pipe.topHeight);
    // Bottom pipe rectangle
    ctx.strokeRect(pipe.x, groundY - pipe.bottomHeight, pipe.width, pipe.bottomHeight);
  }

  ctx.restore();
}

function drawTapIndicators(ctx: CanvasRenderingContext2D, tapIndicators: TapIndicator[]) {
  ctx.save();
  tapIndicators.forEach((t) => {
    const progress = t.life / t.maxLife; // 0 to 1
    const currentRadius = t.radius + (t.maxRadius - t.radius) * progress;
    const alpha = Math.max(0, 1 - progress);

    ctx.globalAlpha = alpha;

    // Outer Pulse Ring
    ctx.beginPath();
    ctx.arc(t.x, t.y, currentRadius, 0, Math.PI * 2);
    ctx.strokeStyle = t.color;
    ctx.lineWidth = Math.max(1, 4.5 * (1 - progress));
    ctx.stroke();

    // Inner White Ring Accent
    ctx.beginPath();
    ctx.arc(t.x, t.y, Math.max(0, currentRadius - 7), 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, 2.5 * (1 - progress));
    ctx.stroke();

    // Center Dot Burst
    ctx.beginPath();
    ctx.arc(t.x, t.y, Math.max(0, 10 * (1 - progress)), 0, Math.PI * 2);
    ctx.fillStyle = t.color;
    ctx.fill();

    // Floating TAP! Badge
    if (t.showText) {
      ctx.font = '900 13px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const textY = t.y - currentRadius * 0.5 - 12 * progress;

      // Outer outline
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 3;
      ctx.strokeText('TAP!', t.x, textY);

      // Inner fill
      ctx.fillStyle = '#ffffff';
      ctx.fillText('TAP!', t.x, textY);
    }
  });
  ctx.restore();
}

function drawBackgroundDecorations(
  ctx: CanvasRenderingContext2D,
  cloudOffset: number,
  mapTheme: string,
  colors: ReturnType<typeof getThemeColors>
) {
  ctx.save();

  if (mapTheme === 'modern') {
    // LAYER 1: Far Distant Mountain / City Silhouette (0.08x parallax)
    const farOffset = (cloudOffset * 0.4) % (GAME_WIDTH * 2);
    ctx.fillStyle = colors.cloudColor;
    ctx.globalAlpha = 0.22;

    ctx.beginPath();
    ctx.moveTo(-50, GAME_HEIGHT - GROUND_HEIGHT);
    for (let x = -50; x <= GAME_WIDTH + 50; x += 15) {
      const hillY = GAME_HEIGHT - GROUND_HEIGHT - 105 + Math.sin((x + farOffset) * 0.008) * 32 + Math.cos((x + farOffset) * 0.018) * 14;
      ctx.lineTo(x, hillY);
    }
    ctx.lineTo(GAME_WIDTH + 50, GAME_HEIGHT - GROUND_HEIGHT);
    ctx.lineTo(-50, GAME_HEIGHT - GROUND_HEIGHT);
    ctx.fill();

    // LAYER 2: Mid-ground Puffy Procedural Vector Clouds (0.3x parallax)
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = colors.cloudColor;
    for (let i = 0; i < 4; i++) {
      const cx = ((i * 160 - cloudOffset * 1.3 + GAME_WIDTH * 3) % (GAME_WIDTH + 180)) - 80;
      const cy = 55 + (i % 3) * 38;
      const scale = 0.85 + (i % 2) * 0.25;

      ctx.beginPath();
      ctx.arc(cx, cy, 20 * scale, 0, Math.PI * 2);
      ctx.arc(cx + 16 * scale, cy - 9 * scale, 24 * scale, 0, Math.PI * 2);
      ctx.arc(cx + 38 * scale, cy - 5 * scale, 20 * scale, 0, Math.PI * 2);
      ctx.arc(cx + 52 * scale, cy, 16 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (mapTheme === 'desert') {
    // LAYER 1: Distant Mesa Mountains (0.1x parallax)
    const farOffset = (cloudOffset * 0.35) % (GAME_WIDTH * 2);
    ctx.fillStyle = colors.cloudColor;
    ctx.globalAlpha = 0.28;

    ctx.beginPath();
    ctx.moveTo(-50, GAME_HEIGHT - GROUND_HEIGHT);
    for (let x = -50; x <= GAME_WIDTH + 50; x += 15) {
      const mesaY = GAME_HEIGHT - GROUND_HEIGHT - 125 + Math.sin((x + farOffset) * 0.006) * 40;
      ctx.lineTo(x, mesaY);
    }
    ctx.lineTo(GAME_WIDTH + 50, GAME_HEIGHT - GROUND_HEIGHT);
    ctx.lineTo(-50, GAME_HEIGHT - GROUND_HEIGHT);
    ctx.fill();

    // Distant Sun / Moon with glowing aura
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.arc(GAME_WIDTH - 80, 95, 40, 0, Math.PI * 2);
    ctx.fillStyle = colors.cloudColor;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(GAME_WIDTH - 80, 95, 54, 0, Math.PI * 2);
    ctx.strokeStyle = colors.cloudColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.22;
    ctx.stroke();

    // LAYER 2: Mid-ground Layered Sand Dunes (0.25x parallax)
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = colors.cloudColor;
    ctx.beginPath();
    ctx.moveTo(0, GAME_HEIGHT - GROUND_HEIGHT);
    for (let x = 0; x <= GAME_WIDTH; x += 10) {
      const duneY = GAME_HEIGHT - GROUND_HEIGHT - 65 + Math.sin((x + cloudOffset) * 0.015) * 22;
      ctx.lineTo(x, duneY);
    }
    ctx.lineTo(GAME_WIDTH, GAME_HEIGHT - GROUND_HEIGHT);
    ctx.lineTo(0, GAME_HEIGHT - GROUND_HEIGHT);
    ctx.fill();
  } else if (mapTheme === 'steampunk') {
    // LAYER 1: Far Industrial Factory / Smokestack Skyline (0.08x parallax)
    const farOffset = (cloudOffset * 0.25) % GAME_WIDTH;
    ctx.fillStyle = colors.cloudColor;
    ctx.globalAlpha = 0.22;

    for (let i = 0; i < 6; i++) {
      const bx = ((i * 90 - farOffset + GAME_WIDTH * 2) % (GAME_WIDTH + 90)) - 40;
      const h = 75 + (i * 17) % 45;
      ctx.fillRect(bx, GAME_HEIGHT - GROUND_HEIGHT - h, 34, h);
      // Smokestack top brim
      ctx.fillRect(bx - 3, GAME_HEIGHT - GROUND_HEIGHT - h - 4, 40, 4);
    }

    // LAYER 2: Clockwork Parallax Gears & Steam Puffs (0.25x parallax)
    ctx.strokeStyle = colors.cloudColor;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 3;
    const gearX = (310 - cloudOffset * 0.8 + GAME_WIDTH * 2) % (GAME_WIDTH + 100) - 50;
    drawGear(ctx, gearX, 115, 48, 8, cloudOffset * 0.02);
    drawGear(ctx, (gearX + 115) % GAME_WIDTH, 170, 32, 6, -cloudOffset * 0.03);

    // Drifting Steam Clouds
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = colors.cloudColor;
    for (let i = 0; i < 3; i++) {
      const sx = ((i * 170 - cloudOffset * 1.1 + GAME_WIDTH * 2) % (GAME_WIDTH + 140)) - 70;
      const sy = 75 + i * 42;
      ctx.beginPath();
      ctx.arc(sx, sy, 18, 0, Math.PI * 2);
      ctx.arc(sx + 14, sy - 8, 22, 0, Math.PI * 2);
      ctx.arc(sx + 32, sy, 16, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawGear(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  teeth: number,
  angle: number
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  ctx.beginPath();
  for (let i = 0; i < teeth; i++) {
    const a = (i * 2 * Math.PI) / teeth;
    const innerR = radius - 8;
    const outerR = radius;
    ctx.lineTo(Math.cos(a - 0.1) * innerR, Math.sin(a - 0.1) * innerR);
    ctx.lineTo(Math.cos(a - 0.1) * outerR, Math.sin(a - 0.1) * outerR);
    ctx.lineTo(Math.cos(a + 0.1) * outerR, Math.sin(a + 0.1) * outerR);
    ctx.lineTo(Math.cos(a + 0.1) * innerR, Math.sin(a + 0.1) * innerR);
  }
  ctx.closePath();
  ctx.stroke();

  // Center hole
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.35, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawPipe(
  ctx: CanvasRenderingContext2D,
  pipe: Pipe,
  mapTheme: string,
  colors: ReturnType<typeof getThemeColors>
) {
  ctx.save();

  const topY = 0;
  const bottomY = GAME_HEIGHT - GROUND_HEIGHT - pipe.bottomHeight;

  if (mapTheme === 'modern') {
    // --- Modern Flat Vector: Slate-gray/blue geometric pillars with gap windows ---
    
    // Top Pillar Body
    ctx.fillStyle = colors.obstacleBody;
    ctx.fillRect(pipe.x, topY, pipe.width, pipe.topHeight);
    
    // Top Cap Rim
    ctx.fillStyle = colors.obstacleBorder;
    ctx.fillRect(pipe.x - 4, pipe.topHeight - 24, pipe.width + 8, 24);

    // Gap Window Accent on Top Pillar
    if (colors.obstacleWindowBg && pipe.topHeight > 80) {
      ctx.fillStyle = colors.obstacleWindowBg;
      ctx.fillRect(pipe.x + 16, pipe.topHeight - 75, pipe.width - 32, 36);
    }

    // Bottom Pillar Body
    ctx.fillStyle = colors.obstacleBody;
    ctx.fillRect(pipe.x, bottomY, pipe.width, pipe.bottomHeight);

    // Bottom Cap Rim
    ctx.fillStyle = colors.obstacleBorder;
    ctx.fillRect(pipe.x - 4, bottomY, pipe.width + 8, 24);

    // Gap Window Accent on Bottom Pillar
    if (colors.obstacleWindowBg && pipe.bottomHeight > 80) {
      ctx.fillStyle = colors.obstacleWindowBg;
      ctx.fillRect(pipe.x + 16, bottomY + 38, pipe.width - 32, 36);
    }
  } else if (mapTheme === 'desert') {
    // --- Desert Jurassic: Sage green or glowing emerald Cacti ---
    if (colors.obstacleBody) {
      if (colors.birdGlow) {
        ctx.shadowColor = colors.obstacleBorder;
        ctx.shadowBlur = 12;
      }

      // Top Cactus
      ctx.fillStyle = colors.obstacleBody;
      ctx.beginPath();
      ctx.roundRect(pipe.x, -20, pipe.width, pipe.topHeight + 20, [0, 0, 24, 24]);
      ctx.fill();

      // Top Cactus Ridge stripes
      ctx.strokeStyle = colors.obstacleBorder;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pipe.x + pipe.width * 0.35, 0);
      ctx.lineTo(pipe.x + pipe.width * 0.35, pipe.topHeight - 8);
      ctx.moveTo(pipe.x + pipe.width * 0.65, 0);
      ctx.lineTo(pipe.x + pipe.width * 0.65, pipe.topHeight - 8);
      ctx.stroke();

      // Bottom Cactus
      ctx.beginPath();
      ctx.roundRect(pipe.x, bottomY, pipe.width, pipe.bottomHeight + 20, [24, 24, 0, 0]);
      ctx.fill();

      // Bottom Cactus Ridge stripes
      ctx.beginPath();
      ctx.moveTo(pipe.x + pipe.width * 0.35, bottomY + 8);
      ctx.lineTo(pipe.x + pipe.width * 0.35, GAME_HEIGHT - GROUND_HEIGHT);
      ctx.moveTo(pipe.x + pipe.width * 0.65, bottomY + 8);
      ctx.lineTo(pipe.x + pipe.width * 0.65, GAME_HEIGHT - GROUND_HEIGHT);
      ctx.stroke();

      // Side Branch Arm on Bottom Cactus
      if (pipe.decoration?.cactusBranchY && pipe.bottomHeight > 100) {
        const branchY = bottomY + pipe.decoration.cactusBranchY;
        ctx.fillStyle = colors.obstacleBody;
        ctx.beginPath();
        ctx.roundRect(pipe.x + pipe.width, branchY, 20, 16, 8);
        ctx.roundRect(pipe.x + pipe.width + 10, branchY - 20, 14, 26, 7);
        ctx.fill();
      }
    }
  } else if (mapTheme === 'steampunk') {
    // --- Steampunk Brass: Industrial copper or aged brass pipes with gears & gauges ---
    
    // Top Copper Pipe
    ctx.fillStyle = colors.obstacleBody;
    ctx.fillRect(pipe.x + 4, topY, pipe.width - 8, pipe.topHeight);

    // Top Pipe Rim/Flange
    ctx.fillStyle = colors.obstacleBorder;
    ctx.fillRect(pipe.x - 3, pipe.topHeight - 22, pipe.width + 6, 22);

    // Metallic Pipe Highlight
    ctx.fillStyle = colors.obstacleAccent;
    ctx.fillRect(pipe.x + 10, topY, 8, pipe.topHeight - 22);

    // Bottom Copper Pipe
    ctx.fillStyle = colors.obstacleBody;
    ctx.fillRect(pipe.x + 4, bottomY, pipe.width - 8, pipe.bottomHeight);

    // Bottom Pipe Rim/Flange
    ctx.fillStyle = colors.obstacleBorder;
    ctx.fillRect(pipe.x - 3, bottomY, pipe.width + 6, 22);

    // Metallic Pipe Highlight
    ctx.fillStyle = colors.obstacleAccent;
    ctx.fillRect(pipe.x + 10, bottomY + 22, 8, pipe.bottomHeight - 22);

    // Decorative Pressure Gauge / Gear
    if (pipe.decoration?.gearY && pipe.topHeight > 90) {
      const gaugeY = pipe.topHeight - 50;
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(pipe.x + pipe.width / 2, gaugeY, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = colors.obstacleBorder;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Gauge Needle
      ctx.beginPath();
      ctx.moveTo(pipe.x + pipe.width / 2, gaugeY);
      ctx.lineTo(pipe.x + pipe.width / 2 + 6, gaugeY - 6);
      ctx.strokeStyle = '#dc2626';
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawGround(
  ctx: CanvasRenderingContext2D,
  groundOffset: number,
  colors: ReturnType<typeof getThemeColors>
) {
  ctx.save();
  const groundY = GAME_HEIGHT - GROUND_HEIGHT;

  // Base ground color
  ctx.fillStyle = colors.ground;
  ctx.fillRect(0, groundY, GAME_WIDTH, GROUND_HEIGHT);

  // Top border highlight
  ctx.fillStyle = colors.groundPattern;
  ctx.fillRect(0, groundY, GAME_WIDTH, 8);

  // Diagonal scrolling pattern stripes
  ctx.fillStyle = colors.groundPattern;
  for (let x = -30; x < GAME_WIDTH + 30; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x - groundOffset, groundY + 8);
    ctx.lineTo(x - groundOffset + 14, groundY + 8);
    ctx.lineTo(x - groundOffset - 2, groundY + GROUND_HEIGHT);
    ctx.lineTo(x - groundOffset - 16, groundY + GROUND_HEIGHT);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  ctx.save();
  particles.forEach((p) => {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;

    if (p.rotation !== undefined) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (p.shape === 'leaf') {
        // Render leaf / ember shape
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 1.5, p.size * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-p.size, 0);
        ctx.lineTo(p.size, 0);
        ctx.stroke();
      } else if (p.shape === 'diamond') {
        // Render diamond vector shape
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size * 0.8, 0);
        ctx.lineTo(0, p.size);
        ctx.lineTo(-p.size * 0.8, 0);
        ctx.closePath();
        ctx.fill();
      } else if (p.shape === 'square') {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    } else {
      if (p.shape === 'square') {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else if (p.shape === 'diamond') {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - p.size);
        ctx.lineTo(p.x + p.size * 0.8, p.y);
        ctx.lineTo(p.x, p.y + p.size);
        ctx.lineTo(p.x - p.size * 0.8, p.y);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
  ctx.restore();
}

function drawCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rotation: number,
  wingPhase: number,
  mapTheme: string,
  birdSkin: BirdSkin,
  colors: ReturnType<typeof getThemeColors>
) {
  // ctx.save/restore fully scopes translate+rotate to this sprite only.
  // No rotation state leaks to background layers, pipes, particles, or the UI overlay.
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  if (colors.birdGlow) {
    ctx.shadowColor = colors.birdGlow;
    ctx.shadowBlur = 14;
  }

  if (birdSkin === 'pixel') {
    // --- 8-BIT RETRO PIXEL ART SKIN ---
    const pSize = 2.8;
    const grid = [
      [0,0,0,1,1,1,1,0,0,0,0,0],
      [0,0,1,2,2,2,2,1,1,0,0,0],
      [0,1,2,2,2,2,4,4,4,1,0,0],
      [1,2,2,2,2,4,4,5,4,4,1,0],
      [1,2,2,2,2,4,4,4,4,6,6,1],
      [1,2,2,3,3,2,2,2,6,6,6,1],
      [1,2,3,3,3,3,2,2,6,6,6,1],
      [0,1,3,3,3,3,2,1,1,1,1,0],
      [0,0,1,1,1,1,1,0,0,0,0,0],
    ];

    const offsetX = -18;
    const offsetY = -13;

    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const val = grid[r][c];
        if (val === 0) continue;

        let pxColor = '#0f172a';
        if (val === 2) pxColor = colors.birdPrimary;
        else if (val === 3) pxColor = colors.birdSecondary;
        else if (val === 4) pxColor = '#ffffff';
        else if (val === 5) pxColor = '#0f172a';
        else if (val === 6) pxColor = '#f97316';

        ctx.fillStyle = pxColor;
        ctx.fillRect(offsetX + c * pSize, offsetY + r * pSize, pSize, pSize);
      }
    }

    // Flapping wing in pixel block
    const wingUp = wingPhase > 0.5;
    const wingYShift = wingUp ? -3 : 2;
    const wingGrid = [
      [1,1,1],
      [1,7,1],
      [0,1,1],
    ];
    for (let r = 0; r < wingGrid.length; r++) {
      for (let c = 0; c < wingGrid[r].length; c++) {
        const val = wingGrid[r][c];
        if (val === 0) continue;
        ctx.fillStyle = val === 1 ? '#0f172a' : colors.birdWing;
        ctx.fillRect(offsetX + (c + 2) * pSize, offsetY + (r + 4 + wingYShift) * pSize, pSize, pSize);
      }
    }

  } else if (birdSkin === 'classic') {
    // --- CLASSIC ARCADE CHUBBY BIRD SKIN ---
    const bodyColor = colors.birdPrimary;
    const outlineColor = '#1e293b';

    // Body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Belly Accent
    ctx.fillStyle = colors.birdSecondary;
    ctx.beginPath();
    ctx.arc(-2, 3, 12, 0.2, Math.PI - 0.2);
    ctx.fill();

    // Rosy Cheek Spot
    ctx.fillStyle = '#f87171';
    ctx.beginPath();
    ctx.arc(3, 4, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(8, -6, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pupil
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(9.5, -6, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Pupil Catchlight Dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(10.5, -7, 1, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(13, -3);
    ctx.lineTo(26, 1);
    ctx.lineTo(13, 7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Beak Mouth Line
    ctx.beginPath();
    ctx.moveTo(13, 2);
    ctx.lineTo(23, 2);
    ctx.stroke();

    // Flapping Wing
    const wingY = wingPhase * -14 + 1;
    ctx.fillStyle = colors.birdWing;
    ctx.beginPath();
    ctx.ellipse(-7, wingY, 11, 7, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 2;
    ctx.stroke();

  } else {
    // --- VECTOR SKIN (Sleek Theme-Aware Modern Vector) ---
    if (mapTheme === 'desert') {
      ctx.fillStyle = colors.birdPrimary;
      ctx.beginPath();
      ctx.moveTo(-10, -8);
      ctx.lineTo(-24, -14);
      ctx.lineTo(-6, -2);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 11, 0.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = colors.birdEye;
      ctx.beginPath();
      ctx.arc(8, -4, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = colors.birdSecondary;
      ctx.beginPath();
      ctx.moveTo(10, -5);
      ctx.lineTo(28, 2);
      ctx.lineTo(10, 5);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = colors.birdWing;
      ctx.beginPath();
      const wingY = wingPhase * -18 + 2;
      ctx.moveTo(-4, 0);
      ctx.lineTo(-12, wingY - 14);
      ctx.lineTo(6, wingY - 4);
      ctx.lineTo(10, 2);
      ctx.closePath();
      ctx.fill();

    } else if (mapTheme === 'steampunk') {
      ctx.fillStyle = colors.birdPrimary;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = colors.birdSecondary;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = colors.birdEye;
      ctx.beginPath();
      ctx.arc(7, -5, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = colors.birdSecondary;
      ctx.fillRect(-24, -4, 8, 3);
      ctx.beginPath();
      ctx.arc(-26, -2.5, 5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(12, -3);
      ctx.lineTo(25, 0);
      ctx.lineTo(12, 5);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = colors.birdWing;
      ctx.beginPath();
      const wingY = wingPhase * -16;
      ctx.roundRect(-10, wingY - 6, 16, 10, 4);
      ctx.fill();
      ctx.stroke();

    } else {
      ctx.fillStyle = colors.birdPrimary;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = colors.birdSecondary;
      ctx.beginPath();
      ctx.arc(-2, 4, 12, 0, Math.PI);
      ctx.fill();

      ctx.fillStyle = colors.birdEye;
      ctx.beginPath();
      ctx.arc(8, -6, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = colors.birdEye === '#ffffff' ? '#0f172a' : '#ffffff';
      ctx.beginPath();
      ctx.arc(9, -6, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(14, -2);
      ctx.lineTo(24, 2);
      ctx.lineTo(14, 6);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = colors.birdWing;
      ctx.beginPath();
      const wingOffsetY = wingPhase * -14 + 2;
      ctx.ellipse(-6, wingOffsetY, 12, 7, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}
