import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from '@/constants/theme';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  themeMode: ThemeMode;
  themeColors: typeof lightColors;
  isSystemTheme: boolean;
  toggleTheme: (mode?: ThemeMode) => void;
  setSystemTheme: (useSystem: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [isSystemTheme, setIsSystemTheme] = useState(true);
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);

  useEffect(() => {
    const loadThemePreferences = async () => {
      try {
        const storedThemeMode = await AsyncStorage.getItem('themeMode') as ThemeMode | null;
        const storedIsSystem = await AsyncStorage.getItem('isSystemTheme');

        if (storedIsSystem === null) {
          setIsSystemTheme(false);
          setThemeMode('light');
        } else {
          const useSystem = JSON.parse(storedIsSystem);
          setIsSystemTheme(useSystem);
          if (useSystem) {
            const systemColorScheme = Appearance.getColorScheme() || 'light';
            setThemeMode(systemColorScheme);
          } else if (storedThemeMode) {
            setThemeMode(storedThemeMode);
          } else {
            setThemeMode('light');
          }
        }
      } catch (error) {
        console.error("[ThemeContext] Failed to load theme preferences:", error);
        setIsSystemTheme(false);
        setThemeMode('light');
      } finally {
        setIsThemeLoaded(true);
      }
    };
    setIsThemeLoaded(false);
    loadThemePreferences();
  }, []);

  useEffect(() => {
    if (!isThemeLoaded) return;

    if (isSystemTheme) {
      const newSystemTheme = Appearance.getColorScheme() || 'light';
      setThemeMode(newSystemTheme);
    }
    AsyncStorage.setItem('isSystemTheme', JSON.stringify(isSystemTheme))
      .catch(error => console.error("[ThemeContext] Failed to save isSystemTheme preference:", error));
  }, [isSystemTheme, isThemeLoaded]);

  useEffect(() => {
    if (!isThemeLoaded) return;

    if (!isSystemTheme) {
      AsyncStorage.setItem('themeMode', themeMode)
        .catch(error => console.error("[ThemeContext] Failed to save themeMode preference:", error));
    }
  }, [themeMode, isSystemTheme, isThemeLoaded]);

  useEffect(() => {
    if (!isThemeLoaded) return;

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (isSystemTheme) {
        setThemeMode(colorScheme || 'light');
      }
    });
    return () => subscription.remove();
  }, [isSystemTheme, isThemeLoaded]);

  const toggleTheme = (mode?: ThemeMode) => {
    if (mode) {
      setIsSystemTheme(false);
      setThemeMode(mode);
    } else {
        const newMode = themeMode === 'light' ? 'dark' : 'light';
        setIsSystemTheme(false);
        setThemeMode(newMode);
    }
  };

  const setSystemTheme = (useSystem: boolean) => {
    setIsSystemTheme(useSystem);
    if (useSystem) {
      const systemTheme = Appearance.getColorScheme() || 'light';
      setThemeMode(systemTheme);
    }
  };

  const themeColors = themeMode === 'light' ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ themeMode, themeColors, isSystemTheme, toggleTheme, setSystemTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 