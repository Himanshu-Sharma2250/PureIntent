import { SQLiteDatabase } from 'expo-sqlite';

export interface Note {
  id: number;
  task_id: number;
  content: string;
  created_at: string;
  updated_at: string;
}

interface DbNote {
  id: number;
  task_id: number;
  content: string;
  created_at: string;
  updated_at: string;
}

function mapDbRow(row: DbNote): Note {
  return {
    id: row.id,
    task_id: row.task_id,
    content: row.content,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Repository layer for Note CRUD operations interacting with SQLite.
 */
export const noteRepository = {
  /**
   * Fetches all notes associated with a specific task ID, sorted by created_at ascending (chronological).
   */
  async getNotesByTaskId(db: SQLiteDatabase, taskId: number): Promise<Note[]> {
    try {
      const rows = await db.getAllAsync<DbNote>(
        'SELECT * FROM notes WHERE task_id = ? ORDER BY created_at ASC;',
        [taskId]
      );
      return rows.map(mapDbRow);
    } catch (error) {
      console.error(`[NoteRepository] Error in getNotesByTaskId for task ${taskId}:`, error);
      throw error;
    }
  },

  /**
   * Creates a new note tied to a task.
   * Returns the autoincremented ID.
   */
  async createNote(db: SQLiteDatabase, taskId: number, content: string): Promise<number> {
    try {
      const timestamp = new Date().toISOString();
      const result = await db.runAsync(
        'INSERT INTO notes (task_id, content, created_at, updated_at) VALUES (?, ?, ?, ?);',
        [taskId, content.trim(), timestamp, timestamp]
      );
      return result.lastInsertRowId;
    } catch (error) {
      console.error(`[NoteRepository] Error creating note for task ${taskId}:`, error);
      throw error;
    }
  },

  /**
   * Updates an existing note's content and updated_at timestamp.
   */
  async updateNote(db: SQLiteDatabase, noteId: number, content: string): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      await db.runAsync(
        'UPDATE notes SET content = ?, updated_at = ? WHERE id = ?;',
        [content.trim(), timestamp, noteId]
      );
    } catch (error) {
      console.error(`[NoteRepository] Error updating note ${noteId}:`, error);
      throw error;
    }
  },

  /**
   * Deletes a note by its ID.
   */
  async deleteNote(db: SQLiteDatabase, noteId: number): Promise<void> {
    try {
      await db.runAsync('DELETE FROM notes WHERE id = ?;', [noteId]);
    } catch (error) {
      console.error(`[NoteRepository] Error deleting note ${noteId}:`, error);
      throw error;
    }
  },
};
