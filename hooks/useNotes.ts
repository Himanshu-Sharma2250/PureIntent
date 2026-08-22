import { useState, useEffect, useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { noteRepository, Note } from '../db/noteRepository';

/**
 * Custom hook to interact with SQLite database for notes tied to a task.
 * Manages load state, error reporting, input validation, and reactive updates.
 */
export function useNotes(taskId: number) {
  const db = useSQLiteContext();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Read: Fetch all notes for the given task
  const fetchNotes = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await noteRepository.getNotesByTaskId(db, taskId);
      setNotes(data);
    } catch (err: any) {
      console.error(`[useNotes] Error fetching notes for task ${taskId}:`, err);
      setError(err?.message || 'Failed to fetch notes.');
    } finally {
      setLoading(false);
    }
  }, [db, taskId]);

  // Create: Add new note
  const addNote = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) {
        throw new Error('Note content cannot be empty');
      }
      try {
        setError(null);
        await noteRepository.createNote(db, taskId, trimmed);
        await fetchNotes();
      } catch (err: any) {
        console.error(`[useNotes] Error adding note for task ${taskId}:`, err);
        setError(err?.message || 'Failed to add note.');
        throw err;
      }
    },
    [db, taskId, fetchNotes]
  );

  // Update: Modify existing note
  const updateNote = useCallback(
    async (noteId: number, content: string) => {
      const trimmed = content.trim();
      if (!trimmed) {
        throw new Error('Note content cannot be empty');
      }
      try {
        setError(null);
        await noteRepository.updateNote(db, noteId, trimmed);
        await fetchNotes();
      } catch (err: any) {
        console.error(`[useNotes] Error updating note ${noteId}:`, err);
        setError(err?.message || 'Failed to update note.');
        throw err;
      }
    },
    [db, fetchNotes]
  );

  // Delete: Remove note (with optimistic update)
  const deleteNote = useCallback(
    async (noteId: number) => {
      const previousNotes = [...notes];
      setNotes((prev) => prev.filter((item) => item.id !== noteId));

      try {
        setError(null);
        await noteRepository.deleteNote(db, noteId);
        const data = await noteRepository.getNotesByTaskId(db, taskId);
        setNotes(data);
      } catch (err: any) {
        console.error(`[useNotes] Error deleting note ${noteId}:`, err);
        setNotes(previousNotes);
        setError(err?.message || 'Failed to delete note.');
        throw err;
      }
    },
    [db, taskId, notes]
  );

  // Load notes on mount / when taskId changes
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  return {
    notes,
    loading,
    error,
    refreshNotes: fetchNotes,
    addNote,
    updateNote,
    deleteNote,
  };
}
