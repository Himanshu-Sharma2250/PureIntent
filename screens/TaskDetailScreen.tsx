import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Bell,
  Edit2,
  Trash2,
  Plus,
} from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../components/ThemeContext';
import { useSQLiteContext } from 'expo-sqlite';
import { taskRepository, Intent } from '../db/taskRepository';
import { notificationService } from '../services/notificationService';
import { useNotes } from '../hooks/useNotes';
import { NoteCard } from '../components/NoteCard';
import { NoteModal } from '../components/NoteModal';
import { IntentModal } from '../components/IntentModal';
import { Note } from '../db/noteRepository';

type TaskDetailRouteParams = {
  TaskDetail: { taskId: number };
};

export const TaskDetailScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<TaskDetailRouteParams, 'TaskDetail'>>();
  const taskId = route.params?.taskId;
  const db = useSQLiteContext();

  const [task, setTask] = useState<Intent | null>(null);
  const [taskLoading, setTaskLoading] = useState<boolean>(true);

  // Modal states
  const [isEditTaskVisible, setIsEditTaskVisible] = useState<boolean>(false);
  const [isNoteModalVisible, setIsNoteModalVisible] = useState<boolean>(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  // Notes Hook
  const {
    notes,
    loading: notesLoading,
    addNote,
    updateNote,
    deleteNote,
  } = useNotes(taskId);

  // Fetch current task
  const loadTask = useCallback(async () => {
    if (!taskId) return;
    try {
      setTaskLoading(true);
      const loadedTask = await taskRepository.getIntentById(db, taskId);
      if (!loadedTask) {
        // Task no longer exists
        navigation.goBack();
        return;
      }
      setTask(loadedTask);
    } catch (err) {
      console.error(`[TaskDetailScreen] Error loading task ${taskId}:`, err);
    } finally {
      setTaskLoading(false);
    }
  }, [db, taskId, navigation]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  // Toggle task completion
  const handleToggleComplete = async () => {
    if (!task) return;
    const nextCompleted = !task.is_completed;
    try {
      await taskRepository.toggleComplete(db, task.id, nextCompleted);

      if (nextCompleted) {
        if (task.notification_id) {
          await notificationService.cancelTaskNotification(task.notification_id);
          await taskRepository.updateNotificationId(db, task.id, null);
        }
      } else {
        const refreshed = await taskRepository.getIntentById(db, task.id);
        if (refreshed && refreshed.due_date) {
          await notificationService.rescheduleTaskNotification(db, refreshed);
        }
      }

      await loadTask();
    } catch (err) {
      console.error('[TaskDetailScreen] Error toggling task completion:', err);
    }
  };

  // Save task edit from IntentModal
  const handleSaveTask = async (title: string, description: string, dueDate: string | null) => {
    if (!task) return;
    try {
      await taskRepository.updateIntent(db, task.id, {
        title,
        description,
        dueDate,
        notificationId: task.notification_id,
      });

      const updated = await taskRepository.getIntentById(db, task.id);
      if (updated) {
        await notificationService.rescheduleTaskNotification(db, updated, task.notification_id);
      }

      await loadTask();
    } catch (err) {
      console.error('[TaskDetailScreen] Error updating task:', err);
      throw err;
    }
  };

  // Delete task with confirmation (cascades to notes in SQLite)
  const handleDeleteTask = () => {
    if (!task) return;
    Alert.alert(
      'Delete Intent',
      'Are you sure you want to delete this intent and all of its notes? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (task.notification_id) {
                await notificationService.cancelTaskNotification(task.notification_id);
              }
              await taskRepository.deleteIntent(db, task.id);
              navigation.goBack();
            } catch (err) {
              console.error('[TaskDetailScreen] Error deleting task:', err);
            }
          },
        },
      ]
    );
  };

  // Note actions
  const handleOpenAddNote = () => {
    setSelectedNote(null);
    setIsNoteModalVisible(true);
  };

  const handleOpenEditNote = (note: Note) => {
    setSelectedNote(note);
    setIsNoteModalVisible(true);
  };

  const handleSaveNote = async (content: string) => {
    if (selectedNote) {
      await updateNote(selectedNote.id, content);
    } else {
      await addNote(content);
    }
  };

  const handleDeleteNote = (note: Note) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteNote(note.id),
        },
      ]
    );
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

  if (taskLoading && !task) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!task) return null;

  const isOverdue =
    !task.is_completed &&
    !!task.due_date &&
    new Date(task.due_date).getTime() < Date.now();

  const hasActiveNotification = !task.is_completed && !!task.notification_id;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          style={({ pressed }) => [
            styles.backButton,
            {
              backgroundColor: colors.mutedBg,
              borderColor: colors.borderColor,
              transform: [{ scale: pressed ? 0.92 : 1 }],
            },
          ]}
        >
          <ArrowLeft size={18} color={colors.foreground} />
        </Pressable>

        <Text style={[styles.headerLabel, { color: colors.mutedFg }]}>
          Intent Focus
        </Text>

        <Pressable
          onPress={handleToggleComplete}
          style={({ pressed }) => [
            styles.statusHeaderButton,
            {
              backgroundColor: colors.mutedBg,
              borderColor: colors.borderColor,
              transform: [{ scale: pressed ? 0.92 : 1 }],
            },
          ]}
        >
          {task.is_completed ? (
            <CheckCircle2 size={18} color={colors.success} strokeWidth={2.5} />
          ) : isOverdue ? (
            <AlertCircle size={18} color="#dc2626" strokeWidth={2.5} />
          ) : (
            <Clock size={18} color={colors.primary} strokeWidth={2.5} />
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Task Title & Content Section */}
        <View
          style={[
            styles.taskHeroCard,
            {
              backgroundColor: colors.cardBg,
              borderColor: colors.borderColor,
            },
          ]}
        >
          <Text
            style={[
              styles.taskTitle,
              {
                color: colors.foreground,
                textDecorationLine: task.is_completed ? 'line-through' : 'none',
                opacity: task.is_completed ? 0.6 : 1,
              },
            ]}
          >
            {task.title}
          </Text>

          {task.description ? (
            <Text
              style={[
                styles.taskDescription,
                {
                  color: colors.mutedFg,
                  opacity: task.is_completed ? 0.6 : 1,
                },
              ]}
            >
              {task.description}
            </Text>
          ) : null}

          {/* Metadata Badges */}
          <View style={[styles.metaSection, { borderTopColor: colors.borderColor }]}>
            {task.due_date ? (
              <View style={styles.metaBadge}>
                <Calendar size={13} color={isOverdue ? '#dc2626' : colors.primary} />
                <Text
                  style={[
                    styles.metaText,
                    { color: isOverdue ? '#dc2626' : colors.foreground, fontWeight: isOverdue ? '600' : 'normal' },
                  ]}
                >
                  Due {formatDate(task.due_date)}
                </Text>
              </View>
            ) : null}

            {hasActiveNotification ? (
              <View style={styles.metaBadge}>
                <Bell size={13} color={colors.primary} />
                <Text style={[styles.metaText, { color: colors.primary }]}>
                  Offline Reminder Set
                </Text>
              </View>
            ) : null}

            <View style={styles.metaBadge}>
              <Clock size={13} color={colors.mutedFg} />
              <Text style={[styles.metaText, { color: colors.mutedFg }]}>
                Created {formatDate(task.created_at)}
              </Text>
            </View>
          </View>

          {/* Primary Action Buttons */}
          <View style={styles.taskActionsRow}>
            <Pressable
              onPress={() => setIsEditTaskVisible(true)}
              style={({ pressed }) => [
                styles.editTaskButton,
                {
                  backgroundColor: colors.mutedBg,
                  borderColor: colors.borderColor,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                },
              ]}
            >
              <Edit2 size={14} color={colors.foreground} />
              <Text style={[styles.actionBtnText, { color: colors.foreground }]}>
                Revise Intent
              </Text>
            </Pressable>

            <Pressable
              onPress={handleDeleteTask}
              style={({ pressed }) => [
                styles.deleteTaskButton,
                {
                  backgroundColor: colors.mutedBg,
                  borderColor: colors.borderColor,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                },
              ]}
            >
              <Trash2 size={14} color="#dc2626" />
              <Text style={[styles.actionBtnText, { color: '#dc2626', fontWeight: '600' }]}>
                Delete
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Notes & Breakdown Section */}
        <View style={styles.notesSectionHeader}>
          <View style={styles.notesTitleWrapper}>
            <Text style={[styles.notesSectionTitle, { color: colors.foreground }]}>
              Notes
            </Text>
            {notes.length > 0 ? (
              <View style={[styles.countBadge, { backgroundColor: colors.mutedBg }]}>
                <Text style={[styles.countText, { color: colors.mutedFg }]}>
                  {notes.length}
                </Text>
              </View>
            ) : null}
          </View>

          <Pressable
            onPress={handleOpenAddNote}
            style={({ pressed }) => [
              styles.addNoteBtn,
              {
                backgroundColor: colors.foreground,
                transform: [{ scale: pressed ? 0.94 : 1 }],
              },
            ]}
          >
            <Plus size={14} color={colors.background} strokeWidth={2.5} />
            <Text style={[styles.addNoteBtnText, { color: colors.background }]}>
              Add Note
            </Text>
          </Pressable>
        </View>

        {/* Notes List */}
        {notes.length === 0 ? (
          <View style={[styles.emptyNotesBox, { borderColor: colors.borderColor }]}>
            <Text style={[styles.emptyHeadline, { color: colors.foreground }]}>
              Quietude.
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedFg }]}>
              No notes yet — break this task down into steps or capture insights.
            </Text>
          </View>
        ) : (
          notes.map((item, index) => (
            <NoteCard
              key={item.id}
              note={item}
              index={index}
              onEdit={handleOpenEditNote}
              onDelete={handleDeleteNote}
            />
          ))
        )}
      </ScrollView>

      {/* Edit Intent Modal (Reusing existing component) */}
      <IntentModal
        visible={isEditTaskVisible}
        intent={task}
        onClose={() => setIsEditTaskVisible(false)}
        onSave={handleSaveTask}
      />

      {/* Note Compose / Edit Modal */}
      <NoteModal
        visible={isNoteModalVisible}
        note={selectedNote}
        onClose={() => {
          setIsNoteModalVisible(false);
          setSelectedNote(null);
        }}
        onSave={handleSaveNote}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '600',
  },
  statusHeaderButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  taskHeroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  taskTitle: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  taskDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
  metaSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    gap: 8,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
  },
  taskActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  editTaskButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  deleteTaskButton: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  notesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  notesTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notesSectionTitle: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 26,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
  },
  addNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    gap: 5,
  },
  addNoteBtnText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  emptyNotesBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHeadline: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 22,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
