import { useState, useCallback } from 'react';
import type { EvaluationConfig } from '../engine/types';
import { DEFAULT_CONFIG } from '../engine/types';
import { PRESETS } from '../engine/presets';
import type { PresetName } from '../engine/presets';

const STORAGE_PREFIX = 'chess-ai-personality:';
const AVATAR_PREFIX = 'chess-ai-personality-avatar:';

/** Get the avatar for a saved personality by name */
export function getPersonalityAvatar(name: string): string | null {
  return localStorage.getItem(AVATAR_PREFIX + name) || null;
}

export function useAIPersonality() {
  const [currentConfig, setCurrentConfig] = useState<EvaluationConfig>(DEFAULT_CONFIG);
  const [activePreset, setActivePreset] = useState<PresetName | null>('DEFAULT');
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);

  const setConfig = useCallback((config: EvaluationConfig) => {
    setCurrentConfig(config);
    setActivePreset(null);
  }, []);

  const setAvatar = useCallback((avatar: string | null) => {
    setCurrentAvatar(avatar);
  }, []);

  const loadPreset = useCallback((name: PresetName) => {
    const preset = PRESETS[name];
    if (preset) {
      setCurrentConfig(structuredClone(preset.config));
      setActivePreset(name);
      setCurrentAvatar(null);
    }
  }, []);

  const saveToStorage = useCallback((name: string) => {
    localStorage.setItem(STORAGE_PREFIX + name, JSON.stringify(currentConfig));
    // Save or clear avatar alongside the config
    if (currentAvatar) {
      localStorage.setItem(AVATAR_PREFIX + name, currentAvatar);
    } else {
      localStorage.removeItem(AVATAR_PREFIX + name);
    }
  }, [currentConfig, currentAvatar]);

  const loadFromStorage = useCallback((name: string): EvaluationConfig | null => {
    const raw = localStorage.getItem(STORAGE_PREFIX + name);
    if (!raw) return null;
    try {
      const config = JSON.parse(raw) as EvaluationConfig;
      // Migrate old saved configs that may be missing new sections
      if (!config.search) {
        config.search = { depth: DEFAULT_CONFIG.search.depth };
      }
      setCurrentConfig(config);
      setActivePreset(null);
      // Load avatar for this personality
      setCurrentAvatar(getPersonalityAvatar(name));
      return config;
    } catch {
      return null;
    }
  }, []);

  const getSavedNames = useCallback((): string[] => {
    const names: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        names.push(key.slice(STORAGE_PREFIX.length));
      }
    }
    return names.sort();
  }, []);

  const deleteSaved = useCallback((name: string) => {
    localStorage.removeItem(STORAGE_PREFIX + name);
    localStorage.removeItem(AVATAR_PREFIX + name);
  }, []);

  return {
    currentConfig,
    setConfig,
    activePreset,
    loadPreset,
    saveToStorage,
    loadFromStorage,
    getSavedNames,
    deleteSaved,
    currentAvatar,
    setAvatar,
  };
}
