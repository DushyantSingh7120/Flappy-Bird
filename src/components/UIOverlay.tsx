import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Play,
  RotateCcw,
  Settings,
  Trophy,
  Pause,
  Home,
  Sparkles,
  Compass,
  Cog,
  Layout,
  Award,
  Bird,
  Zap,
  Grid,
} from 'lucide-react';
import { BirdSkin, GameMode, GameSettings, MapTheme, ScoreData } from '../types';
import { MAP_METADATA } from '../utils/themes';
import { soundEngine } from '../utils/audio';

interface UIOverlayProps {
  gameMode: GameMode;
  settings: GameSettings;
  scoreData: ScoreData;
  isSettingsOpen: boolean;
  onStartGame: () => void;
  onRestartGame: () => void;
  onPauseGame: () => void;
  onResumeGame: () => void;
  onHomeGame: () => void;
  onOpenSettings: () => void;
  onCloseSettings: () => void;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({
  gameMode,
  settings,
  scoreData,
  isSettingsOpen,
  onStartGame,
  onRestartGame,
  onPauseGame,
  onResumeGame,
  onHomeGame,
  onOpenSettings,
  onCloseSettings,
  onUpdateSettings,
}) => {
  const currentMapMeta = MAP_METADATA[settings.mapTheme];

  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    soundEngine.playClick();
    action();
  };

  const getMedal = (score: number, highScore: number) => {
    if (score <= 0) return null;

    // Calculate ratio relative to high score
    const ratio = highScore > 0 ? score / highScore : 1;

    // Platinum: New high score or matched high score (score >= 5) or score >= 40
    if ((score >= highScore && score >= 5) || score >= 40) {
      return {
        label: 'Platinum',
        color: 'from-cyan-400 to-blue-500',
        glow: 'border-cyan-400/60 shadow-cyan-500/30',
        icon: '🏆',
        bg: 'bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-400/50',
      };
    }
    // Gold: Reached at least 80% of high score or absolute score >= 25
    if (ratio >= 0.8 || score >= 25) {
      return {
        label: 'Gold',
        color: 'from-amber-300 to-yellow-500',
        glow: 'border-amber-400/60 shadow-amber-500/30',
        icon: '🥇',
        bg: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-400/50',
      };
    }
    // Silver: Reached at least 50% of high score or absolute score >= 12
    if (ratio >= 0.5 || score >= 12) {
      return {
        label: 'Silver',
        color: 'from-slate-300 to-slate-400',
        glow: 'border-slate-400/60 shadow-slate-400/30',
        icon: '🥈',
        bg: 'bg-slate-500/10 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-400/50',
      };
    }
    // Bronze: Reached at least 25% of high score or absolute score >= 3
    if (ratio >= 0.25 || score >= 3) {
      return {
        label: 'Bronze',
        color: 'from-amber-700 to-amber-900',
        glow: 'border-amber-700/60 shadow-amber-800/30',
        icon: '🥉',
        bg: 'bg-amber-800/10 dark:bg-amber-800/20 text-amber-800 dark:text-amber-500 border-amber-700/50',
      };
    }
    return null;
  };

  const medal = getMedal(scoreData.currentScore, scoreData.highScore);

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-between p-4 font-sans text-slate-800 dark:text-slate-100">
      
      {/* --- HUD SCORE & PAUSE HEADER (ACTIVE GAMEPLAY) --- */}
      {(gameMode === 'playing' || gameMode === 'paused') && (
        <div className="w-full max-w-[480px] flex items-center justify-between pt-2 px-2 pointer-events-auto">
          {/* Pause Button */}
          <button
            type="button"
            onClick={(e) => handleButtonClick(e, gameMode === 'paused' ? onResumeGame : onPauseGame)}
            className="p-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg text-slate-700 dark:text-slate-200 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            aria-label="Pause Game"
          >
            {gameMode === 'paused' ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5 fill-current" />}
          </button>

          {/* Current Score Counter */}
          <motion.div
            key={scoreData.currentScore}
            initial={{ scale: 1.3, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            className="px-6 py-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xl"
          >
            <span className="text-3xl font-black tracking-wider text-slate-900 dark:text-white drop-shadow-sm">
              {scoreData.currentScore}
            </span>
          </motion.div>

          {/* Settings / Sound Toggle Quick Action */}
          <button
            type="button"
            onClick={(e) => handleButtonClick(e, () => onUpdateSettings({ soundEnabled: !settings.soundEnabled }))}
            className="p-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg text-slate-700 dark:text-slate-200 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            aria-label="Toggle Sound"
          >
            {settings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-red-500" />}
          </button>
        </div>
      )}

      {/* --- START / HOME SCREEN OVERLAY --- */}
      {gameMode === 'start' && !isSettingsOpen && (
        <div className="my-auto w-full max-w-[400px] flex flex-col items-center gap-6 pointer-events-auto text-center px-4">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 rounded-full text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" /> Retro Arcade Edition
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white drop-shadow-md">
              FLAPPY <span className="text-orange-500">BIRD</span>
            </h1>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {currentMapMeta.name} • {settings.colorMode === 'dark' ? 'Night' : 'Day'} Mode
            </p>
          </motion.div>

          {/* High Score Badge */}
          <div className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-2xl shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-3 text-amber-500">
              <Trophy className="w-6 h-6" />
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Best Score</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{scoreData.highScore}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Current Map</p>
              <p className="text-sm font-bold text-orange-500">{currentMapMeta.name}</p>
            </div>
          </div>

          {/* Quick Map Selector Bar */}
          <div className="w-full flex items-center justify-center gap-2 bg-slate-200/60 dark:bg-slate-800/60 p-1.5 rounded-2xl backdrop-blur-sm">
            {(['modern', 'desert', 'steampunk'] as MapTheme[]).map((m) => {
              const active = settings.mapTheme === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={(e) => handleButtonClick(e, () => onUpdateSettings({ mapTheme: m }))}
                  className={`flex-1 py-2 px-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    active
                      ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-md scale-100'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {m === 'modern' && 'Vector'}
                  {m === 'desert' && 'Jurassic'}
                  {m === 'steampunk' && 'Brass'}
                </button>
              );
            })}
          </div>

          {/* Big Tap/Play Call to Action */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={(e) => handleButtonClick(e, onStartGame)}
            className="w-full py-4 px-6 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-orange-500/25 flex items-center justify-center gap-3 hover:from-orange-600 hover:to-amber-600 cursor-pointer"
          >
            <Play className="w-6 h-6 fill-current" />
            TAP OR PRESS SPACE TO FLAP
          </motion.button>

          {/* Bottom Action Controls */}
          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={(e) => handleButtonClick(e, onOpenSettings)}
              className="flex-1 py-3 px-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-sm text-slate-700 dark:text-slate-300 shadow-md flex items-center justify-center gap-2 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
            >
              <Settings className="w-4 h-4" /> Settings
            </button>
            <button
              type="button"
              onClick={(e) =>
                handleButtonClick(e, () =>
                  onUpdateSettings({
                    colorMode: settings.colorMode === 'light' ? 'dark' : 'light',
                  })
                )
              }
              className="p-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-700 dark:text-slate-300 shadow-md hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
              aria-label="Toggle Color Mode"
            >
              {settings.colorMode === 'light' ? <Moon className="w-5 h-5 text-indigo-500" /> : <Sun className="w-5 h-5 text-amber-400" />}
            </button>
          </div>
        </div>
      )}

      {/* --- PAUSE OVERLAY MODAL --- */}
      {gameMode === 'paused' && (
        <div className="my-auto w-full max-w-[360px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-2xl pointer-events-auto text-center flex flex-col gap-5">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">GAME PAUSED</h2>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Take a breather!</p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={(e) => handleButtonClick(e, onResumeGame)}
              className="w-full py-3.5 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" /> Resume Game
            </button>
            <button
              type="button"
              onClick={(e) => handleButtonClick(e, onOpenSettings)}
              className="w-full py-3.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-2xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <Settings className="w-5 h-5" /> Settings
            </button>
            <button
              type="button"
              onClick={(e) => handleButtonClick(e, onHomeGame)}
              className="w-full py-3.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-2xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <Home className="w-5 h-5" /> Main Menu
            </button>
          </div>
        </div>
      )}

      {/* --- GAME OVER OVERLAY MODAL --- */}
      {gameMode === 'gameover' && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="my-auto w-full max-w-[380px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-2xl pointer-events-auto text-center flex flex-col gap-6"
        >
          <div>
            <span className="inline-block px-3 py-1 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 rounded-full text-xs font-black uppercase tracking-wider mb-2">
              CRASH!
            </span>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">GAME OVER</h2>
          </div>

          {/* Score Card Box */}
          <div className="bg-slate-100 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between relative overflow-hidden">
            {scoreData.isNewHighScore && (
              <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-500 text-white text-[10px] font-black px-3 py-0.5 rounded-bl-xl uppercase tracking-wider shadow-md">
                NEW BEST!
              </div>
            )}

            <div className="flex flex-col items-start gap-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Score</span>
              <span className="text-4xl font-black text-slate-900 dark:text-white">{scoreData.currentScore}</span>
            </div>

            {medal && (
              <motion.div
                initial={{ scale: 0.5, rotate: -15, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 350, damping: 15, delay: 0.15 }}
                className={`flex flex-col items-center justify-center p-2 px-3 rounded-2xl border shadow-lg backdrop-blur-sm ${medal.bg} ${medal.glow}`}
              >
                <div className="flex items-center gap-1">
                  <Award className="w-5 h-5 drop-shadow-sm" />
                  <span className="text-xl">{medal.icon}</span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider mt-0.5">
                  {medal.label}
                </span>
              </motion.div>
            )}

            <div className="flex flex-col items-end gap-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Best</span>
              <span className="text-3xl font-black text-amber-500">{scoreData.highScore}</span>
            </div>
          </div>

          {/* OVERLAY ACTION BUTTONS (with e.stopPropagation) */}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={(e) => handleButtonClick(e, onRestartGame)}
              className="w-full py-4 px-6 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-lg rounded-2xl shadow-xl shadow-orange-500/20 flex items-center justify-center gap-3 cursor-pointer transition-transform active:scale-95"
            >
              <RotateCcw className="w-6 h-6" /> PLAY AGAIN
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => handleButtonClick(e, onHomeGame)}
                className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4" /> Home
              </button>
              <button
                type="button"
                onClick={(e) => handleButtonClick(e, onOpenSettings)}
                className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 cursor-pointer"
              >
                <Settings className="w-4 h-4" /> Settings
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* --- SETTINGS MODAL DIALOG --- */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto"
            onClick={(e) => handleButtonClick(e, onCloseSettings)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[420px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-orange-500/10 text-orange-500 rounded-xl">
                    <Settings className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Game Settings</h3>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleButtonClick(e, onCloseSettings)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Toggle Audio & Color Mode Row */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Audio & Appearance
                </span>

                <div className="grid grid-cols-2 gap-3">
                  {/* Sound Toggle */}
                  <button
                    type="button"
                    onClick={(e) =>
                      handleButtonClick(e, () => onUpdateSettings({ soundEnabled: !settings.soundEnabled }))
                    }
                    className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                      settings.soundEnabled
                        ? 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {settings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                      <span className="text-sm font-bold">Sound</span>
                    </div>
                    <span className="text-xs font-black uppercase">{settings.soundEnabled ? 'ON' : 'OFF'}</span>
                  </button>

                  {/* Light/Dark Toggle */}
                  <button
                    type="button"
                    onClick={(e) =>
                      handleButtonClick(e, () =>
                        onUpdateSettings({ colorMode: settings.colorMode === 'light' ? 'dark' : 'light' })
                      )
                    }
                    className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                      settings.colorMode === 'dark'
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-600'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {settings.colorMode === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                      <span className="text-sm font-bold">Mode</span>
                    </div>
                    <span className="text-xs font-black uppercase">{settings.colorMode}</span>
                  </button>
                </div>
              </div>

              {/* Bird Skin / Sprite Style Selector */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Bird Sprite Skin
                </span>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'classic' as BirdSkin, name: 'Classic', desc: 'Chubby Arcade', Icon: Bird },
                    { id: 'vector' as BirdSkin, name: 'Vector', desc: 'Sleek Modern', Icon: Zap },
                    { id: 'pixel' as BirdSkin, name: 'Pixel', desc: '8-Bit Retro', Icon: Grid },
                  ].map(({ id, name, desc, Icon }) => {
                    const selected = settings.birdSkin === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={(e) => handleButtonClick(e, () => onUpdateSettings({ birdSkin: id }))}
                        className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center ${
                          selected
                            ? 'bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white">{name}</span>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Map Selection List */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Select Arcade Map
                </span>

                <div className="flex flex-col gap-2.5">
                  {(['modern', 'desert', 'steampunk'] as MapTheme[]).map((mapId) => {
                    const meta = MAP_METADATA[mapId];
                    const selected = settings.mapTheme === mapId;
                    const mapScore = scoreData.mapHighScores[mapId] || 0;

                    return (
                      <div
                        key={mapId}
                        onClick={(e) => handleButtonClick(e, () => onUpdateSettings({ mapTheme: mapId }))}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                          selected
                            ? 'bg-orange-500/5 border-orange-500 shadow-md'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2.5 rounded-xl ${
                              selected
                                ? 'bg-orange-500 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {mapId === 'modern' && <Layout className="w-5 h-5" />}
                            {mapId === 'desert' && <Sun className="w-5 h-5" />}
                            {mapId === 'steampunk' && <Cog className="w-5 h-5" />}
                          </div>
                          <div className="text-left">
                            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">{meta.name}</h4>
                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                              {settings.colorMode === 'dark' ? meta.darkDescription : meta.lightDescription}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Best</span>
                          <span className="text-sm font-black text-amber-500">{mapScore}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Done Button */}
              <button
                type="button"
                onClick={(e) => handleButtonClick(e, onCloseSettings)}
                className="w-full py-3.5 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl shadow-lg cursor-pointer"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
