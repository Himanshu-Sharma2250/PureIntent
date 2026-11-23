import { SQLiteDatabase } from 'expo-sqlite';
import { timeLogRepository } from './timeLogRepository';

export interface ActiveTimer {
  id: number;
  task_id: number;
  started_at: string;
  task_title?: string;
}

interface DbActiveTimer {
  id: number;
  task_id: number;
  started_at: string;
  task_title?: string | null;
}

/**
 * Concurrency mutex to prevent race conditions from rapid double taps.
 */
let isTimerOperationRunning = false;

/**
 * Repository layer for managing the single running active timer in SQLite.
 * Enforces the single-row constraint at the repository level.
 */
export const timerRepository = {
  /**
   * Starts a timer for the given taskId.
   * Clears any existing active timer to strictly enforce the single-row constraint.
   */
  async startTimer(db: SQLiteDatabase, taskId: number): Promise<ActiveTimer> {
    while (isTimerOperationRunning) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    isTimerOperationRunning = true;

    try {
      const startedAt = new Date().toISOString();

      // Clear any existing active timer to enforce at most one row
      await db.runAsync('DELETE FROM active_timer;');

      const result = await db.runAsync(
        'INSERT INTO active_timer (task_id, started_at) VALUES (?, ?);',
        [taskId, startedAt]
      );

      // Fetch task title for display
      const taskRow = await db.getFirstAsync<{ title: string }>(
        'SELECT title FROM intents WHERE id = ?;',
        [taskId]
      );

      return {
        id: result.lastInsertRowId,
        task_id: taskId,
        started_at: startedAt,
        task_title: taskRow?.title ?? '',
      };
    } catch (error) {
      console.error(`[TimerRepository] Error starting timer for task ${taskId}:`, error);
      throw error;
    } finally {
      isTimerOperationRunning = false;
    }
  },

  /**
   * Fetches the current active timer (if any).
   * Validates that the associated task still exists. If the task was removed,
   * cleans up the active timer row and returns null.
   */
  async getActiveTimer(db: SQLiteDatabase): Promise<ActiveTimer | null> {
    try {
      const row = await db.getFirstAsync<DbActiveTimer>(`
        SELECT at.id, at.task_id, at.started_at, i.title AS task_title
        FROM active_timer at
        LEFT JOIN intents i ON at.task_id = i.id
        LIMIT 1;
      `);

      if (!row) {
        return null;
      }

      // If the task was deleted or not found, clean up active_timer
      if (!row.task_title) {
        await db.runAsync('DELETE FROM active_timer WHERE id = ?;', [row.id]);
        return null;
      }

      return {
        id: row.id,
        task_id: row.task_id,
        started_at: row.started_at,
        task_title: row.task_title,
      };
    } catch (error) {
      console.error('[TimerRepository] Error getting active timer:', error);
      return null;
    }
  },

  /**
   * Stops the active timer:
   * - Calculates elapsed seconds (guarded against clock shifts with clamp to 0)
   * - Extracts the start date (YYYY-MM-DD) as work_date (survives crossing midnight)
   * - Creates a time log with source 'timer' and empty/null description
   * - Clears the active timer table
   * Returns details of the logged session, or null if no timer was active.
   */
  async stopTimer(
    db: SQLiteDatabase
  ): Promise<{ logId: number; taskId: number; timeSpentSeconds: number } | null> {
    while (isTimerOperationRunning) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    isTimerOperationRunning = true;

    try {
      const active = await timerRepository.getActiveTimer(db);
      if (!active) {
        return null;
      }

      const startedDate = new Date(active.started_at);
      const now = Date.now();
      // Guard against device clock or timezone changes mid-session: clamp to 0
      const elapsedSeconds = Math.max(0, Math.floor((now - startedDate.getTime()) / 1000));

      // Extract local YYYY-MM-DD of the started_at timestamp
      const yr = startedDate.getFullYear();
      const mo = String(startedDate.getMonth() + 1).padStart(2, '0');
      const da = String(startedDate.getDate()).padStart(2, '0');
      const workDate = `${yr}-${mo}-${da}`;

      // Insert time log with source 'timer' and empty description
      const logId = await timeLogRepository.createTimeLog(
        db,
        active.task_id,
        elapsedSeconds,
        null,
        workDate,
        'timer'
      );

      // Clear the active timer row
      await db.runAsync('DELETE FROM active_timer;');

      return {
        logId,
        taskId: active.task_id,
        timeSpentSeconds: elapsedSeconds,
      };
    } catch (error) {
      console.error('[TimerRepository] Error stopping active timer:', error);
      throw error;
    } finally {
      isTimerOperationRunning = false;
    }
  },

  /**
   * Discards the active timer without creating a time log entry.
   */
  async discardTimer(db: SQLiteDatabase): Promise<void> {
    while (isTimerOperationRunning) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    isTimerOperationRunning = true;

    try {
      await db.runAsync('DELETE FROM active_timer;');
    } catch (error) {
      console.error('[TimerRepository] Error discarding active timer:', error);
      throw error;
    } finally {
      isTimerOperationRunning = false;
    }
  },
};
