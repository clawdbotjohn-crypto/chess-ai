/**
 * useTheme — App theme management hook
 * Stores preference in localStorage, applies dark/light class to <html>
 */

import { useState, useEffect, useCallback } from 'react';

export type ThemeChoice = 'dark' | 'light' | 'system';

const STORAGE_KEY = 'chess-ai-app-theme';

function getStoredTheme(): ThemeChoice {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light' || stored === 'system') return stored;
  return 'dark'; // default
}

function resolveEffective(choice: ThemeChoice): 'dark' | 'light' {
  if (choice === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return choice;
}

function applyTheme(effective: 'dark' | 'light') {
  const html = document.documentElement;
  if (effective === 'dark') {
    html.classList.add('dark');
    html.classList.remove('light');
  } else {
    html.classList.remove('dark');
    html.classList.add('light');
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeChoice>(getStoredTheme);

  const setTheme = useCallback((choice: ThemeChoice) => {
    localStorage.setItem(STORAGE_KEY, choice);
    setThemeState(choice);
    applyTheme(resolveEffective(choice));
  }, []);

  // Apply on mount + listen for OS preference changes when 'system'
  useEffect(() => {
    applyTheme(resolveEffective(theme));

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (getStoredTheme() === 'system') {
        applyTheme(resolveEffective('system'));
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return { theme, setTheme } as const;
}

// Initialize theme immediately (before React renders) to prevent flash
(function initTheme() {
  if (typeof window === 'undefined') return;
  const stored = getStoredTheme();
  applyTheme(resolveEffective(stored));
})();
