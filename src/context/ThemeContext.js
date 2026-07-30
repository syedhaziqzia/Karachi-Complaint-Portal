import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LayoutAnimation, Platform, UIManager } from 'react-native';
import { Colors } from '../theme/colors';

const THEME_KEY = 'kcp_theme';
const ThemeContext = createContext(undefined);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark'); // Default to dark
  const [themeLoaded, setThemeLoaded] = useState(false);

  // Load persisted theme preference on boot
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_KEY);
        if (saved === 'light' || saved === 'dark') {
          setTheme(saved);
        }
        // If no saved preference, keep 'dark' as default
      } catch (_) {}
      setThemeLoaded(true);
    })();
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      // Persist in background (non-blocking)
      AsyncStorage.setItem(THEME_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  // Called on logout to reset theme to default dark
  const resetTheme = useCallback(async () => {
    setTheme('dark');
    try { await AsyncStorage.removeItem(THEME_KEY); } catch (_) {}
  }, []);

  const isDark = theme === 'dark';
  // Merge Colors token set; also expose legacy aliases so auth/welcome screens stay untouched
  const rawColors = isDark ? Colors.dark : Colors.light;
  const colors = {
    ...rawColors,
    // Legacy aliases (used by Welcome/Auth screens — keep them working)
    card: rawColors.surface,
    buttonOutline: rawColors.text,
    buttonOutlineText: rawColors.text,
    overlay: rawColors.glass,
    // Expose the surface for screens that reference colors.surface directly
    surface: rawColors.surface,
  };

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, isDark, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
