import { SQLiteDatabase } from 'expo-sqlite';

export interface TimeLog {
  id: number;
  task_id: number;
  time_spent_minutes: number;
  description: string;
  work_date: string;
  created_at: string;
  updated_at: string;
}

interface DbTimeLog {
  id: number;
  task_id: number;
  time_spent_minutes: number;
  description: string;
  work_date: string;
  created_at: string;
  updated_at: string;
}

function mapDbRow(row: DbTimeLog): TimeLog {
  return {
    id: row.id,
    task_id: row.task_id,
    time_spent_minutes: row.time_spent_minutes,
    description: row.description,
    work_date: row.work_date,
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
    timeSpentMinutes: number,
    description: string,
    workDate: string
  ): Promise<number> {
    try {
      const timestamp = new Date().toISOString();
      const result = await db.runAsync(
        `INSERT INTO time_logs (task_id, time_spent_minutes, description, work_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [taskId, Math.round(timeSpentMinutes), description.trim(), workDate, timestamp, timestamp]
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
    timeSpentMinutes: number,
    description: string,
    workDate: string
  ): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      await db.runAsync(
        `UPDATE time_logs
         SET time_spent_minutes = ?, description = ?, work_date = ?, updated_at = ?
         WHERE id = ?;`,
        [Math.round(timeSpentMinutes), description.trim(), workDate, timestamp, logId]
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
   * Computes the total time spent logged for a specific task in minutes.
   */
  async getTotalTimeSpent(db: SQLiteDatabase, taskId: number): Promise<number> {
    try {
      const row = await db.getFirstAsync<{ total_minutes: number | null }>(
        'SELECT COALESCE(SUM(time_spent_minutes), 0) AS total_minutes FROM time_logs WHERE task_id = ?;',
        [taskId]
      );
      return row?.total_minutes ?? 0;
    } catch (error) {
      console.error(`[TimeLogRepository] Error in getTotalTimeSpent for task ${taskId}:`, error);
      throw error;
    }
  },
};
