import { SQLiteDatabase } from 'expo-sqlite';

export interface Comment {
  id: number;
  task_id: number;
  content: string;
  created_at: string;
  updated_at: string;
}

interface DbComment {
  id: number;
  task_id: number;
  content: string;
  created_at: string;
  updated_at: string;
}

function mapDbRow(row: DbComment): Comment {
  return {
    id: row.id,
    task_id: row.task_id,
    content: row.content,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Repository layer for Comment CRUD operations interacting with SQLite.
 */
export const commentRepository = {
  /**
   * Fetches all comments associated with a specific task ID, sorted by created_at ascending (chronological).
   */
  async getCommentsByTaskId(db: SQLiteDatabase, taskId: number): Promise<Comment[]> {
    try {
      const rows = await db.getAllAsync<DbComment>(
        'SELECT * FROM comments WHERE task_id = ? ORDER BY created_at ASC;',
        [taskId]
      );
      return rows.map(mapDbRow);
    } catch (error) {
      console.error(`[CommentRepository] Error in getCommentsByTaskId for task ${taskId}:`, error);
      throw error;
    }
  },

  /**
   * Creates a new comment tied to a task.
   * Returns the autoincremented ID.
   */
  async createComment(db: SQLiteDatabase, taskId: number, content: string): Promise<number> {
    try {
      const timestamp = new Date().toISOString();
      const result = await db.runAsync(
        'INSERT INTO comments (task_id, content, created_at, updated_at) VALUES (?, ?, ?, ?);',
        [taskId, content.trim(), timestamp, timestamp]
      );
      return result.lastInsertRowId;
    } catch (error) {
      console.error(`[CommentRepository] Error creating comment for task ${taskId}:`, error);
      throw error;
    }
  },

  /**
   * Updates an existing comment's content and updated_at timestamp.
   */
  async updateComment(db: SQLiteDatabase, commentId: number, content: string): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      await db.runAsync(
        'UPDATE comments SET content = ?, updated_at = ? WHERE id = ?;',
        [content.trim(), timestamp, commentId]
      );
    } catch (error) {
      console.error(`[CommentRepository] Error updating comment ${commentId}:`, error);
      throw error;
    }
  },

  /**
   * Deletes a comment by its ID.
   */
  async deleteComment(db: SQLiteDatabase, commentId: number): Promise<void> {
    try {
      await db.runAsync('DELETE FROM comments WHERE id = ?;', [commentId]);
    } catch (error) {
      console.error(`[CommentRepository] Error deleting comment ${commentId}:`, error);
      throw error;
    }
  },
};
