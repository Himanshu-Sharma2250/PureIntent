import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  Pressable,
  Animated,
  ActivityIndicator,
  Easing,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Sun, Moon, Plus, Search, RefreshCw, Bell, BellOff } from 'lucide-react-native';
import { useTheme } from '../components/ThemeContext';
import { useIntents } from '../hooks/useIntents';
import { TaskCard } from '../components/TaskCard';
import { ActionModal } from '../components/ActionModal';
import { IntentModal } from '../components/IntentModal';
import { Intent } from '../db/taskRepository';

type FilterType = 'all' | 'pending' | 'completed';

export const HomeScreen: React.FC = () => {
  const { colors, toggleTheme, isDark } = useTheme();
  const {
    intents,
    loading,
    error,
    refresh,
    addIntent,
    updateIntent,
    toggleComplete,
    deleteIntent,
    notificationsEnabled,
    toggleGlobalNotifications,
    requestPermissions,
  } = useIntents();

  const navigation = useNavigation<any>();

  // Refresh intents list whenever HomeScreen comes into focus
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Modal states
  const [selectedIntent, setSelectedIntent] = useState<Intent | null>(null);
  const [isActionVisible, setIsActionVisible] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [formEditTarget, setFormEditTarget] = useState<Intent | null>(null);

  // Spinner rotation animation
  const spinValue = useRef(new Animated.Value(0)).current;

  // Theme Toggle Mode Physics Animation
  const themeAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  useEffect(() => {
    // Spin animation for loading spinner
    if (loading) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinValue.setValue(0);
    }
  }, [loading, spinValue]);

  // Trigger theme animation on change
  useEffect(() => {
    Animated.timing(themeAnim, {
      toValue: isDark ? 1 : 0,
      duration: 500,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [isDark, themeAnim]);

  // Interpolations for Sun/Moon Physics
  const sunTranslateY = themeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -35],
  });
  const sunOpacity = themeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const sunRotate = themeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '12deg'],
  });

  const moonTranslateY = themeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [35, 0],
  });
  const moonOpacity = themeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // Filter & Search Logic
  const filteredIntents = intents.filter((item) => {
    // Match search
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

    // Match filter
    if (activeFilter === 'pending') {
      return matchesSearch && !item.is_completed;
    }
    if (activeFilter === 'completed') {
      return matchesSearch && item.is_completed;
    }
    return matchesSearch;
  });

  // Action Menu Triggers
  const handleToggleComplete = (intent: Intent) => {
    toggleComplete(intent.id, !intent.is_completed);
  };

  const handleLongPressCard = (intent: Intent) => {
    setSelectedIntent(intent);
    setIsActionVisible(true);
  };

  const handleEditIntentTrigger = (intent: Intent) => {
    setFormEditTarget(intent);
    setIsFormVisible(true);
  };

  const handleSaveIntent = async (title: string, description: string, dueDate: string | null) => {
    if (formEditTarget) {
      await updateIntent(formEditTarget.id, { title, description, dueDate });
      setFormEditTarget(null);
    } else {
      await addIntent(title, description, dueDate);
    }
  };

  const handleNotificationToggle = async () => {
    if (!notificationsEnabled) {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert(
          'Notification Permission Required',
          'Notification permission is currently disabled on your device. Reminders will be stored locally and fire once permission is enabled in Settings.',
          [{ text: 'Understand' }]
        );
      }
    }
    await toggleGlobalNotifications();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={styles.container}>
        {/* Floating Top Header bar */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>PureIntent</Text>
            <Text style={[styles.headerSubtitle, { color: colors.mutedFg }]}>
              Begin your journey into focus.
            </Text>
          </View>

          {/* Action controls (Notifications & Theme) */}
          <View style={styles.headerActions}>
            {/* Global Notification Bell Toggle */}
            <Pressable
              onPress={handleNotificationToggle}
              accessibilityLabel="Toggle notifications"
              style={({ pressed }) => [
                styles.themeToggle,
                {
                  borderColor: colors.borderColor,
                  backgroundColor: colors.mutedBg,
                  transform: [{ scale: pressed ? 0.9 : 1 }],
                },
              ]}
            >
              {notificationsEnabled ? (
                <Bell size={18} color={colors.primary} strokeWidth={2.5} />
              ) : (
                <BellOff size={18} color={colors.mutedFg} strokeWidth={2} />
              )}
            </Pressable>

            {/* Theme Switcher Button with custom physics */}
            <Pressable
              onPress={toggleTheme}
              accessibilityLabel="Toggle theme"
              style={({ pressed }) => [
                styles.themeToggle,
                {
                  borderColor: colors.borderColor,
                  backgroundColor: colors.mutedBg,
                  transform: [{ scale: pressed ? 0.9 : 1 }],
                },
              ]}
            >
              {/* Sun Icon (Slide out top & fade) */}
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  styles.iconWrapper,
                  {
                    transform: [{ translateY: sunTranslateY }, { rotate: sunRotate }],
                    opacity: sunOpacity,
                  },
                ]}
              >
                <Sun size={18} color={colors.foreground} strokeWidth={2.5} />
              </Animated.View>

              {/* Moon Icon (Slide in from bottom & fade) */}
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  styles.iconWrapper,
                  {
                    transform: [{ translateY: moonTranslateY }],
                    opacity: moonOpacity,
                  },
                ]}
              >
                <Moon size={18} color={colors.foreground} strokeWidth={2.5} />
              </Animated.View>
            </Pressable>
          </View>
        </View>

        {/* Minimal Search and Filter bar */}
        <View style={styles.filterSection}>
          <View style={[styles.searchBar, { borderBottomColor: colors.borderColor }]}>
            <Search size={16} color={colors.mutedFg} style={styles.searchIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search intents..."
              placeholderTextColor="rgba(103, 120, 124, 0.4)"
              style={[styles.searchInput, { color: colors.foreground }]}
            />
          </View>

          {/* Filter Status Chips */}
          <View style={styles.tabsRow}>
            {(['all', 'pending', 'completed'] as FilterType[]).map((tab) => {
              const active = activeFilter === tab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => setActiveFilter(tab)}
                  style={({ pressed }) => [
                    styles.tabChip,
                    {
                      backgroundColor: active ? colors.foreground : 'transparent',
                      transform: [{ scale: pressed ? 0.95 : 1 }],
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabChipText,
                      {
                        color: active ? colors.background : colors.mutedFg,
                        fontWeight: active ? '500' : 'normal',
                      },
                    ]}
                  >
                    {tab}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Loading / Error states */}
        {loading && intents.length === 0 ? (
          <View style={styles.centerContainer}>
            <Animated.View
              style={[
                styles.spinner,
                {
                  borderColor: 'rgba(165, 0, 54, 0.2)', // primary alpha/20
                  borderTopColor: colors.primary,
                  transform: [
                    {
                      rotate: spinValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorLabel}>{error}</Text>
            <Pressable
              onPress={refresh}
              style={({ pressed }) => [
                styles.retryButton,
                {
                  backgroundColor: colors.mutedBg,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
            >
              <RefreshCw size={14} color={colors.foreground} />
              <Text style={[styles.retryText, { color: colors.foreground }]}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          /* Main FlatList wrapper */
          <FlatList
            data={filteredIntents}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item, index }) => (
              <TaskCard
                intent={item}
                index={index}
                onToggleComplete={() => handleToggleComplete(item)}
                onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
                onLongPress={() => handleLongPressCard(item)}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyHeadline, { color: colors.foreground }]}>
                  Silence.
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.mutedFg }]}>
                  {searchQuery
                    ? 'No matching intents have been found.'
                    : 'The mind is free of scheduled intentions.'}
                </Text>
              </View>
            }
          />
        )}

        {/* Float Action Button */}
        <View style={styles.fabContainer}>
          <Pressable
            onPress={() => {
              setFormEditTarget(null);
              setIsFormVisible(true);
            }}
            style={({ pressed }) => [
              styles.fab,
              {
                backgroundColor: colors.foreground,
                transform: [{ scale: pressed ? 0.92 : 1 }],
              },
            ]}
          >
            <Plus size={24} color={colors.background} strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* Custom Context Overlay Modal */}
        <ActionModal
          visible={isActionVisible}
          intent={selectedIntent}
          onClose={() => {
            setIsActionVisible(false);
            setSelectedIntent(null);
          }}
          onToggleComplete={() => selectedIntent && handleToggleComplete(selectedIntent)}
          onEdit={() => selectedIntent && handleEditIntentTrigger(selectedIntent)}
          onDelete={() => selectedIntent && deleteIntent(selectedIntent.id)}
        />

        {/* Add/Edit Form Slide modal */}
        <IntentModal
          visible={isFormVisible}
          intent={formEditTarget}
          onClose={() => {
            setIsFormVisible(false);
            setFormEditTarget(null);
          }}
          onSave={handleSaveIntent}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    marginBottom: 10,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 36,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 2,
  },
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterSection: {
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 6,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  tabChipText: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  listContent: {
    paddingBottom: 100, // allocate padding for FAB
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  spinner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
  },
  errorLabel: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    gap: 6,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 30,
  },
  emptyHeadline: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 32,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    zIndex: 99,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
});
