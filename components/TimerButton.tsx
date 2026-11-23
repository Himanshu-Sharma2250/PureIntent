import React from 'react';
import { StyleSheet, Text, View, Pressable, Alert } from 'react-native';
import { Clock, Square, Trash2 } from 'lucide-react-native';
import { useTheme } from './ThemeContext';
import { useTimer } from '../hooks/useTimer';

interface TimerButtonProps {
  taskId: number;
  taskTitle: string;
  isCompleted?: boolean;
}

/**
 * Formats elapsed seconds into live HH:MM:SS format (e.g. "01:23:45").
 */
export const formatElapsedSeconds = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
};

/**
 * Dedicated Timer control button for the Task Detail screen.
 * Displays:
 * - Start Timer button with Clock icon when idle or when another task's timer is running
 *   (triggers switch confirmation if running on another task).
 * - Live elapsed time (HH:MM:SS), Stop button, and secondary Discard action when running on this task.
 * - Stopping saves the time log immediately without blocking description prompts.
 */
export const TimerButton: React.FC<TimerButtonProps> = ({
  taskId,
  taskTitle,
  isCompleted = false,
}) => {
  const { colors } = useTheme();
  const { activeTimer, elapsedSeconds, start, stop, discard } = useTimer();

  const isCurrentRunning = activeTimer !== null && activeTimer.task_id === taskId;

  const handleStart = async () => {
    try {
      await start(taskId, taskTitle);
    } catch (err) {
      console.error('[TimerButton] Error starting timer:', err);
    }
  };

  const handleStop = async () => {
    try {
      await stop();
    } catch (err) {
      console.error('[TimerButton] Error stopping timer:', err);
    }
  };

  const handleDiscard = () => {
    Alert.alert(
      'Discard Timer',
      'Are you sure you want to discard this running timer? No time log will be saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            try {
              await discard();
            } catch (err) {
              console.error('[TimerButton] Error discarding timer:', err);
            }
          },
        },
      ]
    );
  };

  if (isCurrentRunning) {
    return (
      <View
        style={[
          styles.runningCard,
          {
            backgroundColor: colors.cardBg,
            borderColor: colors.borderColor,
          },
        ]}
      >
        {/* Left: Active pulse indicator & Live elapsed time */}
        <View style={styles.runningLeft}>
          <View style={styles.pulseDotWrapper}>
            <View style={[styles.pulseDot, { backgroundColor: colors.primary }]} />
          </View>
          <View>
            <Text style={[styles.timerStatusLabel, { color: colors.primary }]}>
              Active Session
            </Text>
            <Text style={[styles.elapsedDigits, { color: colors.foreground }]}>
              {formatElapsedSeconds(elapsedSeconds)}
            </Text>
          </View>
        </View>

        {/* Right: Stop Button & Discard Action */}
        <View style={styles.runningActions}>
          <Pressable
            onPress={handleStop}
            accessibilityLabel="Stop timer and save session"
            style={({ pressed }) => [
              styles.stopButton,
              {
                backgroundColor: colors.foreground,
                transform: [{ scale: pressed ? 0.94 : 1 }],
              },
            ]}
          >
            <Square size={12} color={colors.background} fill={colors.background} />
            <Text style={[styles.stopButtonText, { color: colors.background }]}>
              Stop
            </Text>
          </Pressable>

          <Pressable
            onPress={handleDiscard}
            accessibilityLabel="Discard timer without saving"
            style={({ pressed }) => [
              styles.discardButton,
              {
                backgroundColor: colors.mutedBg,
                borderColor: colors.borderColor,
                transform: [{ scale: pressed ? 0.92 : 1 }],
              },
            ]}
          >
            <Trash2 size={13} color={colors.mutedFg} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      onPress={handleStart}
      accessibilityLabel="Start timer for this task"
      style={({ pressed }) => [
        styles.startButton,
        {
          backgroundColor: colors.mutedBg,
          borderColor: colors.borderColor,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
      ]}
    >
      <Clock size={14} color={colors.primary} strokeWidth={2.2} />
      <Text style={[styles.startButtonText, { color: colors.foreground }]}>
        Start Timer
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
  },
  startButtonText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  runningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  runningLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pulseDotWrapper: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timerStatusLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '600',
  },
  elapsedDigits: {
    fontSize: 20,
    fontFamily: 'InstrumentSerif-Regular',
    letterSpacing: 1,
    marginTop: -2,
  },
  runningActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 99,
  },
  stopButtonText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  discardButton: {
    width: 32,
    height: 32,
    borderRadius: 99,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
