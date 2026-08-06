import { useState, useEffect, useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { taskRepository, Intent } from '../db/taskRepository';

/**
 * Custom hook to interact with SQLite database using the repository layer.
 * Manages load state, error reporting, and automatic list synchronization.
 */
export function useIntents() {
  const db = useSQLiteContext();
  const [intents, setIntents] = useState<Intent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  // Create: Add new intent
  const addIntent = useCallback(
    async (title: string, description?: string | null, dueDate?: string | null) => {
      if (!title.trim()) {
        throw new Error('Title cannot be empty');
      }
      try {
        setError(null);
        await taskRepository.createIntent(db, title.trim(), description, dueDate);
        await fetchIntents(); // reload
      } catch (err: any) {
        console.error('[useIntents] Error adding intent:', err);
        setError(err?.message || 'Failed to add intent.');
        throw err;
      }
    },
    [db, fetchIntents]
  );

  // Update: Modify details of an intent
  const updateIntent = useCallback(
    async (id: number, fields: { title: string; description?: string | null; dueDate?: string | null }) => {

      if (!fields.title.trim()) {
        throw new Error('Title cannot be empty');
      }
      try {
        setError(null);
        await taskRepository.updateIntent(db, id, {
          title: fields.title.trim(),
          description: fields.description,
          dueDate: fields.dueDate,
        });
        await fetchIntents(); // reload
      } catch (err: any) {
        console.error(`[useIntents] Error updating intent ${id}:`, err);
        setError(err?.message || 'Failed to update intent.');
        throw err;
      }
    },
    [db, fetchIntents]
  );

  // Toggle completion status (with optimistic UI update for instant feedback)
  const toggleComplete = useCallback(
    async (id: number, isCompleted: boolean) => {
      // Optimistic update
      const previousIntents = [...intents];
      setIntents((prev) =>
        prev
          .map((item) => (item.id === id ? { ...item, is_completed: isCompleted } : item))
          // Re-sort inline to keep incomplete on top
          .sort((a, b) => {
            const aComp = a.is_completed ? 1 : 0;
            const bComp = b.is_completed ? 1 : 0;
            if (aComp !== bComp) return aComp - bComp;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          })
      );

      try {
        await taskRepository.toggleComplete(db, id, isCompleted);
        // Refresh from DB in background to guarantee correctness
        const data = await taskRepository.getAllIntents(db);
        setIntents(data);
      } catch (err: any) {
        console.error(`[useIntents] Error toggling status for ${id}:`, err);
        // Rollback on failure
        setIntents(previousIntents);
        setError(err?.message || 'Failed to update intent status.');
      }
    },
    [db, intents]
  );

  // Delete intent (with optimistic UI update)
  const deleteIntent = useCallback(
    async (id: number) => {
      const previousIntents = [...intents];
      setIntents((prev) => prev.filter((item) => item.id !== id));

      try {
        await taskRepository.deleteIntent(db, id);
        // Refresh from DB in background
        const data = await taskRepository.getAllIntents(db);
        setIntents(data);
      } catch (err: any) {
        console.error(`[useIntents] Error deleting intent ${id}:`, err);
        // Rollback on failure
        setIntents(previousIntents);
        setError(err?.message || 'Failed to delete intent.');
      }
    },
    [db, intents]
  );

  // Fetch on mount
  useEffect(() => {
    fetchIntents();
  }, [fetchIntents]);

  return {
    intents,
    loading,
    error,
    refresh: fetchIntents,
    addIntent,
    updateIntent,
    toggleComplete,
    deleteIntent,
  };
}
