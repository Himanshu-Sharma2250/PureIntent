import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, Animated } from 'react-native';
import { CheckCircle2, Clock, AlertCircle, Calendar, Bell } from 'lucide-react-native';
import { useTheme } from './ThemeContext';
import { Intent } from '../db/taskRepository';

interface TaskCardProps {
  intent: Intent;
  index: number;
  onToggleComplete: () => void;
  onPress: () => void;
  onLongPress: () => void;
}

/**
 * Renders an Intent card with layout transitions and typography.
 * Supports tap to toggle complete, tap to edit/view, long press for action sheets,
 * and offline notification indicator.
 */
export const TaskCard: React.FC<TaskCardProps> = React.memo(
  ({ intent, index, onToggleComplete, onPress, onLongPress }) => {
    const { colors } = useTheme();

    // Animation for staggered fade-in + slide-up on mount
    const animValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(animValue, {
        toValue: 1,
        duration: 400,
        delay: Math.min(index * 75, 450),
        useNativeDriver: true,
      }).start();
    }, [index, animValue]);

    const animatedStyle = {
      opacity: animValue,
      transform: [
        {
          translateY: animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [20, 0],
          }),
        },
      ],
    };

    // Determine completion status values
    const isOverdue =
      !intent.is_completed &&
      !!intent.due_date &&
      new Date(intent.due_date).getTime() < Date.now();

    const hasActiveNotification = !intent.is_completed && !!intent.notification_id;

    const renderStatusIcon = () => {
      if (intent.is_completed) {
        return <CheckCircle2 size={18} strokeWidth={2.5} color={colors.success} />;
      }
      if (isOverdue) {
        return <AlertCircle size={18} strokeWidth={2.5} color="#dc2626" />;
      }
      return <Clock size={18} strokeWidth={2.5} color={colors.primary} />;
    };

    const formatDate = (isoString: string) => {
      try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return isoString;

        const dateFormatted = date.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

        if (isoString.includes('T')) {
          const timeFormatted = date.toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: '2-digit',
          });
          return `${dateFormatted} at ${timeFormatted}`;
        }

        return dateFormatted;
      } catch {
        return isoString;
      }
    };

    return (
      <Animated.View style={[styles.container, animatedStyle]}>
        <Pressable
          onPress={onPress}
          onLongPress={onLongPress}
          delayLongPress={450}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: colors.cardBg,
              borderColor: colors.borderColor,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          <View style={styles.cardHeader}>
            {/* Status Toggle Box */}
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onToggleComplete();
              }}
              style={({ pressed }) => [
                styles.iconContainer,
                { transform: [{ scale: pressed ? 0.85 : 1 }] },
              ]}
            >
              {renderStatusIcon()}
            </Pressable>

            {/* Content Column */}
            <View style={styles.contentColumn}>
              <Text
                style={[
                  styles.title,
                  {
                    color: colors.foreground,
                    textDecorationLine: intent.is_completed ? 'line-through' : 'none',
                    opacity: intent.is_completed ? 0.6 : 1,
                  },
                ]}
                numberOfLines={2}
              >
                {intent.title}
              </Text>

              {intent.description ? (
                <Text
                  style={[
                    styles.description,
                    {
                      color: colors.mutedFg,
                      opacity: intent.is_completed ? 0.5 : 0.85,
                    },
                  ]}
                  numberOfLines={3}
                >
                  {intent.description}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Footer Metadata */}
          {intent.due_date || intent.created_at ? (
            <View style={[styles.cardFooter, { borderTopColor: colors.borderColor }]}>
              {hasActiveNotification ? (
                <View style={styles.notificationBadge}>
                  <Bell size={11} color={colors.primary} />
                  <Text style={[styles.badgeText, { color: colors.primary }]}>Reminder Set</Text>
                </View>
              ) : null}

              {intent.due_date ? (
                <View style={styles.metaItem}>
                  <Calendar size={12} color={isOverdue ? '#dc2626' : colors.mutedFg} />
                  <Text
                    style={[
                      styles.metaText,
                      { color: isOverdue ? '#dc2626' : colors.mutedFg, fontWeight: isOverdue ? '600' : 'normal' },
                    ]}
                  >
                    Due {formatDate(intent.due_date)}
                  </Text>
                </View>
              ) : (
                <View style={styles.metaItem}>
                  <Text style={[styles.metaText, { color: colors.mutedFg }]}>
                    Created {formatDate(intent.created_at)}
                  </Text>
                </View>
              )}
            </View>
          ) : null}
        </Pressable>
      </Animated.View>
    );
  }
);

TaskCard.displayName = 'TaskCard';

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    padding: 2,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 28,
  },
  contentColumn: {
    flex: 1,
  },
  title: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 14,
    lineHeight: 18,
    marginTop: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  notificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '600',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  metaText: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
});
