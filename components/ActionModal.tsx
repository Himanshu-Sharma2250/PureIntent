import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { CheckCircle2, Clock, Edit2, Trash2, X } from 'lucide-react-native';
import { useTheme } from './ThemeContext';
import { Intent } from '../db/taskRepository';

interface ActionModalProps {
  visible: boolean;
  intent: Intent | null;
  onClose: () => void;
  onToggleComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const { height } = Dimensions.get('window');

export const ActionModal: React.FC<ActionModalProps> = ({
  visible,
  intent,
  onClose,
  onToggleComplete,
  onEdit,
  onDelete,
}) => {
  const { colors } = useTheme();
  
  // Animation state refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0.6,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  if (!intent) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlayContainer}>
        {/* Backdrop Tap trigger */}
        <Animated.View
          style={[
            styles.backdrop,
            {
              backgroundColor: '#000000',
              opacity: fadeAnim,
            },
          ]}
        >
          <Pressable style={styles.backdropPressable} onPress={onClose} />
        </Animated.View>

        {/* Action Panel Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.cardBg,
              borderColor: colors.borderColor,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.titleWrapper}>
              <Text style={[styles.title, { color: colors.foreground }]}>
                {intent.title}
              </Text>
              {intent.description ? (
                <Text style={[styles.description, { color: colors.mutedFg }]} numberOfLines={2}>
                  {intent.description}
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                {
                  backgroundColor: colors.mutedBg,
                  transform: [{ scale: pressed ? 0.9 : 1 }],
                },
              ]}
            >
              <X size={16} color={colors.foreground} />
            </Pressable>
          </View>

          {/* Action List Options */}
          <View style={styles.actionList}>
            {/* Toggle Completion */}
            <Pressable
              onPress={() => {
                onToggleComplete();
                onClose();
              }}
              style={({ pressed }) => [
                styles.actionItem,
                {
                  backgroundColor: colors.mutedBg,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              {intent.is_completed ? (
                <>
                  <Clock size={18} color={colors.primary} strokeWidth={2.5} />
                  <Text style={[styles.actionText, { color: colors.foreground }]}>
                    Mark as Incomplete
                  </Text>
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} color={colors.success} strokeWidth={2.5} />
                  <Text style={[styles.actionText, { color: colors.foreground }]}>
                    Mark as Completed
                  </Text>
                </>
              )}
            </Pressable>

            {/* Edit Intent */}
            <Pressable
              onPress={() => {
                onClose();
                // small delay to let visual modal close before opening next
                setTimeout(onEdit, 150);
              }}
              style={({ pressed }) => [
                styles.actionItem,
                {
                  backgroundColor: colors.mutedBg,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Edit2 size={18} color={colors.foreground} strokeWidth={2.5} />
              <Text style={[styles.actionText, { color: colors.foreground }]}>
                Edit Intent
              </Text>
            </Pressable>

            {/* Delete Intent */}
            <Pressable
              onPress={() => {
                onDelete();
                onClose();
              }}
              style={({ pressed }) => [
                styles.actionItem,
                styles.destructiveItem,
                {
                  backgroundColor: colors.mutedBg,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Trash2 size={18} color="#dc2626" strokeWidth={2.5} />
              <Text style={[styles.actionText, { color: '#dc2626', fontWeight: '600' }]}>
                Delete Intent
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  backdropPressable: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 24,
    paddingBottom: 40, // extra padding for bottom safe areas
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 16,
  },
  titleWrapper: {
    flex: 1,
  },
  title: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 26,
    lineHeight: 28,
  },
  description: {
    fontSize: 14,
    marginTop: 4,
    lineHeight: 18,
  },
  closeButton: {
    borderRadius: 99,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionList: {
    gap: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  destructiveItem: {},
  actionText: {
    fontSize: 15,
  },
});
