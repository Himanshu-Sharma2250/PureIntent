import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  Pressable,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from './ThemeContext';
import { Note } from '../db/noteRepository';

interface NoteModalProps {
  visible: boolean;
  note: Note | null; // Null if adding, otherwise editing
  onClose: () => void;
  onSave: (content: string) => Promise<void>;
}

const { height } = Dimensions.get('window');

/**
 * Editorial modal for creating and updating notes with a single content text field (no title).
 */
export const NoteModal: React.FC<NoteModalProps> = ({
  visible,
  note,
  onClose,
  onSave,
}) => {
  const { colors } = useTheme();

  const [content, setContent] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);

  // Animations
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      if (note) {
        setContent(note.content);
      } else {
        setContent('');
      }
      setErrorText(null);

      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0.5,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 30,
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
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, note, slideAnim, fadeAnim]);

  const handleSave = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      setErrorText('Note content cannot be empty.');
      return;
    }

    try {
      await onSave(trimmed);
      onClose();
    } catch (err: any) {
      setErrorText(err?.message || 'Failed to save note.');
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlayContainer}>
        {/* Backdrop overlay */}
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

        {/* Modal Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              borderColor: colors.borderColor,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* Modal Title Row */}
            <View style={styles.modalHeader}>
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                {note ? 'Revise Note' : 'Add Note'}
              </Text>
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

            {/* Error Message */}
            {errorText ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorText}</Text>
              </View>
            ) : null}

            {/* Content Input field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.mutedFg }]}>
                Note Content
              </Text>
              <TextInput
                value={content}
                onChangeText={(val) => {
                  setContent(val);
                  if (errorText) setErrorText(null);
                }}
                placeholder="Elaborate details, steps, or thoughts..."
                placeholderTextColor="rgba(103, 120, 124, 0.4)"
                multiline
                numberOfLines={5}
                style={[
                  styles.contentInput,
                  {
                    color: colors.foreground,
                    borderColor: colors.borderColor,
                    backgroundColor: colors.mutedBg,
                  },
                ]}
                autoFocus
              />
            </View>

            {/* Save Button */}
            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [
                styles.saveButton,
                {
                  backgroundColor: colors.foreground,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <Text style={[styles.saveButtonText, { color: colors.background }]}>
                {note ? 'Confirm Revision' : 'Save Note'}
              </Text>
            </Pressable>
          </ScrollView>
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
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '85%',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 28,
  },
  closeButton: {
    borderRadius: 99,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '600',
    marginBottom: 8,
  },
  contentInput: {
    fontSize: 15,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  saveButton: {
    borderRadius: 99,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
