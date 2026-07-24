export type GameMode = 'start' | 'playing' | 'paused' | 'gameover';

export type MapTheme = 'modern' | 'desert' | 'steampunk';

export type ColorMode = 'light' | 'dark';

export type BirdSkin = 'classic' | 'vector' | 'pixel';

export interface GameSettings {
  soundEnabled: boolean;
  colorMode: ColorMode;
  mapTheme: MapTheme;
  birdSkin: BirdSkin;
}

export interface ScoreData {
  currentScore: number;
  highScore: number;
  mapHighScores: Record<MapTheme, number>;
  isNewHighScore: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  rotation?: number;
  vRot?: number;
  shape?: 'circle' | 'square' | 'gear' | 'star' | 'feather' | 'leaf' | 'diamond';
}

export interface TapIndicator {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
  showText?: boolean;
}

export interface Pipe {
  x: number;
  topHeight: number;
  bottomHeight: number;
  gap: number;
  passed: boolean;
  width: number;
  decoration?: {
    gearY?: number;
    cactusBranchY?: number;
    windowOffset?: number;
  };
}

export interface ThemeColors {
  bg: string;
  bgGradientEnd: string;
  ground: string;
  groundPattern: string;
  birdPrimary: string;
  birdSecondary: string;
  birdEye: string;
  birdWing: string;
  birdGlow?: string;
  obstacleBody: string;
  obstacleBorder: string;
  obstacleAccent: string;
  obstacleWindowBg?: string;
  cloudColor: string;
  particleColors: string[];
  hudText: string;
  panelBg: string;
  panelBorder: string;
}
