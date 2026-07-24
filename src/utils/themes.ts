import { ColorMode, MapTheme, ThemeColors } from '../types';

export interface MapThemeMeta {
  id: MapTheme;
  name: string;
  tagline: string;
  lightDescription: string;
  darkDescription: string;
  iconName: string;
}

export const MAP_METADATA: Record<MapTheme, MapThemeMeta> = {
  modern: {
    id: 'modern',
    name: 'Modern Flat Vector',
    tagline: 'Clean geometric aesthetics & sharp window pillars',
    lightDescription: 'Off-white background, vivid orange bird, slate-gray pillars.',
    darkDescription: 'Charcoal background, bright yellow bird, deep blue obstacles.',
    iconName: 'Layout',
  },
  desert: {
    id: 'desert',
    name: 'Desert Jurassic',
    tagline: 'Ancient dunes & prehistoric Pterodactyl flight',
    lightDescription: 'Sand-beige dunes, terracotta Pterodactyl, sage green cacti.',
    darkDescription: 'Warm obsidian sky, amber sunset Pterodactyl, glowing emerald cacti.',
    iconName: 'Sun',
  },
  steampunk: {
    id: 'steampunk',
    name: 'Steampunk Brass',
    tagline: 'Clockwork avian mechanics & industrial copper pipes',
    lightDescription: 'Aged parchment background, polished brass bird, copper pipes & gears.',
    darkDescription: 'Dark leather brown sky, glowing copper bird, aged brass pipes.',
    iconName: 'Cog',
  },
};

export const getThemeColors = (map: MapTheme, mode: ColorMode): ThemeColors => {
  if (map === 'modern') {
    if (mode === 'light') {
      return {
        bg: '#f8fafc',
        bgGradientEnd: '#e2e8f0',
        ground: '#cbd5e1',
        groundPattern: '#94a3b8',
        birdPrimary: '#ff6600',
        birdSecondary: '#e65c00',
        birdEye: '#ffffff',
        birdWing: '#ff8533',
        obstacleBody: '#475569',
        obstacleBorder: '#334155',
        obstacleAccent: '#64748b',
        obstacleWindowBg: '#f1f5f9',
        cloudColor: 'rgba(203, 213, 225, 0.4)',
        particleColors: ['#ff6600', '#ff8533', '#cbd5e1', '#64748b'],
        hudText: '#0f172a',
        panelBg: 'rgba(255, 255, 255, 0.92)',
        panelBorder: '#cbd5e1',
      };
    } else {
      return {
        bg: '#0f172a',
        bgGradientEnd: '#1e293b',
        ground: '#334155',
        groundPattern: '#1e293b',
        birdPrimary: '#facc15',
        birdSecondary: '#eab308',
        birdEye: '#000000',
        birdWing: '#fef08a',
        obstacleBody: '#1e40af',
        obstacleBorder: '#1d4ed8',
        obstacleAccent: '#3b82f6',
        obstacleWindowBg: '#1e293b',
        cloudColor: 'rgba(30, 41, 59, 0.5)',
        particleColors: ['#facc15', '#eab308', '#3b82f6', '#60a5fa'],
        hudText: '#f8fafc',
        panelBg: 'rgba(15, 23, 42, 0.92)',
        panelBorder: '#334155',
      };
    }
  }

  if (map === 'desert') {
    if (mode === 'light') {
      return {
        bg: '#f5e6ca',
        bgGradientEnd: '#e2cc9d',
        ground: '#d4b373',
        groundPattern: '#be9954',
        birdPrimary: '#e05a36',
        birdSecondary: '#c84725',
        birdEye: '#ffffff',
        birdWing: '#f07856',
        obstacleBody: '#3e7a5e',
        obstacleBorder: '#2d5e46',
        obstacleAccent: '#589b78',
        obstacleWindowBg: '#f5e6ca',
        cloudColor: 'rgba(212, 179, 115, 0.3)',
        particleColors: ['#e05a36', '#f07856', '#d4b373', '#589b78'],
        hudText: '#422006',
        panelBg: 'rgba(253, 248, 238, 0.94)',
        panelBorder: '#d4b373',
      };
    } else {
      return {
        bg: '#1a1210',
        bgGradientEnd: '#2d1a15',
        ground: '#3d261e',
        groundPattern: '#261611',
        birdPrimary: '#f59e0b',
        birdSecondary: '#d97706',
        birdEye: '#000000',
        birdWing: '#fbbf24',
        birdGlow: '#f59e0b',
        obstacleBody: '#059669',
        obstacleBorder: '#10b981',
        obstacleAccent: '#34d399',
        cloudColor: 'rgba(45, 26, 21, 0.5)',
        particleColors: ['#f59e0b', '#fbbf24', '#10b981', '#34d399'],
        hudText: '#fef3c7',
        panelBg: 'rgba(26, 18, 16, 0.94)',
        panelBorder: '#3d261e',
      };
    }
  }

  // Steampunk Brass
  if (mode === 'light') {
    return {
      bg: '#f4ecd8',
      bgGradientEnd: '#e6d7b5',
      ground: '#c29b68',
      groundPattern: '#a37b46',
      birdPrimary: '#d97706',
      birdSecondary: '#b45309',
      birdEye: '#1e293b',
      birdWing: '#f59e0b',
      obstacleBody: '#c2410c',
      obstacleBorder: '#9a3412',
      obstacleAccent: '#ea580c',
      cloudColor: 'rgba(194, 155, 104, 0.35)',
      particleColors: ['#d97706', '#c2410c', '#f59e0b', '#e6d7b5'],
      hudText: '#451a03',
      panelBg: 'rgba(250, 245, 235, 0.94)',
      panelBorder: '#c29b68',
    };
  } else {
    return {
      bg: '#2a1f1b',
      bgGradientEnd: '#1a120f',
      ground: '#3f2d26',
      groundPattern: '#221612',
      birdPrimary: '#f97316',
      birdSecondary: '#ea580c',
      birdEye: '#ffffff',
      birdWing: '#fb923c',
      birdGlow: '#f97316',
      obstacleBody: '#ca8a04',
      obstacleBorder: '#a16207',
      obstacleAccent: '#eab308',
      cloudColor: 'rgba(63, 45, 38, 0.5)',
      particleColors: ['#f97316', '#fb923c', '#ca8a04', '#eab308'],
      hudText: '#ffedd5',
      panelBg: 'rgba(42, 31, 27, 0.94)',
      panelBorder: '#3f2d26',
    };
  }
};
