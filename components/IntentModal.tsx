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
import { Calendar as CalendarIcon, Clock as ClockIcon, X, AlertCircle } from 'lucide-react-native';
import { useTheme } from './ThemeContext';
import { Intent } from '../db/taskRepository';

interface IntentModalProps {
  visible: boolean;
  intent: Intent | null; // Null if adding, otherwise editing
  onClose: () => void;
  onSave: (title: string, description: string, dueDate: string | null) => Promise<void>;
}

const { height } = Dimensions.get('window');

/**
 * Combines date string (YYYY-MM-DD), hours (0-23), and minutes (0-59) into an ISO string.
 */
const getCombinedISO = (dateStr: string | null, hrs: number, mins: number): string | null => {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const dateObj = new Date(year, month, day, hrs, mins, 0, 0);
  if (isNaN(dateObj.getTime())) return null;
  return dateObj.toISOString();
};

/**
 * Formats hours (0-23) and minutes (0-59) for editorial display (e.g. "5:00 PM").
 */
const formatTimeDisplay = (hrs: number, mins: number): string => {
  const ampm = hrs >= 12 ? 'PM' : 'AM';
  const displayHrs = hrs % 12 === 0 ? 12 : hrs % 12;
  const displayMins = String(mins).padStart(2, '0');
  return `${displayHrs}:${displayMins} ${ampm}`;
};

export const IntentModal: React.FC<IntentModalProps> = ({
  visible,
  intent,
  onClose,
  onSave,
}) => {
  const { colors } = useTheme();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedHours, setSelectedHours] = useState<number>(17); // Default 5:00 PM
  const [selectedMinutes, setSelectedMinutes] = useState<number>(0);

  // Picker Modals Visibility
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Temporary time picker state (for live editing inside time modal)
  const [tempHours, setTempHours] = useState<number>(17);
  const [tempMinutes, setTempMinutes] = useState<number>(0);

  // Animations
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Sync state when modal becomes visible or intent changes
  useEffect(() => {
    if (visible) {
      if (intent && intent.due_date) {
        setTitle(intent.title);
        setDescription(intent.description || '');

        if (intent.due_date.includes('T')) {
          const d = new Date(intent.due_date);
          if (!isNaN(d.getTime())) {
            const yr = d.getFullYear();
            const mo = String(d.getMonth() + 1).padStart(2, '0');
            const da = String(d.getDate()).padStart(2, '0');
            setSelectedDate(`${yr}-${mo}-${da}`);
            setSelectedHours(d.getHours());
            setSelectedMinutes(d.getMinutes());
          } else {
            setSelectedDate(null);
            setSelectedHours(17);
            setSelectedMinutes(0);
          }
        } else {
          // Date-only legacy string
          setSelectedDate(intent.due_date);
          setSelectedHours(17);
          setSelectedMinutes(0);
        }
      } else if (intent) {
        setTitle(intent.title);
        setDescription(intent.description || '');
        setSelectedDate(null);
        setSelectedHours(17);
        setSelectedMinutes(0);
      } else {
        setTitle('');
        setDescription('');
        setSelectedDate(null);
        setSelectedHours(17);
        setSelectedMinutes(0);
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

  // Derived target combined datetime & past check
  const combinedISO = getCombinedISO(selectedDate, selectedHours, selectedMinutes);
  const combinedDateObj = combinedISO ? new Date(combinedISO) : null;
  const isPastTime = combinedDateObj ? combinedDateObj.getTime() <= Date.now() : false;

  const handleSave = async () => {
    if (!title.trim()) {
      setErrorText('The intent requires a title.');
      return;
    }

    try {
      const finalDueDateISO = combineDateTimeToISO(selectedDate, selectedHours, selectedMinutes);
      await onSave(title.trim(), description.trim(), finalDueDateISO);
      onClose();
    } catch (err: any) {
      setErrorText(err?.message || 'Attempt failed. Please retry.');
    }
  };

  const combineDateTimeToISO = (dateStr: string | null, hrs: number, mins: number): string | null => {
    return getCombinedISO(dateStr, hrs, mins);
  };

  // Date Quick Preset Handlers
  const setQuickDate = (type: 'today' | 'tomorrow' | 'nextWeek' | 'clear') => {
    const d = new Date();

    if (type === 'today') {
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      setSelectedDate(`${yr}-${mo}-${da}`);
      // If current hour is past 5 PM today, default to 1 hour from now for convenience
      if (d.getHours() >= 17) {
        setSelectedHours(Math.min(d.getHours() + 1, 23));
        setSelectedMinutes(0);
      }
    } else if (type === 'tomorrow') {
      d.setDate(d.getDate() + 1);
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      setSelectedDate(`${yr}-${mo}-${da}`);
    } else if (type === 'nextWeek') {
      d.setDate(d.getDate() + 7);
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      setSelectedDate(`${yr}-${mo}-${da}`);
    } else {
      setSelectedDate(null);
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
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Custom Calendar Generator for Custom Date Picker Modal
  const renderCalendar = () => {
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
      return new Date(year, month, 1).getDay();
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
      setSelectedDate(output);
      setShowDatePicker(false);
    };

    return (
      <Modal transparent visible={showDatePicker} onRequestClose={() => setShowDatePicker(false)}>
        <View style={styles.calendarOverlay}>
          <View style={[styles.calendarCard, { backgroundColor: colors.cardBg, borderColor: colors.borderColor }]}>
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

            <View style={styles.weekdaysRow}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                <Text key={idx} style={[styles.weekdayText, { color: colors.mutedFg }]}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {weeks.map((week, wIdx) => (
                <View key={wIdx} style={styles.calendarWeek}>
                  {week.map((day, dIdx) => {
                    const isSelected =
                      day !== null &&
                      selectedDate ===
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
              <Text style={{ color: colors.foreground }}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  };

  // Custom Editorial Time Picker Modal
  const renderTimePicker = () => {
    const isAm = tempHours < 12;
    const hour12Val = tempHours % 12 === 0 ? 12 : tempHours % 12;

    const setHour12 = (h12: number) => {
      let newH24 = isAm ? (h12 === 12 ? 0 : h12) : (h12 === 12 ? 12 : h12 + 12);
      setTempHours(newH24);
    };

    const toggleAmPm = (targetIsAm: boolean) => {
      if (targetIsAm && !isAm) {
        setTempHours(tempHours - 12);
      } else if (!targetIsAm && isAm) {
        setTempHours(tempHours + 12);
      }
    };

    const confirmTime = () => {
      setSelectedHours(tempHours);
      setSelectedMinutes(tempMinutes);
      setShowTimePicker(false);
    };

    return (
      <Modal
        transparent
        visible={showTimePicker}
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.calendarOverlay}>
          <View style={[styles.timePickerCard, { backgroundColor: colors.cardBg, borderColor: colors.borderColor }]}>
            <Text style={[styles.timePickerTitle, { color: colors.foreground }]}>Select Exact Time</Text>

            {/* Time Display Header */}
            <View style={[styles.timeDisplayBox, { backgroundColor: colors.mutedBg, borderColor: colors.borderColor }]}>
              <Text style={[styles.timeDisplayText, { color: colors.foreground }]}>
                {formatTimeDisplay(tempHours, tempMinutes)}
              </Text>
            </View>

            {/* Quick Time Presets */}
            <Text style={[styles.pickerSectionLabel, { color: colors.mutedFg }]}>Quick Presets</Text>
            <View style={styles.timePresetRow}>
              {[
                { label: '9 AM', hrs: 9, mins: 0 },
                { label: '12 PM', hrs: 12, mins: 0 },
                { label: '3 PM', hrs: 15, mins: 0 },
                { label: '5 PM', hrs: 17, mins: 0 },
                { label: '8 PM', hrs: 20, mins: 0 },
              ].map((p) => (
                <Pressable
                  key={p.label}
                  onPress={() => {
                    setTempHours(p.hrs);
                    setTempMinutes(p.mins);
                  }}
                  style={({ pressed }) => [
                    styles.timePresetChip,
                    {
                      backgroundColor: tempHours === p.hrs && tempMinutes === p.mins ? colors.primary : colors.mutedBg,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 11, fontWeight: '500', color: tempHours === p.hrs && tempMinutes === p.mins ? '#ffffff' : colors.foreground }}>
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* AM / PM Selector */}
            <View style={styles.ampmRow}>
              <Pressable
                onPress={() => toggleAmPm(true)}
                style={[
                  styles.ampmBtn,
                  { backgroundColor: isAm ? colors.primary : colors.mutedBg },
                ]}
              >
                <Text style={{ color: isAm ? '#ffffff' : colors.foreground, fontWeight: '600', fontSize: 13 }}>AM</Text>
              </Pressable>
              <Pressable
                onPress={() => toggleAmPm(false)}
                style={[
                  styles.ampmBtn,
                  { backgroundColor: !isAm ? colors.primary : colors.mutedBg },
                ]}
              >
                <Text style={{ color: !isAm ? '#ffffff' : colors.foreground, fontWeight: '600', fontSize: 13 }}>PM</Text>
              </Pressable>
            </View>

            {/* Hour Selector (1-12) */}
            <Text style={[styles.pickerSectionLabel, { color: colors.mutedFg }]}>Hour</Text>
            <View style={styles.gridRow}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => {
                const isSelected = hour12Val === h;
                return (
                  <Pressable
                    key={h}
                    onPress={() => setHour12(h)}
                    style={[
                      styles.gridItem,
                      { backgroundColor: isSelected ? colors.primary : colors.mutedBg },
                    ]}
                  >
                    <Text style={{ color: isSelected ? '#ffffff' : colors.foreground, fontSize: 13, fontWeight: '500' }}>
                      {h}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Minute Selector */}
            <Text style={[styles.pickerSectionLabel, { color: colors.mutedFg }]}>Minute</Text>
            <View style={styles.gridRow}>
              {[0, 15, 30, 45].map((m) => {
                const isSelected = tempMinutes === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => setTempMinutes(m)}
                    style={[
                      styles.minuteGridItem,
                      { backgroundColor: isSelected ? colors.primary : colors.mutedBg },
                    ]}
                  >
                    <Text style={{ color: isSelected ? '#ffffff' : colors.foreground, fontSize: 13, fontWeight: '500' }}>
                      :{String(m).padStart(2, '0')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Modal Buttons */}
            <View style={styles.timeActionRow}>
              <Pressable
                onPress={() => setShowTimePicker(false)}
                style={({ pressed }) => [
                  styles.timeCancelBtn,
                  { backgroundColor: colors.mutedBg, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text style={{ color: colors.foreground }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmTime}
                style={({ pressed }) => [
                  styles.timeSaveBtn,
                  { backgroundColor: colors.foreground, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text style={{ color: colors.background, fontWeight: '600' }}>Confirm Time</Text>
              </Pressable>
            </View>
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

            {/* Due Date & Time Picker Group */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.mutedFg }]}>
                Temporal Target (optional)
              </Text>
              
              {/* Date & Time Triggers Row */}
              <View style={styles.triggerPairRow}>
                {/* Date Trigger */}
                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  style={({ pressed }) => [
                    styles.dateTrigger,
                    {
                      backgroundColor: colors.mutedBg,
                      borderColor: colors.borderColor,
                      opacity: pressed ? 0.8 : 1,
                      flex: 1,
                    },
                  ]}
                >
                  <CalendarIcon size={16} color={colors.foreground} />
                  <Text style={[styles.dateTriggerText, { color: colors.foreground }]} numberOfLines={1}>
                    {formatDateString(selectedDate)}
                  </Text>
                </Pressable>

                {/* Time Trigger (enabled when date is set) */}
                {selectedDate ? (
                  <Pressable
                    onPress={() => {
                      setTempHours(selectedHours);
                      setTempMinutes(selectedMinutes);
                      setShowTimePicker(true);
                    }}
                    style={({ pressed }) => [
                      styles.dateTrigger,
                      {
                        backgroundColor: colors.mutedBg,
                        borderColor: colors.borderColor,
                        opacity: pressed ? 0.8 : 1,
                        flex: 1,
                      },
                    ]}
                  >
                    <ClockIcon size={16} color={colors.primary} />
                    <Text style={[styles.dateTriggerText, { color: colors.foreground }]} numberOfLines={1}>
                      {formatTimeDisplay(selectedHours, selectedMinutes)}
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {/* Inline Validation Warning for Past Time */}
              {selectedDate && isPastTime ? (
                <View style={styles.warningContainer}>
                  <AlertCircle size={14} color="#d97706" />
                  <Text style={styles.warningText}>
                    Selected time has already passed. The task will save, but no offline reminder will fire.
                  </Text>
                </View>
              ) : selectedDate ? (
                <Text style={[styles.notificationHint, { color: colors.mutedFg }]}>
                  An offline local reminder will fire on {formatDateString(selectedDate)} at {formatTimeDisplay(selectedHours, selectedMinutes)}.
                </Text>
              ) : null}

              {/* Quick Date Chips row */}
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
                    isSelected = selectedDate === checkToday;
                  } else if (chip.value === 'tomorrow') {
                    const tom = new Date();
                    tom.setDate(tom.getDate() + 1);
                    isSelected = selectedDate === tom.toISOString().split('T')[0];
                  } else if (chip.value === 'nextWeek') {
                    const wk = new Date();
                    wk.setDate(wk.getDate() + 7);
                    isSelected = selectedDate === wk.toISOString().split('T')[0];
                  } else if (chip.value === 'clear') {
                    isSelected = selectedDate === null;
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

              {/* Quick Time Chips (only shown if date selected) */}
              {selectedDate ? (
                <View style={[styles.chipsRow, { marginTop: 8 }]}>
                  {[
                    { label: '9 AM', hrs: 9, mins: 0 },
                    { label: '12 PM', hrs: 12, mins: 0 },
                    { label: '3 PM', hrs: 15, mins: 0 },
                    { label: '5 PM', hrs: 17, mins: 0 },
                    { label: '8 PM', hrs: 20, mins: 0 },
                  ].map((tChip) => {
                    const isSelected = selectedHours === tChip.hrs && selectedMinutes === tChip.mins;
                    return (
                      <Pressable
                        key={tChip.label}
                        onPress={() => {
                          setSelectedHours(tChip.hrs);
                          setSelectedMinutes(tChip.mins);
                        }}
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
                          {tChip.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
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

      {/* Custom calendar grid */}
      {showDatePicker && renderCalendar()}

      {/* Custom time picker */}
      {showTimePicker && renderTimePicker()}
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
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef3c7',
    borderRadius: 12,
    padding: 10,
    gap: 8,
    marginBottom: 12,
  },
  warningText: {
    color: '#b45309',
    fontSize: 12,
    flex: 1,
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
  triggerPairRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  dateTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  dateTriggerText: {
    fontSize: 14,
    flex: 1,
  },
  notificationHint: {
    fontSize: 11,
    fontStyle: 'italic',
    marginBottom: 10,
    paddingLeft: 4,
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

  // Time Picker Modal Styles
  timePickerCard: {
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
  timePickerTitle: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 24,
    marginBottom: 12,
  },
  timeDisplayBox: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  timeDisplayText: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 28,
    letterSpacing: 1,
  },
  pickerSectionLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '600',
    alignSelf: 'flex-start',
    marginTop: 10,
    marginBottom: 6,
  },
  timePresetRow: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 8,
  },
  timePresetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
  },
  ampmRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 10,
  },
  ampmBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 99,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    width: '100%',
    marginBottom: 8,
  },
  gridItem: {
    width: 40,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minuteGridItem: {
    width: 64,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeActionRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 16,
  },
  timeCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 99,
    alignItems: 'center',
  },
  timeSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 99,
    alignItems: 'center',
  },
});
