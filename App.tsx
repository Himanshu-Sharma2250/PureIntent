import React from 'react';
import { View, StyleSheet } from 'react-native';
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
import { TimerProvider } from './hooks/useTimer';
import { ActiveTimerBar } from './components/ActiveTimerBar';
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
 * Performs font loading and mounts global SQLite, Theme, Timer, and Navigation providers.
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
          <TimerProvider>
            <NavigationContainer>
              <View style={styles.appContainer}>
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

                {/* Persistent slim active timer indicator across all screens */}
                <ActiveTimerBar />
              </View>
            </NavigationContainer>
          </TimerProvider>
        </SQLiteProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
  },
});
