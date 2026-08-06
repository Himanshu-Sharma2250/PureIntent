import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';

export interface ThemeColors {
  background: string;
  foreground: string;
  primary: string;
  mutedBg: string;
  mutedFg: string;
  cardBg: string;
  borderColor: string;
  success: string;
}

export type ThemeName = 'light' | 'dark';

interface ThemeContextProps {
  theme: ThemeName;
  colors: ThemeColors;
  toggleTheme: () => void;
  isDark: boolean;
}

const LightThemeColors: ThemeColors = {
  background: '#ffffff',
  foreground: '#090b0c',
  primary: '#c70036',
  mutedBg: '#f1f3f3',
  mutedFg: '#67787c',
  cardBg: '#ffffff',
  borderColor: 'rgba(9, 11, 12, 0.1)',
  success: '#15803d', // green-700
};

const DarkThemeColors: ThemeColors = {
  background: '#090b0c',
  foreground: '#f9fbfb',
  primary: '#a50036',
  mutedBg: '#161b1d',
  mutedFg: '#67787c',
  cardBg: '#161b1d',
  borderColor: 'rgba(249, 251, 251, 0.12)',
  success: '#16a34a', // green-600
};

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // PureIntent defaults to Dark Mode as per styling spec
  const [theme, setTheme] = useState<ThemeName>('dark');

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const colors = theme === 'light' ? LightThemeColors : DarkThemeColors;
  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextProps => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
