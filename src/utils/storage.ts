import { GameSettings, MapTheme } from '../types';

const SETTINGS_KEY = 'flappy_bird_settings_v1';
const HIGH_SCORES_KEY = 'flappy_bird_highscores_v1';

export const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  colorMode: 'light',
  mapTheme: 'modern',
  birdSkin: 'classic',
};

export const getSavedSettings = (): GameSettings => {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : true,
      colorMode: parsed.colorMode === 'dark' ? 'dark' : 'light',
      mapTheme: ['modern', 'desert', 'steampunk'].includes(parsed.mapTheme) ? parsed.mapTheme : 'modern',
      birdSkin: ['classic', 'vector', 'pixel'].includes(parsed.birdSkin) ? parsed.birdSkin : 'classic',
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings: GameSettings) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage quota or restriction
  }
};

export const getSavedHighScores = (): Record<MapTheme, number> => {
  const fallback = { modern: 0, desert: 0, steampunk: 0 };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(HIGH_SCORES_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      modern: typeof parsed.modern === 'number' ? parsed.modern : 0,
      desert: typeof parsed.desert === 'number' ? parsed.desert : 0,
      steampunk: typeof parsed.steampunk === 'number' ? parsed.steampunk : 0,
    };
  } catch {
    return fallback;
  }
};

export const saveHighScoreForMap = (map: MapTheme, score: number): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const scores = getSavedHighScores();
    if (score > (scores[map] || 0)) {
      scores[map] = score;
      localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(scores));
      return true; // New record achieved!
    }
  } catch {
    // Storage error
  }
  return false;
};
