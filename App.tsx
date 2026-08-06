import React from 'react';
import { SQLiteProvider } from 'expo-sqlite';
import {
  useFonts,
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './components/ThemeContext';
import { HomeScreen } from './screens/HomeScreen';
import { initializeDatabase } from './db/db';

/**
 * Entry parent of the application.
 * Performs font loading and mounts global SQLite and Theme context providers.
 */
export default function App(): React.JSX.Element | null {
  // Load specialized Google Fonts (Instrument Serif regular and italic styles)
  const [fontsLoaded] = useFonts({
    'InstrumentSerif-Regular': InstrumentSerif_400Regular,
    'InstrumentSerif-Italic': InstrumentSerif_400Regular_Italic,
  });

  // Hold UI mounting until fonts are ready
  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SQLiteProvider databaseName="pureintent.db" onInit={initializeDatabase}>
          <HomeScreen />
        </SQLiteProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
