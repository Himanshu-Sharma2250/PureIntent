import React from 'react';
import { SQLiteProvider } from 'expo-sqlite';
import {
  useFonts,
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ThemeProvider } from './components/ThemeContext';
import { HomeScreen } from './screens/HomeScreen';
import { TaskDetailScreen } from './screens/TaskDetailScreen';
import { initializeDatabase } from './db/db';

export type RootStackParamList = {
  Home: undefined;
  TaskDetail: { taskId: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Entry parent of the application.
 * Performs font loading and mounts global SQLite, Theme, and Navigation providers.
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
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName="Home"
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </SQLiteProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
