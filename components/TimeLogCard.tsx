import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, Animated } from 'react-native';
import { Edit2, Trash2, Clock, Calendar } from 'lucide-react-native';
import { useTheme } from './ThemeContext';
import { TimeLog } from '../db/timeLogRepository';

interface TimeLogCardProps {
  timeLog: TimeLog;
  index: number;
  onEdit: (timeLog: TimeLog) => void;
  onDelete: (timeLog: TimeLog) => void;
}

/**
 * Formats integer minutes into human-readable duration strings (e.g. "1h 30m", "45m", "2h").
 */
export const formatMinutesToDuration = (minutes: number): string => {
  if (!minutes || minutes <= 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${mins}m`;
};

/**
 * Renders an individual TimeLog card with duration highlight, description, work date,
 * staggered entrance animation, and edit/delete actions.
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
                {formatMinutesToDuration(timeLog.time_spent_minutes)}
              </Text>
            </View>

            <View style={styles.dateBadge}>
              <Calendar size={12} color={colors.mutedFg} />
              <Text style={[styles.dateText, { color: colors.mutedFg }]}>
                {formatWorkDate(timeLog.work_date)}
              </Text>
            </View>
          </View>

          {/* Description Content */}
          <Text style={[styles.descriptionText, { color: colors.foreground }]}>
            {timeLog.description}
          </Text>

          {/* Footer with Actions */}
          <View style={[styles.footer, { borderTopColor: colors.borderColor }]}>
            <Text style={[styles.loggedLabel, { color: colors.mutedFg }]}>
              Logged Work
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
