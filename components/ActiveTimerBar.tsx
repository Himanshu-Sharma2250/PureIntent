import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Clock, ChevronRight } from 'lucide-react-native';
import { useTheme } from './ThemeContext';
import { useTimer } from '../hooks/useTimer';
import { formatElapsedSeconds } from './TimerButton';

/**
 * Slim persistent running-timer bar visible on all screens across the application.
 * Displays the current running task's title and live elapsed time (HH:MM:SS).
 * Tapping navigates to that task's detail screen.
 * Disappears completely when no timer is active.
 */
export const ActiveTimerBar: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { activeTimer, elapsedSeconds } = useTimer();

  if (!activeTimer) {
    return null;
  }

  const handlePress = () => {
    navigation.navigate('TaskDetail', { taskId: activeTimer.task_id });
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityLabel={`Active timer on ${activeTimer.task_title || 'task'}. Tap to open task detail.`}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.cardBg,
          borderTopColor: colors.borderColor,
          paddingBottom: Math.max(insets.bottom, 10),
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.contentRow}>
        {/* Left: Pulsing Clock Indicator & Task Title */}
        <View style={styles.leftGroup}>
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: colors.mutedBg,
                borderColor: colors.borderColor,
              },
            ]}
          >
            <Clock size={13} color={colors.primary} strokeWidth={2.2} />
          </View>
          <Text
            numberOfLines={1}
            style={[styles.taskTitle, { color: colors.foreground }]}
          >
            {activeTimer.task_title || 'Current Intent'}
          </Text>
        </View>

        {/* Right: Live Elapsed Digits & Chevron */}
        <View style={styles.rightGroup}>
          <Text style={[styles.elapsedTime, { color: colors.primary }]}>
            {formatElapsedSeconds(elapsedSeconds)}
          </Text>
          <ChevronRight size={14} color={colors.mutedFg} />
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  leftGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  elapsedTime: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 18,
    letterSpacing: 0.5,
  },
});
