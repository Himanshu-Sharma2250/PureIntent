import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, Animated } from 'react-native';
import { Edit2, Trash2 } from 'lucide-react-native';
import { useTheme } from './ThemeContext';
import { Comment } from '../db/commentRepository';

interface CommentCardProps {
  comment: Comment;
  index: number;
  onEdit: (comment: Comment) => void;
  onDelete: (comment: Comment) => void;
}

/**
 * Renders an individual Comment card with staggered entrance animation,
 * editorial typography, timestamp, and edit/delete actions.
 */
export const CommentCard: React.FC<CommentCardProps> = React.memo(
  ({ comment, index, onEdit, onDelete }) => {
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

    const formatTimestamp = (isoString: string) => {
      try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return isoString;
        const dateStr = d.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        });
        const timeStr = d.toLocaleTimeString(undefined, {
          hour: 'numeric',
          minute: '2-digit',
        });
        return `${dateStr} • ${timeStr}`;
      } catch {
        return isoString;
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
          {/* Comment Content */}
          <Text style={[styles.contentText, { color: colors.foreground }]}>
            {comment.content}
          </Text>

          {/* Footer with Timestamp and Action Buttons */}
          <View style={[styles.footer, { borderTopColor: colors.borderColor }]}>
            <Text style={[styles.timestampText, { color: colors.mutedFg }]}>
              {formatTimestamp(comment.updated_at || comment.created_at)}
            </Text>

            <View style={styles.actionsRow}>
              {/* Edit Comment Button */}
              <Pressable
                onPress={() => onEdit(comment)}
                accessibilityLabel="Edit comment"
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

              {/* Delete Comment Button */}
              <Pressable
                onPress={() => onDelete(comment)}
                accessibilityLabel="Delete comment"
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

CommentCard.displayName = 'CommentCard';

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
  contentText: {
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
  timestampText: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
