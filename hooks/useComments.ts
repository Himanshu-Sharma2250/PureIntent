import { useState, useEffect, useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { commentRepository, Comment } from '../db/commentRepository';

/**
 * Custom hook to interact with SQLite database for comments tied to a task.
 * Manages load state, error reporting, input validation, and reactive updates.
 */
export function useComments(taskId: number) {
  const db = useSQLiteContext();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Read: Fetch all comments for the given task
  const fetchComments = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await commentRepository.getCommentsByTaskId(db, taskId);
      setComments(data);
    } catch (err: any) {
      console.error(`[useComments] Error fetching comments for task ${taskId}:`, err);
      setError(err?.message || 'Failed to fetch comments.');
    } finally {
      setLoading(false);
    }
  }, [db, taskId]);

  // Create: Add new comment
  const addComment = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) {
        throw new Error('Comment content cannot be empty');
      }
      try {
        setError(null);
        await commentRepository.createComment(db, taskId, trimmed);
        await fetchComments();
      } catch (err: any) {
        console.error(`[useComments] Error adding comment for task ${taskId}:`, err);
        setError(err?.message || 'Failed to add comment.');
        throw err;
      }
    },
    [db, taskId, fetchComments]
  );

  // Update: Modify existing comment
  const updateComment = useCallback(
    async (commentId: number, content: string) => {
      const trimmed = content.trim();
      if (!trimmed) {
        throw new Error('Comment content cannot be empty');
      }
      try {
        setError(null);
        await commentRepository.updateComment(db, commentId, trimmed);
        await fetchComments();
      } catch (err: any) {
        console.error(`[useComments] Error updating comment ${commentId}:`, err);
        setError(err?.message || 'Failed to update comment.');
        throw err;
      }
    },
    [db, fetchComments]
  );

  // Delete: Remove comment (with optimistic update)
  const deleteComment = useCallback(
    async (commentId: number) => {
      const previousComments = [...comments];
      setComments((prev) => prev.filter((item) => item.id !== commentId));

      try {
        setError(null);
        await commentRepository.deleteComment(db, commentId);
        const data = await commentRepository.getCommentsByTaskId(db, taskId);
        setComments(data);
      } catch (err: any) {
        console.error(`[useComments] Error deleting comment ${commentId}:`, err);
        setComments(previousComments);
        setError(err?.message || 'Failed to delete comment.');
        throw err;
      }
    },
    [db, taskId, comments]
  );

  // Load comments on mount / when taskId changes
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return {
    comments,
    loading,
    error,
    refreshComments: fetchComments,
    addComment,
    updateComment,
    deleteComment,
  };
}
