import { SQLiteDatabase } from 'expo-sqlite';

export interface Intent {
  id: number;
  title: string;
  description: string | null;
  is_completed: boolean;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

interface DbIntent {
  id: number;
  title: string;
  description: string | null;
  is_completed: number; // 0 or 1 in SQLite
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Maps a database row back to the application-level Intent model.
 */
function mapDbRow(row: DbIntent): Intent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    is_completed: row.is_completed === 1,
    due_date: row.due_date,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Repository layer separating application components from raw SQLite queries.
 */
export const taskRepository = {
  /**
   * Fetches all intents from the database, sorted by completion status (incomplete first)
   * and newest created date.
   */
  async getAllIntents(db: SQLiteDatabase): Promise<Intent[]> {
    try {
      const rows = await db.getAllAsync<DbIntent>(
        'SELECT * FROM intents ORDER BY is_completed ASC, created_at DESC;'
      );
      return rows.map(mapDbRow);
    } catch (error) {
      console.error('[Repository] Error in getAllIntents:', error);
      throw error;
    }
  },

  /**
   * Fetches a single intent by ID.
   */
  async getIntentById(db: SQLiteDatabase, id: number): Promise<Intent | null> {
    try {
      const row = await db.getFirstAsync<DbIntent>(
        'SELECT * FROM intents WHERE id = ?;',
        [id]
      );
      return row ? mapDbRow(row) : null;
    } catch (error) {
      console.error(`[Repository] Error in getIntentById for id ${id}:`, error);
      throw error;
    }
  },

  /**
   * Insert a new intent.
   * Returns the database autoincremented ID.
   */
  async createIntent(
    db: SQLiteDatabase,
    title: string,
    description?: string | null,
    dueDate?: string | null
  ): Promise<number> {
    try {
      const timestamp = new Date().toISOString();
      const result = await db.runAsync(
        `INSERT INTO intents (title, description, is_completed, due_date, created_at, updated_at)
         VALUES (?, ?, 0, ?, ?, ?);`,
        [title, description || null, dueDate || null, timestamp, timestamp]
      );
      return result.lastInsertRowId;
    } catch (error) {
      console.error('[Repository] Error inserting intent:', error);
      throw error;
    }
  },

  /**
   * Updates an existing intent's title, description, and status.
   */
  async updateIntent(
    db: SQLiteDatabase,
    id: number,
    fields: { title: string; description?: string | null; dueDate?: string | null }
  ): Promise<void> {

    try {
      const timestamp = new Date().toISOString();
      await db.runAsync(
        `UPDATE intents
         SET title = ?, description = ?, due_date = ?, updated_at = ?
         WHERE id = ?;`,
        [
          fields.title,
          fields.description || null,
          fields.dueDate || null,
          timestamp,
          id,
        ]
      );
    } catch (error) {
      console.error(`[Repository] Error updating intent ${id}:`, error);
      throw error;
    }
  },

  /**
   * Toggles the completion status of an intent.
   */
  async toggleComplete(
    db: SQLiteDatabase,
    id: number,
    isCompleted: boolean
  ): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      const isCompletedInt = isCompleted ? 1 : 0;
      await db.runAsync(
        'UPDATE intents SET is_completed = ?, updated_at = ? WHERE id = ?;',
        [isCompletedInt, timestamp, id]
      );
    } catch (error) {
      console.error(`[Repository] Error toggling status for intent ${id}:`, error);
      throw error;
    }
  },

  /**
   * Deletes an intent by id.
   */
  async deleteIntent(db: SQLiteDatabase, id: number): Promise<void> {
    try {
      await db.runAsync('DELETE FROM intents WHERE id = ?;', [id]);
    } catch (error) {
      console.error(`[Repository] Error deleting intent ${id}:`, error);
      throw error;
    }
  },
};
