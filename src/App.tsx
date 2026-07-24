import React, { useState, useEffect, useCallback } from 'react';
import { GameMode, GameSettings, MapTheme, ScoreData } from './types';
import { getSavedSettings, saveSettings, getSavedHighScores, saveHighScoreForMap } from './utils/storage';
import { soundEngine } from './utils/audio';
import { CanvasGame } from './components/CanvasGame';
import { UIOverlay } from './components/UIOverlay';

export default function App() {
  const [gameMode, setGameMode] = useState<GameMode>('start');
  const [settings, setSettings] = useState<GameSettings>(() => getSavedSettings());
  const [mapHighScores, setMapHighScores] = useState<Record<MapTheme, number>>(() => getSavedHighScores());
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Apply dark mode class to root HTML element
  useEffect(() => {
    if (settings.colorMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.colorMode]);

  // Sync BGM with game mode and sound settings
  useEffect(() => {
    if (gameMode === 'playing' && settings.soundEnabled) {
      soundEngine.startBGM(settings.mapTheme, currentScore);
    } else {
      soundEngine.stopBGM();
    }
  }, [gameMode, settings.mapTheme, settings.soundEnabled]);

  // Update BGM tempo/intensity live when score or theme changes
  useEffect(() => {
    if (gameMode === 'playing') {
      soundEngine.updateBGM(settings.mapTheme, currentScore);
    }
  }, [currentScore, settings.mapTheme, gameMode]);

  // Handle setting updates
  const handleUpdateSettings = useCallback((newSettings: Partial<GameSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const handleStartGame = useCallback(() => {
    setCurrentScore(0);
    setIsNewHighScore(false);
    setGameMode('playing');
  }, []);

  const handleRestartGame = useCallback(() => {
    setCurrentScore(0);
    setIsNewHighScore(false);
    setGameMode('start');
    // Brief timeout so canvas resets clean before starting
    setTimeout(() => {
      setGameMode('playing');
    }, 50);
  }, []);

  const handlePauseGame = useCallback(() => {
    setGameMode('paused');
  }, []);

  const handleResumeGame = useCallback(() => {
    setGameMode('playing');
  }, []);

  const handleHomeGame = useCallback(() => {
    setGameMode('start');
    setCurrentScore(0);
    setIsNewHighScore(false);
  }, []);

  const handleGameOver = useCallback(
    (finalScore: number) => {
      const currentMapHigh = mapHighScores[settings.mapTheme] || 0;
      let achievedNewBest = false;

      if (finalScore > currentMapHigh && finalScore > 0) {
        achievedNewBest = true;
        saveHighScoreForMap(settings.mapTheme, finalScore);
        setMapHighScores(getSavedHighScores());
        soundEngine.playFanfare();
      }

      setCurrentScore(finalScore);
      setIsNewHighScore(achievedNewBest);
      setGameMode('gameover');
    },
    [mapHighScores, settings.mapTheme]
  );

  const activeHighScore = mapHighScores[settings.mapTheme] || 0;

  const scoreData: ScoreData = {
    currentScore,
    highScore: activeHighScore,
    mapHighScores,
    isNewHighScore,
  };

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden flex items-center justify-center transition-colors duration-300 select-none ${
        settings.colorMode === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Game Stage Container */}
      <div className="relative w-full max-w-[480px] h-full max-h-[680px] shadow-2xl rounded-2xl overflow-hidden bg-slate-900 border border-slate-200/20">
        <CanvasGame
          gameMode={gameMode}
          settings={settings}
          onScoreChange={setCurrentScore}
          onGameOver={handleGameOver}
          onFirstFlap={() => setGameMode('playing')}
        />

        <UIOverlay
          gameMode={gameMode}
          settings={settings}
          scoreData={scoreData}
          isSettingsOpen={isSettingsOpen}
          onStartGame={handleStartGame}
          onRestartGame={handleRestartGame}
          onPauseGame={handlePauseGame}
          onResumeGame={handleResumeGame}
          onHomeGame={handleHomeGame}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onCloseSettings={() => setIsSettingsOpen(false)}
          onUpdateSettings={handleUpdateSettings}
        />
      </div>
    </div>
  );
}

