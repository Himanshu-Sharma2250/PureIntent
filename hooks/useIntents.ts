import { useState, useEffect, useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { taskRepository, Intent } from '../db/taskRepository';
import { notificationService } from '../services/notificationService';

/**
 * Custom hook to interact with SQLite database using the repository layer.
 * Manages load state, error reporting, automatic list synchronization,
 * and offline local notifications lifecycle.
 */
export function useIntents() {
  const db = useSQLiteContext();
  const [intents, setIntents] = useState<Intent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [hasNotificationPermission, setHasNotificationPermission] = useState<boolean>(false);

  // Read: Fetch all intents
  const fetchIntents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await taskRepository.getAllIntents(db);
      setIntents(data);
    } catch (err: any) {
      console.error('[useIntents] Error fetching intents:', err);
      setError(err?.message || 'Failed to fetch intents.');
    } finally {
      setLoading(false);
    }
  }, [db]);

  // Check notification global setting & OS permissions
  const checkNotificationState = useCallback(async () => {
    try {
      const enabled = await notificationService.isGlobalEnabled(db);
      const permitted = await notificationService.checkPermissions();
      setNotificationsEnabled(enabled);
      setHasNotificationPermission(permitted);
    } catch (err) {
      console.warn('[useIntents] Error checking notification state:', err);
    }
  }, [db]);

  // Contextually request notification permissions (e.g. when setting first due date or enabling toggle)
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const granted = await notificationService.requestNotificationPermissions();
    setHasNotificationPermission(granted);
    return granted;
  }, []);

  // Toggle global notification setting
  const toggleGlobalNotifications = useCallback(async () => {
    const nextState = !notificationsEnabled;
    if (nextState) {
      // If enabling, request permission contextually if not granted
      const granted = await requestPermissions();
      if (!granted) {
        // App remains fully functional even if permission is denied
        console.log('[useIntents] Permission not granted for local notifications.');
      }
    }
    await notificationService.setGlobalEnabled(db, nextState);
    setNotificationsEnabled(nextState);
    await fetchIntents();
  }, [db, notificationsEnabled, requestPermissions, fetchIntents]);

  // Create: Add new intent
  const addIntent = useCallback(
    async (title: string, description?: string | null, dueDate?: string | null) => {
      if (!title.trim()) {
        throw new Error('Title cannot be empty');
      }
      try {
        setError(null);

        // Contextual permission request when setting a due date
        if (dueDate) {
          await requestPermissions();
        }

        // Insert into SQLite
        const newId = await taskRepository.createIntent(db, title.trim(), description, dueDate);
        const createdTask = await taskRepository.getIntentById(db, newId);

        if (createdTask && createdTask.due_date) {
          // Schedule offline local notification
          await notificationService.rescheduleTaskNotification(db, createdTask);
        }

        await fetchIntents(); // reload
      } catch (err: any) {
        console.error('[useIntents] Error adding intent:', err);
        setError(err?.message || 'Failed to add intent.');
        throw err;
      }
    },
    [db, fetchIntents, requestPermissions]
  );

  // Update: Modify details of an intent
  const updateIntent = useCallback(
    async (id: number, fields: { title: string; description?: string | null; dueDate?: string | null }) => {
      if (!fields.title.trim()) {
        throw new Error('Title cannot be empty');
      }
      try {
        setError(null);
        const existingTask = await taskRepository.getIntentById(db, id);

        // Contextual permission request when setting a due date for existing task
        if (fields.dueDate && !existingTask?.due_date) {
          await requestPermissions();
        }

        await taskRepository.updateIntent(db, id, {
          title: fields.title.trim(),
          description: fields.description,
          dueDate: fields.dueDate,
          notificationId: existingTask?.notification_id,
        });

        const updatedTask = await taskRepository.getIntentById(db, id);
        if (updatedTask) {
          // Cancel old notification & schedule new one if due date updated
          await notificationService.rescheduleTaskNotification(db, updatedTask, existingTask?.notification_id);
        }

        await fetchIntents(); // reload
      } catch (err: any) {
        console.error(`[useIntents] Error updating intent ${id}:`, err);
        setError(err?.message || 'Failed to update intent.');
        throw err;
      }
    },
    [db, fetchIntents, requestPermissions]
  );

  // Toggle completion status (with optimistic UI update & notification cleanup)
  const toggleComplete = useCallback(
    async (id: number, isCompleted: boolean) => {
      const targetTask = intents.find((item) => item.id === id);
      const previousIntents = [...intents];

      setIntents((prev) =>
        prev
          .map((item) => (item.id === id ? { ...item, is_completed: isCompleted } : item))
          .sort((a, b) => {
            const aComp = a.is_completed ? 1 : 0;
            const bComp = b.is_completed ? 1 : 0;
            if (aComp !== bComp) return aComp - bComp;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          })
      );

      try {
        await taskRepository.toggleComplete(db, id, isCompleted);

        if (targetTask) {
          if (isCompleted) {
            // Cancel notification when task completed
            if (targetTask.notification_id) {
              await notificationService.cancelTaskNotification(targetTask.notification_id);
              await taskRepository.updateNotificationId(db, id, null);
            }
          } else {
            // Reschedule notification when task uncompleted
            const updatedTask = await taskRepository.getIntentById(db, id);
            if (updatedTask && updatedTask.due_date) {
              await notificationService.rescheduleTaskNotification(db, updatedTask);
            }
          }
        }

        const data = await taskRepository.getAllIntents(db);
        setIntents(data);
      } catch (err: any) {
        console.error(`[useIntents] Error toggling status for ${id}:`, err);
        setIntents(previousIntents);
        setError(err?.message || 'Failed to update intent status.');
      }
    },
    [db, intents]
  );

  // Delete intent (with optimistic UI update & notification cleanup)
  const deleteIntent = useCallback(
    async (id: number) => {
      const targetTask = intents.find((item) => item.id === id);
      const previousIntents = [...intents];
      setIntents((prev) => prev.filter((item) => item.id !== id));

      try {
        if (targetTask?.notification_id) {
          await notificationService.cancelTaskNotification(targetTask.notification_id);
        }
        await taskRepository.deleteIntent(db, id);
        const data = await taskRepository.getAllIntents(db);
        setIntents(data);
      } catch (err: any) {
        console.error(`[useIntents] Error deleting intent ${id}:`, err);
        setIntents(previousIntents);
        setError(err?.message || 'Failed to delete intent.');
      }
    },
    [db, intents]
  );

  // Initialization: load intents, check state, and reconcile notifications
  useEffect(() => {
    fetchIntents();
    checkNotificationState();
    notificationService.reconcileNotifications(db);
  }, [fetchIntents, checkNotificationState, db]);

  return {
    intents,
    loading,
    error,
    notificationsEnabled,
    hasNotificationPermission,
    toggleGlobalNotifications,
    requestPermissions,
    refresh: fetchIntents,
    addIntent,
    updateIntent,
    toggleComplete,
    deleteIntent,
  };
}
