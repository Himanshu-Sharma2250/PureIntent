import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, Animated } from 'react-native';
import { Edit2, Trash2, Clock, Calendar, PlusCircle } from 'lucide-react-native';
import { useTheme } from './ThemeContext';
import { TimeLog } from '../db/timeLogRepository';

interface TimeLogCardProps {
  timeLog: TimeLog;
  index: number;
  onEdit: (timeLog: TimeLog) => void;
  onDelete: (timeLog: TimeLog) => void;
}

/**
 * Formats duration seconds into human-readable strings:
 * - Under a minute: shows seconds (e.g. "45s", "0s").
 * - Over a minute: hours and minutes (e.g. "1h 05m", "1h 0m", "45m").
 */
export const formatSecondsToDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '0s';
  const totalMinutes = Math.floor(seconds / 60);
  if (totalMinutes === 0) {
    return `${seconds}s`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0) {
    if (mins === 0) {
      return `${hours}h 0m`;
    }
    return `${hours}h ${mins < 10 ? '0' + mins : mins}m`;
  }
  return `${mins}m`;
};

/**
 * Backward-compatibility wrapper for any legacy minutes callers.
 */
export const formatMinutesToDuration = (minutes: number): string => {
  return formatSecondsToDuration(minutes * 60);
};

/**
 * Renders an individual TimeLog card with duration highlight, description, work date,
 * source tag, empty-description prompt, staggered entrance animation, and edit/delete actions.
 */
export const TimeLogCard: React.FC<TimeLogCardProps> = React.memo(
  ({ timeLog, index, onEdit, onDelete }) => {
    const { colors } = useTheme();

    const animValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(animValue, {
        toValue: 1,
        duration: 350,
        delay: Math.min(index * 50, 300),
        useNativeDriver: true,
      }).start();
    }, [index, animValue]);

    const animatedStyle = {
      opacity: animValue,
      transform: [
        {
          translateY: animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [15, 0],
          }),
        },
      ],
    };

    const formatWorkDate = (dateStr: string) => {
      try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          const d = new Date(year, month, day);
          if (!isNaN(d.getTime())) {
            return d.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
          }
        }
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
        }
        return dateStr;
      } catch {
        return dateStr;
      }
    };

    const hasDescription = timeLog.description && timeLog.description.trim().length > 0;
    const isTimerSource = timeLog.source === 'timer';

    return (
      <Animated.View style={[styles.container, animatedStyle]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.cardBg,
              borderColor: colors.borderColor,
            },
          ]}
        >
          {/* Header Row: Duration Badge & Work Date */}
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.durationBadge,
                  {
                    backgroundColor: colors.mutedBg,
                    borderColor: colors.borderColor,
                  },
                ]}
              >
                <Clock size={12} color={colors.primary} />
                <Text style={[styles.durationText, { color: colors.foreground }]}>
                  {formatSecondsToDuration(timeLog.time_spent_seconds)}
                </Text>
              </View>

              {/* Subtle Source Indicator */}
              {isTimerSource ? (
                <View
                  style={[
                    styles.sourceTag,
                    {
                      backgroundColor: colors.mutedBg,
                      borderColor: colors.borderColor,
                    },
                  ]}
                >
                  <Clock size={10} color={colors.primary} strokeWidth={2.2} />
                  <Text style={[styles.sourceText, { color: colors.mutedFg }]}>Timer</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.dateBadge}>
              <Calendar size={12} color={colors.mutedFg} />
              <Text style={[styles.dateText, { color: colors.mutedFg }]}>
                {formatWorkDate(timeLog.work_date)}
              </Text>
            </View>
          </View>

          {/* Description Content / Empty Description Prompt */}
          {hasDescription ? (
            <Text style={[styles.descriptionText, { color: colors.foreground }]}>
              {timeLog.description}
            </Text>
          ) : (
            <Pressable
              onPress={() => onEdit(timeLog)}
              accessibilityLabel="Add what you did"
              style={({ pressed }) => [
                styles.emptyPromptPressable,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <PlusCircle size={14} color={colors.primary} />
              <Text style={[styles.emptyPromptText, { color: colors.mutedFg }]}>
                Add what you did...
              </Text>
            </Pressable>
          )}

          {/* Footer with Actions */}
          <View style={[styles.footer, { borderTopColor: colors.borderColor }]}>
            <Text style={[styles.loggedLabel, { color: colors.mutedFg }]}>
              {isTimerSource ? 'Recorded Session' : 'Logged Work'}
            </Text>

            <View style={styles.actionsRow}>
              {/* Edit Time Log Button */}
              <Pressable
                onPress={() => onEdit(timeLog)}
                accessibilityLabel="Edit time log"
                style={({ pressed }) => [
                  styles.actionButton,
                  {
                    backgroundColor: colors.mutedBg,
                    transform: [{ scale: pressed ? 0.9 : 1 }],
                  },
                ]}
              >
                <Edit2 size={13} color={colors.foreground} />
              </Pressable>

              {/* Delete Time Log Button */}
              <Pressable
                onPress={() => onDelete(timeLog)}
                accessibilityLabel="Delete time log"
                style={({ pressed }) => [
                  styles.actionButton,
                  {
                    backgroundColor: colors.mutedBg,
                    transform: [{ scale: pressed ? 0.9 : 1 }],
                  },
                ]}
              >
                <Trash2 size={13} color="#dc2626" />
              </Pressable>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  }
);

TimeLogCard.displayName = 'TimeLogCard';

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    width: '100%',
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
  },
  sourceText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '500',
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  emptyPromptPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  emptyPromptText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  loggedLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
