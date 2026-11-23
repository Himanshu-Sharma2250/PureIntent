import { SQLiteDatabase } from 'expo-sqlite';

export type TimeLogSource = 'manual' | 'timer';

export interface TimeLog {
  id: number;
  task_id: number;
  time_spent_seconds: number;
  description: string | null;
  work_date: string;
  source: TimeLogSource;
  created_at: string;
  updated_at: string;
}

interface DbTimeLog {
  id: number;
  task_id: number;
  time_spent_seconds?: number;
  time_spent_minutes?: number;
  description: string | null;
  work_date: string;
  source?: string;
  created_at: string;
  updated_at: string;
}

function mapDbRow(row: DbTimeLog): TimeLog {
  const seconds =
    row.time_spent_seconds !== undefined && row.time_spent_seconds !== null
      ? row.time_spent_seconds
      : row.time_spent_minutes !== undefined && row.time_spent_minutes !== null
      ? row.time_spent_minutes * 60
      : 0;

  return {
    id: row.id,
    task_id: row.task_id,
    time_spent_seconds: seconds,
    description: row.description ?? null,
    work_date: row.work_date,
    source: (row.source as TimeLogSource) || 'manual',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Repository layer for TimeLog CRUD operations and total time calculation interacting with SQLite.
 */
export const timeLogRepository = {
  /**
   * Fetches all time logs associated with a specific task ID, sorted by work_date DESC, created_at DESC.
   */
  async getTimeLogsByTaskId(db: SQLiteDatabase, taskId: number): Promise<TimeLog[]> {
    try {
      const rows = await db.getAllAsync<DbTimeLog>(
        'SELECT * FROM time_logs WHERE task_id = ? ORDER BY work_date DESC, created_at DESC;',
        [taskId]
      );
      return rows.map(mapDbRow);
    } catch (error) {
      console.error(`[TimeLogRepository] Error in getTimeLogsByTaskId for task ${taskId}:`, error);
      throw error;
    }
  },

  /**
   * Creates a new time log tied to a task.
   * Returns the autoincremented ID.
   */
  async createTimeLog(
    db: SQLiteDatabase,
    taskId: number,
    timeSpentSeconds: number,
    description: string | null,
    workDate: string,
    source: TimeLogSource = 'manual'
  ): Promise<number> {
    try {
      const timestamp = new Date().toISOString();
      const desc = description !== null && description !== undefined ? description.trim() : null;
      const result = await db.runAsync(
        `INSERT INTO time_logs (task_id, time_spent_seconds, description, work_date, source, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [taskId, Math.round(timeSpentSeconds), desc, workDate, source, timestamp, timestamp]
      );
      return result.lastInsertRowId;
    } catch (error) {
      console.error(`[TimeLogRepository] Error creating time log for task ${taskId}:`, error);
      throw error;
    }
  },

  /**
   * Updates an existing time log's duration, description, work date, and updated_at timestamp.
   */
  async updateTimeLog(
    db: SQLiteDatabase,
    logId: number,
    timeSpentSeconds: number,
    description: string | null,
    workDate: string
  ): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      const desc = description !== null && description !== undefined ? description.trim() : null;
      await db.runAsync(
        `UPDATE time_logs
         SET time_spent_seconds = ?, description = ?, work_date = ?, updated_at = ?
         WHERE id = ?;`,
        [Math.round(timeSpentSeconds), desc, workDate, timestamp, logId]
      );
    } catch (error) {
      console.error(`[TimeLogRepository] Error updating time log ${logId}:`, error);
      throw error;
    }
  },

  /**
   * Deletes a time log by its ID.
   */
  async deleteTimeLog(db: SQLiteDatabase, logId: number): Promise<void> {
    try {
      await db.runAsync('DELETE FROM time_logs WHERE id = ?;', [logId]);
    } catch (error) {
      console.error(`[TimeLogRepository] Error deleting time log ${logId}:`, error);
      throw error;
    }
  },

  /**
   * Computes the total time spent logged for a specific task in seconds.
   */
  async getTotalTimeSpent(db: SQLiteDatabase, taskId: number): Promise<number> {
    try {
      const row = await db.getFirstAsync<{ total_seconds: number | null }>(
        'SELECT COALESCE(SUM(time_spent_seconds), 0) AS total_seconds FROM time_logs WHERE task_id = ?;',
        [taskId]
      );
      return row?.total_seconds ?? 0;
    } catch (error) {
      console.error(`[TimeLogRepository] Error in getTotalTimeSpent for task ${taskId}:`, error);
      throw error;
    }
  },
};
