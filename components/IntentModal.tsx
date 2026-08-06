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
  Alert,
} from 'react-native';
import { Calendar as CalendarIcon, X } from 'lucide-react-native';
import { useTheme } from './ThemeContext';
import { Intent } from '../db/taskRepository';

interface IntentModalProps {
  visible: boolean;
  intent: Intent | null; // Null if adding, otherwise editing
  onClose: () => void;
  onSave: (title: string, description: string, dueDate: string | null) => Promise<void>;
}

const { height } = Dimensions.get('window');

export const IntentModal: React.FC<IntentModalProps> = ({
  visible,
  intent,
  onClose,
  onSave,
}) => {
  const { colors } = useTheme();
  
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<string | null>(null);
  
  // Custom Date Picker Modal Visibility
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Animations
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // React on visible state
  useEffect(() => {
    if (visible) {
      if (intent) {
        setTitle(intent.title);
        setDescription(intent.description || '');
        setDueDate(intent.due_date);
      } else {
        setTitle('');
        setDescription('');
        setDueDate(null);
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
  }, [visible, intent, slideAnim, fadeAnim]);

  const handleSave = async () => {
    if (!title.trim()) {
      setErrorText('The intent requires a title.');
      return;
    }

    try {
      await onSave(title.trim(), description.trim(), dueDate);
      onClose();
    } catch (err: any) {
      setErrorText(err?.message || 'Attempt failed. Please retry.');
    }
  };

  // Date handlers
  const setQuickDate = (type: 'today' | 'tomorrow' | 'nextWeek' | 'clear') => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);

    if (type === 'today') {
      setDueDate(d.toISOString().split('T')[0]);
    } else if (type === 'tomorrow') {
      d.setDate(d.getDate() + 1);
      setDueDate(d.toISOString().split('T')[0]);
    } else if (type === 'nextWeek') {
      d.setDate(d.getDate() + 7);
      setDueDate(d.toISOString().split('T')[0]);
    } else {
      setDueDate(null);
    }
  };

  const formatDateString = (dateStr: string | null) => {
    if (!dateStr) return 'No due date';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(Number(year), month, day);
    return date.toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Custom Calendar Generator for Custom Date Picker Modal
  const renderCalendar = () => {
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const getDaysInMonth = (month: number, year: number) => {
      return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (month: number, year: number) => {
      return new Date(year, month, 1).getDay(); // 0 is Sunday, 6 is Saturday
    };

    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);

    const prevMonthAction = () => {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    };

    const nextMonthAction = () => {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    };

    const weeks: (number | null)[][] = [];
    let currentWeek: (number | null)[] = Array(7).fill(null);

    // Fill offset days
    for (let i = 0; i < firstDay; i++) {
      currentWeek[i] = null;
    }

    let dayCounter = 1;
    for (let i = firstDay; i < 7; i++) {
      currentWeek[i] = dayCounter++;
    }
    weeks.push(currentWeek);

    while (dayCounter <= daysInMonth) {
      currentWeek = Array(7).fill(null);
      for (let i = 0; i < 7 && dayCounter <= daysInMonth; i++) {
        currentWeek[i] = dayCounter++;
      }
      weeks.push(currentWeek);
    }

    const selectDateVal = (day: number) => {
      const pad = (num: number) => (num < 10 ? '0' + num : num);
      const output = `${currentYear}-${pad(currentMonth + 1)}-${pad(day)}`;
      setDueDate(output);
      setShowDatePicker(false);
    };

    return (
      <Modal transparent visible={showDatePicker} onRequestClose={() => setShowDatePicker(false)}>
        <View style={styles.calendarOverlay}>
          <View style={[styles.calendarCard, { backgroundColor: colors.cardBg, borderColor: colors.borderColor }]}>
            {/* Header */}
            <View style={styles.calendarHeader}>
              <Pressable onPress={prevMonthAction} style={styles.navText}>
                <Text style={{ color: colors.primary, fontSize: 16 }}>Prev</Text>
              </Pressable>
              <Text style={[styles.calendarTitle, { color: colors.foreground }]}>
                {months[currentMonth]} {currentYear}
              </Text>
              <Pressable onPress={nextMonthAction} style={styles.navText}>
                <Text style={{ color: colors.primary, fontSize: 16 }}>Next</Text>
              </Pressable>
            </View>

            {/* Weekdays */}
            <View style={styles.weekdaysRow}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                <Text key={idx} style={[styles.weekdayText, { color: colors.mutedFg }]}>
                  {day}
                </Text>
              ))}
            </View>

            {/* Grid */}
            <View style={styles.calendarGrid}>
              {weeks.map((week, wIdx) => (
                <View key={wIdx} style={styles.calendarWeek}>
                  {week.map((day, dIdx) => {
                    const isSelected =
                      day !== null &&
                      dueDate ===
                        `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    return (
                      <Pressable
                        key={dIdx}
                        disabled={day === null}
                        onPress={() => day !== null && selectDateVal(day)}
                        style={[
                          styles.calendarDay,
                          isSelected && { backgroundColor: colors.primary },
                        ]}
                      >
                        {day !== null ? (
                          <Text style={{ color: isSelected ? '#ffffff' : colors.foreground, fontSize: 14 }}>
                            {day}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>

            <Pressable
              onPress={() => setShowDatePicker(false)}
              style={({ pressed }) => [
                styles.calendarCancel,
                { backgroundColor: colors.mutedBg, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={{ color: colors.foreground }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
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
                {intent ? 'Revise Intent' : 'Formulate Intent'}
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

            {/* Title Input field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.mutedFg }]}>
                What is your intent?
              </Text>
              <TextInput
                value={title}
                onChangeText={(val) => {
                  setTitle(val);
                  if (errorText) setErrorText(null);
                }}
                placeholder="Declare intention..."
                placeholderTextColor="rgba(103, 120, 124, 0.4)"
                style={[
                  styles.titleInput,
                  {
                    color: colors.foreground,
                    borderBottomColor: colors.borderColor,
                  },
                ]}
                autoFocus
              />
            </View>

            {/* Description Input field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.mutedFg }]}>
                Subtext / Detail (optional)
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Elaborate details..."
                placeholderTextColor="rgba(103, 120, 124, 0.4)"
                multiline
                numberOfLines={3}
                style={[
                  styles.descInput,
                  {
                    color: colors.foreground,
                    borderBottomColor: colors.borderColor,
                  },
                ]}
              />
            </View>

            {/* Due Date Picker Group */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.mutedFg }]}>
                Temporal Target (optional)
              </Text>
              
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={({ pressed }) => [
                  styles.dateTrigger,
                  {
                    backgroundColor: colors.mutedBg,
                    borderColor: colors.borderColor,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <CalendarIcon size={16} color={colors.foreground} />
                <Text style={[styles.dateTriggerText, { color: colors.foreground }]}>
                  {formatDateString(dueDate)}
                </Text>
              </Pressable>

              {/* Quick Chips row */}
              <View style={styles.chipsRow}>
                {[
                  { label: 'Today', value: 'today' },
                  { label: 'Tomorrow', value: 'tomorrow' },
                  { label: 'In 1 Week', value: 'nextWeek' },
                  { label: 'No Date', value: 'clear' },
                ].map((chip) => {
                  const checkToday = new Date().toISOString().split('T')[0];
                  let isSelected = false;
                  
                  if (chip.value === 'today') {
                    isSelected = dueDate === checkToday;
                  } else if (chip.value === 'tomorrow') {
                    const tom = new Date();
                    tom.setDate(tom.getDate() + 1);
                    isSelected = dueDate === tom.toISOString().split('T')[0];
                  } else if (chip.value === 'nextWeek') {
                    const wk = new Date();
                    wk.setDate(wk.getDate() + 7);
                    isSelected = dueDate === wk.toISOString().split('T')[0];
                  } else if (chip.value === 'clear') {
                    isSelected = dueDate === null;
                  }

                  return (
                    <Pressable
                      key={chip.value}
                      onPress={() => setQuickDate(chip.value as any)}
                      style={({ pressed }) => [
                        styles.chip,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.mutedBg,
                          transform: [{ scale: pressed ? 0.95 : 1 }],
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: isSelected ? '#ffffff' : colors.foreground },
                        ]}
                      >
                        {chip.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
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
                {intent ? 'Confirm Revision' : 'Register Intent'}
              </Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </View>

      {/* Render custom calendar grid */}
      {showDatePicker && renderCalendar()}
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
    maxHeight: '90%',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
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
    marginBottom: 20,
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
  titleInput: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 22,
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  descInput: {
    fontSize: 15,
    borderBottomWidth: 1,
    paddingVertical: 8,
    textAlignVertical: 'top',
  },
  dateTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginBottom: 12,
  },
  dateTriggerText: {
    fontSize: 15,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  saveButton: {
    borderRadius: 99,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Calendar Modal Styles
  calendarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  calendarCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 5,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  navText: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  calendarTitle: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 22,
  },
  weekdaysRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekdayText: {
    width: 32,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: {
    width: '100%',
    gap: 4,
  },
  calendarWeek: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
  },
  calendarDay: {
    width: 32,
    height: 32,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarCancel: {
    marginTop: 20,
    width: '100%',
    paddingVertical: 12,
    borderRadius: 99,
    alignItems: 'center',
  },
});
