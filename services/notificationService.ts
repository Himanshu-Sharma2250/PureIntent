import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { SQLiteDatabase } from 'expo-sqlite';
import { Intent, taskRepository } from '../db/taskRepository';
import { getSetting, setSetting } from '../db/db';

const NOTIFICATIONS_ENABLED_KEY = 'notifications_enabled';

// Configure top-level notification display handler for when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Service encapsulating offline local notification management.
 * 100% decoupled from UI components.
 */
export const notificationService = {
  /**
   * Configures Android notification channel for local alerts.
   */
  async setupNotificationChannel(): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Task Reminders',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#A50036',
          sound: 'default',
        });
      } catch (error) {
        console.warn('[NotificationService] Android channel setup warning:', error);
      }
    }
  },

  /**
   * Contextually checks and requests notification permission from the OS.
   * Handles Android 13+ POST_NOTIFICATIONS permission explicitly.
   */
  async requestNotificationPermissions(): Promise<boolean> {
    try {
      await this.setupNotificationChannel();
      const settings = await Notifications.getPermissionsAsync();
      let granted = settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

      if (!granted && settings.canAskAgain) {
        const req = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowSound: true,
            allowBadge: true,
          },
        });
        granted = req.granted || req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
      }

      return granted;
    } catch (error) {
      console.warn('[NotificationService] Request permission error:', error);
      return false;
    }
  },

  /**
   * Checks current permission status without prompting user.
   */
  async checkPermissions(): Promise<boolean> {
    try {
      const settings = await Notifications.getPermissionsAsync();
      return settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    } catch {
      return false;
    }
  },

  /**
   * Gets user's global notification preference from persistent SQLite storage.
   * Defaults to 'true'.
   */
  async isGlobalEnabled(db: SQLiteDatabase): Promise<boolean> {
    const val = await getSetting(db, NOTIFICATIONS_ENABLED_KEY, 'true');
    return val === 'true';
  },

  /**
   * Sets user's global notification preference in persistent SQLite storage.
   */
  async setGlobalEnabled(db: SQLiteDatabase, enabled: boolean): Promise<void> {
    await setSetting(db, NOTIFICATIONS_ENABLED_KEY, enabled ? 'true' : 'false');
    if (!enabled) {
      // If globally disabled, cancel all scheduled notifications
      try {
        await Notifications.cancelAllScheduledNotificationsAsync();
      } catch (err) {
        console.warn('[NotificationService] Error clearing scheduled notifications:', err);
      }
    } else {
      // Re-reconcile to reschedule active notifications
      await this.reconcileNotifications(db);
    }
  },

  /**
   * Computes trigger Date from a task's due_date ISO string (e.g. "2026-08-22T17:00:00.000Z").
   * Returns a valid Date if the trigger time is in the future, or null if past/invalid.
   */
  calculateTriggerDate(dueDateStr: string): Date | null {
    try {
      if (!dueDateStr) return null;
      let target: Date;

      if (dueDateStr.includes('T')) {
        target = new Date(dueDateStr);
      } else {
        const parts = dueDateStr.split('-');
        if (parts.length !== 3) return null;
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        target = new Date(year, month, day, 23, 59, 0, 0);
      }

      if (isNaN(target.getTime())) return null;

      // Do not schedule notifications for dates/times in the past
      if (target.getTime() <= Date.now()) {
        return null;
      }

      return target;
    } catch {
      return null;
    }
  },

  /**
   * Schedules a local notification for a task with a due date.
   * Returns notification ID string if scheduled, or null if skipped/failed.
   */
  async scheduleTaskNotification(db: SQLiteDatabase, task: Intent): Promise<string | null> {
    try {
      if (task.is_completed || !task.due_date) {
        return null;
      }

      const isEnabled = await this.isGlobalEnabled(db);
      if (!isEnabled) {
        return null;
      }

      const hasPermission = await this.checkPermissions();
      if (!hasPermission) {
        return null;
      }

      const triggerDate = this.calculateTriggerDate(task.due_date);
      if (!triggerDate) {
        return null;
      }

      const title = task.title;
      const body = task.description && task.description.trim() ? task.description.trim() : 'Task due now';

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          data: { taskId: task.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });

      return notificationId;
    } catch (error) {
      console.warn(`[NotificationService] Failed to schedule notification for task ${task.id}:`, error);
      return null;
    }
  },

  /**
   * Cancels a scheduled local notification by ID.
   */
  async cancelTaskNotification(notificationId: string | null): Promise<void> {
    if (!notificationId) return;
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.warn(`[NotificationService] Failed to cancel notification ${notificationId}:`, error);
    }
  },

  /**
   * Reschedules notification for a task (cancelling previous notification if existing,
   * scheduling a new one if appropriate, and updating DB).
   */
  async rescheduleTaskNotification(
    db: SQLiteDatabase,
    task: Intent,
    oldNotificationId?: string | null
  ): Promise<string | null> {
    const existingId = oldNotificationId !== undefined ? oldNotificationId : task.notification_id;
    if (existingId) {
      await this.cancelTaskNotification(existingId);
    }

    if (task.is_completed || !task.due_date) {
      if (existingId) {
        await taskRepository.updateNotificationId(db, task.id, null);
      }
      return null;
    }

    const newNotificationId = await this.scheduleTaskNotification(db, task);
    await taskRepository.updateNotificationId(db, task.id, newNotificationId);
    return newNotificationId;
  },

  /**
   * Reconciles scheduled OS notifications against current SQLite task database state.
   * Cleans up orphan notifications and schedules missing notifications for active tasks.
   */
  async reconcileNotifications(db: SQLiteDatabase): Promise<void> {
    try {
      const isEnabled = await this.isGlobalEnabled(db);
      if (!isEnabled) {
        await Notifications.cancelAllScheduledNotificationsAsync();
        return;
      }

      const hasPermission = await this.checkPermissions();
      if (!hasPermission) {
        return;
      }

      const allTasks = await taskRepository.getAllIntents(db);
      const scheduledList = await Notifications.getAllScheduledNotificationsAsync();
      const scheduledMap = new Map<string, Notifications.NotificationRequest>();

      for (const item of scheduledList) {
        scheduledMap.set(item.identifier, item);
      }

      const activeTaskNotificationIds = new Set<string>();

      for (const task of allTasks) {
        const shouldBeScheduled = !task.is_completed && !!task.due_date;

        if (shouldBeScheduled && task.due_date) {
          const triggerDate = this.calculateTriggerDate(task.due_date);
          const isFuture = triggerDate && triggerDate.getTime() > Date.now();

          if (isFuture) {
            let validNotificationId = task.notification_id;

            // If DB notification_id is missing or not registered in OS, reschedule
            if (!validNotificationId || !scheduledMap.has(validNotificationId)) {
              validNotificationId = await this.scheduleTaskNotification(db, task);
              await taskRepository.updateNotificationId(db, task.id, validNotificationId);
            }

            if (validNotificationId) {
              activeTaskNotificationIds.add(validNotificationId);
            }
          } else {
            // Due date is past, clear notification_id if any
            if (task.notification_id) {
              await this.cancelTaskNotification(task.notification_id);
              await taskRepository.updateNotificationId(db, task.id, null);
            }
          }
        } else {
          // Completed or no due date: cancel if notification exists
          if (task.notification_id) {
            await this.cancelTaskNotification(task.notification_id);
            await taskRepository.updateNotificationId(db, task.id, null);
          }
        }
      }

      // Purge any orphan OS notifications not associated with any active task
      for (const scheduled of scheduledList) {
        if (scheduled.identifier && !activeTaskNotificationIds.has(scheduled.identifier)) {
          await Notifications.cancelScheduledNotificationAsync(scheduled.identifier);
        }
      }

      console.log('[NotificationService] Reconciled notifications successfully.');
    } catch (error) {
      console.warn('[NotificationService] Notification reconciliation warning:', error);
    }
  },
};
