import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { ThemeColors, resolveColors, ACCENT_PALETTES } from '../constants/colors';
import type { AccentPaletteId } from '../constants/colors';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = '@finance_tracker_theme';
const ACCENT_STORAGE_KEY = '@finance_tracker_accent';

const VALID_ACCENT_IDS = new Set<string>(ACCENT_PALETTES.map((p) => p.id));

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  accentPalette: AccentPaletteId;
  setAccentPalette: (id: AccentPaletteId) => void;
  colors: ThemeColors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [accentPalette, setAccentState] = useState<AccentPaletteId>('purple');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(THEME_STORAGE_KEY),
      AsyncStorage.getItem(ACCENT_STORAGE_KEY),
    ])
      .then(([storedMode, storedAccent]) => {
        if (storedMode === 'light' || storedMode === 'dark' || storedMode === 'system') {
          setModeState(storedMode);
        }
        if (storedAccent && VALID_ACCENT_IDS.has(storedAccent)) {
          setAccentState(storedAccent as AccentPaletteId);
        }
      })
      .catch((err) => {
        console.error('Failed to load theme preferences:', err);
      })
      .finally(() => {
        setLoaded(true);
      });
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
  }, []);

  const setAccentPalette = useCallback((id: AccentPaletteId) => {
    setAccentState(id);
    AsyncStorage.setItem(ACCENT_STORAGE_KEY, id);
  }, []);

  const isDark = mode === 'system' ? systemColorScheme === 'dark' : mode === 'dark';
  const colors = useMemo(() => resolveColors(isDark, accentPalette), [isDark, accentPalette]);

  const value = useMemo(
    () => ({ mode, setMode, accentPalette, setAccentPalette, colors, isDark }),
    [mode, setMode, accentPalette, setAccentPalette, colors, isDark],
  );

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function useColors() {
  return useTheme().colors;
}
