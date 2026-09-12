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
import { X, Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from './ThemeContext';
import { TimeLog } from '../db/timeLogRepository';

interface TimeLogModalProps {
  visible: boolean;
  timeLog: TimeLog | null; // Null if adding, otherwise editing
  onClose: () => void;
  onSave: (timeSpentMinutes: number, description: string, workDate: string) => Promise<void>;
}

const { height } = Dimensions.get('window');

const getTodayDateString = (): string => {
  const d = new Date();
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${da}`;
};

const getYesterdayDateString = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${da}`;
};

/**
 * Editorial modal for logging work sessions and updating existing time logs.
 * Supports hours & minutes inputs, date selection with backdating validation,
 * multiline description input, and quick-add chips.
 */
export const TimeLogModal: React.FC<TimeLogModalProps> = ({
  visible,
  timeLog,
  onClose,
  onSave,
}) => {
  const { colors } = useTheme();

  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('30');
  const [description, setDescription] = useState('');
  const [workDate, setWorkDate] = useState<string>(getTodayDateString());
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Calendar month/year navigation state
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  // Animations
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      if (timeLog) {
        const h = Math.floor(timeLog.time_spent_minutes / 60);
        const m = timeLog.time_spent_minutes % 60;
        setHours(String(h));
        setMinutes(String(m));
        setDescription(timeLog.description);
        setWorkDate(timeLog.work_date);
      } else {
        setHours('0');
        setMinutes('30');
        setDescription('');
        setWorkDate(getTodayDateString());
      }
      setErrorText(null);
      setShowCalendar(false);

      // Reset calendar navigation to current date's month/year
      const now = new Date();
      setCalendarMonth(now.getMonth());
      setCalendarYear(now.getFullYear());

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
  }, [visible, timeLog, slideAnim, fadeAnim]);

  const handleQuickAdd = (addHours: number, addMinutes: number) => {
    const currentH = parseInt(hours, 10) || 0;
    const currentM = parseInt(minutes, 10) || 0;
    const totalCurrentMinutes = currentH * 60 + currentM;
    const addedMinutes = addHours * 60 + addMinutes;
    const newTotal = totalCurrentMinutes + addedMinutes;

    setHours(String(Math.floor(newTotal / 60)));
    setMinutes(String(newTotal % 60));
    if (errorText) setErrorText(null);
  };

  const handleSetExactDuration = (totalMins: number) => {
    setHours(String(Math.floor(totalMins / 60)));
    setMinutes(String(totalMins % 60));
    if (errorText) setErrorText(null);
  };

  const handleSave = async () => {
    const parsedH = parseInt(hours, 10) || 0;
    const parsedM = parseInt(minutes, 10) || 0;
    const totalMinutes = parsedH * 60 + parsedM;
    const trimmedDesc = description.trim();
    const todayStr = getTodayDateString();

    if (totalMinutes <= 0) {
      setErrorText('Time spent must be greater than 0 minutes.');
      return;
    }

    if (!trimmedDesc) {
      setErrorText('Description is required.');
      return;
    }

    if (workDate > todayStr) {
      setErrorText('Work date cannot be in the future.');
      return;
    }

    try {
      await onSave(totalMinutes, trimmedDesc, workDate);
      onClose();
    } catch (err: any) {
      setErrorText(err?.message || 'Failed to save time log.');
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    const todayStr = getTodayDateString();
    const yesterdayStr = getYesterdayDateString();

    if (dateStr === todayStr) return 'Today';
    if (dateStr === yesterdayStr) return 'Yesterday';

    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Calendar Helpers
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const pad = (n: number) => (n < 10 ? '0' + n : String(n));
    const selected = `${calendarYear}-${pad(calendarMonth + 1)}-${pad(day)}`;
    const todayStr = getTodayDateString();

    if (selected > todayStr) {
      setErrorText('Cannot select future dates.');
      return;
    }

    setWorkDate(selected);
    setShowCalendar(false);
    if (errorText) setErrorText(null);
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
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                {timeLog ? 'Revise Time Log' : 'Log Work Session'}
              </Text>
              <Pressable
                onPress={onClose}
                accessibilityLabel="Close modal"
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

            {/* Time Spent Input Section */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.mutedFg }]}>
                Time Spent
              </Text>

              <View style={styles.timeInputsRow}>
                {/* Hours Input */}
                <View style={styles.timeInputWrapper}>
                  <TextInput
                    value={hours}
                    onChangeText={(val) => {
                      const cleaned = val.replace(/[^0-9]/g, '');
                      setHours(cleaned);
                      if (errorText) setErrorText(null);
                    }}
                    placeholder="0"
                    placeholderTextColor="rgba(103, 120, 124, 0.4)"
                    keyboardType="number-pad"
                    maxLength={3}
                    style={[
                      styles.timeInputField,
                      {
                        color: colors.foreground,
                        borderColor: colors.borderColor,
                        backgroundColor: colors.mutedBg,
                      },
                    ]}
                  />
                  <Text style={[styles.timeUnitLabel, { color: colors.mutedFg }]}>Hours</Text>
                </View>

                <Text style={[styles.timeSeparator, { color: colors.mutedFg }]}>:</Text>

                {/* Minutes Input */}
                <View style={styles.timeInputWrapper}>
                  <TextInput
                    value={minutes}
                    onChangeText={(val) => {
                      const cleaned = val.replace(/[^0-9]/g, '');
                      setMinutes(cleaned);
                      if (errorText) setErrorText(null);
                    }}
                    placeholder="0"
                    placeholderTextColor="rgba(103, 120, 124, 0.4)"
                    keyboardType="number-pad"
                    maxLength={3}
                    style={[
                      styles.timeInputField,
                      {
                        color: colors.foreground,
                        borderColor: colors.borderColor,
                        backgroundColor: colors.mutedBg,
                      },
                    ]}
                  />
                  <Text style={[styles.timeUnitLabel, { color: colors.mutedFg }]}>Minutes</Text>
                </View>
              </View>

              {/* Quick Duration Preset Chips */}
              <View style={styles.presetChipsRow}>
                {[
                  { label: '15m', minutes: 15 },
                  { label: '30m', minutes: 30 },
                  { label: '1h', minutes: 60 },
                  { label: '2h', minutes: 120 },
                  { label: '4h', minutes: 240 },
                ].map((preset) => {
                  const currentTotal = (parseInt(hours, 10) || 0) * 60 + (parseInt(minutes, 10) || 0);
                  const isSelected = currentTotal === preset.minutes;

                  return (
                    <Pressable
                      key={preset.label}
                      onPress={() => handleSetExactDuration(preset.minutes)}
                      style={({ pressed }) => [
                        styles.presetChip,
                        {
                          backgroundColor: isSelected ? colors.foreground : colors.mutedBg,
                          borderColor: colors.borderColor,
                          transform: [{ scale: pressed ? 0.94 : 1 }],
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          {
                            color: isSelected ? colors.background : colors.foreground,
                            fontWeight: isSelected ? '600' : 'normal',
                          },
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Work Date Selection Section */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.mutedFg }]}>
                Work Date (Backdating Supported)
              </Text>

              <View style={styles.dateSelectorRow}>
                {/* Today Preset */}
                <Pressable
                  onPress={() => {
                    setWorkDate(getTodayDateString());
                    setShowCalendar(false);
                    if (errorText) setErrorText(null);
                  }}
                  style={({ pressed }) => [
                    styles.dateChip,
                    {
                      backgroundColor: workDate === getTodayDateString() ? colors.foreground : colors.mutedBg,
                      borderColor: colors.borderColor,
                      transform: [{ scale: pressed ? 0.95 : 1 }],
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dateChipText,
                      {
                        color: workDate === getTodayDateString() ? colors.background : colors.foreground,
                        fontWeight: workDate === getTodayDateString() ? '600' : 'normal',
                      },
                    ]}
                  >
                    Today
                  </Text>
                </Pressable>

                {/* Yesterday Preset */}
                <Pressable
                  onPress={() => {
                    setWorkDate(getYesterdayDateString());
                    setShowCalendar(false);
                    if (errorText) setErrorText(null);
                  }}
                  style={({ pressed }) => [
                    styles.dateChip,
                    {
                      backgroundColor: workDate === getYesterdayDateString() ? colors.foreground : colors.mutedBg,
                      borderColor: colors.borderColor,
                      transform: [{ scale: pressed ? 0.95 : 1 }],
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dateChipText,
                      {
                        color: workDate === getYesterdayDateString() ? colors.background : colors.foreground,
                        fontWeight: workDate === getYesterdayDateString() ? '600' : 'normal',
                      },
                    ]}
                  >
                    Yesterday
                  </Text>
                </Pressable>

                {/* Custom Date Picker Trigger */}
                <Pressable
                  onPress={() => setShowCalendar((prev) => !prev)}
                  style={({ pressed }) => [
                    styles.customDateButton,
                    {
                      backgroundColor:
                        workDate !== getTodayDateString() && workDate !== getYesterdayDateString()
                          ? colors.foreground
                          : colors.mutedBg,
                      borderColor: colors.borderColor,
                      transform: [{ scale: pressed ? 0.95 : 1 }],
                    },
                  ]}
                >
                  <CalendarIcon
                    size={13}
                    color={
                      workDate !== getTodayDateString() && workDate !== getYesterdayDateString()
                        ? colors.background
                        : colors.foreground
                    }
                  />
                  <Text
                    style={[
                      styles.dateChipText,
                      {
                        color:
                          workDate !== getTodayDateString() && workDate !== getYesterdayDateString()
                            ? colors.background
                            : colors.foreground,
                        fontWeight:
                          workDate !== getTodayDateString() && workDate !== getYesterdayDateString()
                            ? '600'
                            : 'normal',
                      },
                    ]}
                  >
                    {formatDisplayDate(workDate)}
                  </Text>
                </Pressable>
              </View>

              {/* Inline Calendar when Custom Date is Active */}
              {showCalendar ? (
                <View
                  style={[
                    styles.calendarCard,
                    {
                      backgroundColor: colors.cardBg,
                      borderColor: colors.borderColor,
                    },
                  ]}
                >
                  {/* Calendar Month Header */}
                  <View style={styles.calendarNavRow}>
                    <Pressable
                      onPress={handlePrevMonth}
                      style={[styles.calNavBtn, { backgroundColor: colors.mutedBg }]}
                    >
                      <ChevronLeft size={16} color={colors.foreground} />
                    </Pressable>

                    <Text style={[styles.calendarTitle, { color: colors.foreground }]}>
                      {months[calendarMonth]} {calendarYear}
                    </Text>

                    <Pressable
                      onPress={handleNextMonth}
                      style={[styles.calNavBtn, { backgroundColor: colors.mutedBg }]}
                    >
                      <ChevronRight size={16} color={colors.foreground} />
                    </Pressable>
                  </View>

                  {/* Day of Week Headers */}
                  <View style={styles.calDaysHeaderRow}>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                      <Text key={i} style={[styles.calDayHeader, { color: colors.mutedFg }]}>
                        {d}
                      </Text>
                    ))}
                  </View>

                  {/* Calendar Grid */}
                  <View style={styles.calGrid}>
                    {(() => {
                      const daysInMonth = getDaysInMonth(calendarMonth, calendarYear);
                      const firstDay = getFirstDayOfMonth(calendarMonth, calendarYear);
                      const pad = (n: number) => (n < 10 ? '0' + n : String(n));
                      const todayStr = getTodayDateString();

                      const items: React.ReactNode[] = [];

                      // Blank leading days
                      for (let i = 0; i < firstDay; i++) {
                        items.push(<View key={`blank-${i}`} style={styles.calDayCell} />);
                      }

                      // Month days
                      for (let day = 1; day <= daysInMonth; day++) {
                        const cellDateStr = `${calendarYear}-${pad(calendarMonth + 1)}-${pad(day)}`;
                        const isFuture = cellDateStr > todayStr;
                        const isCurrentSelected = cellDateStr === workDate;

                        items.push(
                          <Pressable
                            key={`day-${day}`}
                            disabled={isFuture}
                            onPress={() => handleSelectDay(day)}
                            style={[
                              styles.calDayCell,
                              isCurrentSelected && {
                                backgroundColor: colors.foreground,
                                borderRadius: 8,
                              },
                              isFuture && { opacity: 0.25 },
                            ]}
                          >
                            <Text
                              style={[
                                styles.calDayNumber,
                                {
                                  color: isCurrentSelected
                                    ? colors.background
                                    : isFuture
                                    ? colors.mutedFg
                                    : colors.foreground,
                                  fontWeight: isCurrentSelected ? '700' : 'normal',
                                },
                              ]}
                            >
                              {day}
                            </Text>
                          </Pressable>
                        );
                      }

                      return items;
                    })()}
                  </View>
                </View>
              ) : null}
            </View>

            {/* Description Input Section */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.mutedFg }]}>
                Work Description (Required)
              </Text>
              <TextInput
                value={description}
                onChangeText={(val) => {
                  setDescription(val);
                  if (errorText) setErrorText(null);
                }}
                placeholder="What did you accomplish during this session?"
                placeholderTextColor="rgba(103, 120, 124, 0.4)"
                multiline
                numberOfLines={4}
                style={[
                  styles.descriptionInput,
                  {
                    color: colors.foreground,
                    borderColor: colors.borderColor,
                    backgroundColor: colors.mutedBg,
                  },
                ]}
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
                {timeLog ? 'Confirm Revision' : 'Log Time'}
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
    marginBottom: 22,
  },
  inputLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '600',
    marginBottom: 10,
  },
  timeInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  timeInputWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  timeInputField: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
  },
  timeUnitLabel: {
    fontSize: 11,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
  },
  presetChipsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 12,
  },
  dateSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  dateChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
  },
  customDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
  },
  dateChipText: {
    fontSize: 12,
  },
  calendarCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  calendarNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calendarTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  calNavBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDaysHeaderRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calDayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calDayCell: {
    width: `${100 / 7}%`,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDayNumber: {
    fontSize: 13,
  },
  descriptionInput: {
    fontSize: 15,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  saveButton: {
    borderRadius: 99,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
