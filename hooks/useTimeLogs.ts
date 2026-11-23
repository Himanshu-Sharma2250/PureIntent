import { useState, useEffect, useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { timeLogRepository, TimeLog, TimeLogSource } from '../db/timeLogRepository';
import { useTimer } from './useTimer';

/**
 * Custom hook to interact with SQLite database for time logs tied to a task.
 * Manages load state, error reporting, input validation, and reactive updates
 * for time logs and total duration in seconds.
 * Subscribes to global timer stop events to automatically refresh the logs list and total.
 */
export function useTimeLogs(taskId: number) {
  const db = useSQLiteContext();
  const { lastStopped } = useTimer();

  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [totalSeconds, setTotalSeconds] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Read: Fetch all time logs and total time spent for the given task
  const fetchTimeLogs = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    setError(null);
    try {
      const [logsData, total] = await Promise.all([
        timeLogRepository.getTimeLogsByTaskId(db, taskId),
        timeLogRepository.getTotalTimeSpent(db, taskId),
      ]);
      setTimeLogs(logsData);
      setTotalSeconds(total);
    } catch (err: any) {
      console.error(`[useTimeLogs] Error fetching time logs for task ${taskId}:`, err);
      setError(err?.message || 'Failed to fetch time logs.');
    } finally {
      setLoading(false);
    }
  }, [db, taskId]);

  // Create: Add new time log entry
  const addTimeLog = useCallback(
    async (
      timeSpentSeconds: number,
      description: string | null,
      workDate: string,
      source: TimeLogSource = 'manual'
    ) => {
      const trimmed = (description || '').trim();
      // Manual entries require a description; timer entries can be empty
      if (source === 'manual' && !trimmed) {
        throw new Error('Description cannot be empty.');
      }
      if (timeSpentSeconds <= 0 || isNaN(timeSpentSeconds)) {
        throw new Error('Time spent must be greater than 0.');
      }

      try {
        setError(null);
        await timeLogRepository.createTimeLog(
          db,
          taskId,
          timeSpentSeconds,
          trimmed || null,
          workDate,
          source
        );
        await fetchTimeLogs();
      } catch (err: any) {
        console.error(`[useTimeLogs] Error adding time log for task ${taskId}:`, err);
        setError(err?.message || 'Failed to log time.');
        throw err;
      }
    },
    [db, taskId, fetchTimeLogs]
  );

  // Update: Modify existing time log entry
  const updateTimeLog = useCallback(
    async (
      logId: number,
      timeSpentSeconds: number,
      description: string | null,
      workDate: string,
      source: TimeLogSource = 'manual'
    ) => {
      const trimmed = (description || '').trim();
      // Manual entries require a description; timer entries can have an empty description
      if (source === 'manual' && !trimmed) {
        throw new Error('Description cannot be empty.');
      }
      if (timeSpentSeconds <= 0 || isNaN(timeSpentSeconds)) {
        throw new Error('Time spent must be greater than 0.');
      }

      try {
        setError(null);
        await timeLogRepository.updateTimeLog(
          db,
          logId,
          timeSpentSeconds,
          trimmed || null,
          workDate
        );
        await fetchTimeLogs();
      } catch (err: any) {
        console.error(`[useTimeLogs] Error updating time log ${logId}:`, err);
        setError(err?.message || 'Failed to update time log.');
        throw err;
      }
    },
    [db, fetchTimeLogs]
  );

  // Delete: Remove time log entry (with optimistic update)
  const deleteTimeLog = useCallback(
    async (logId: number) => {
      const previousLogs = [...timeLogs];
      const previousTotal = totalSeconds;

      const target = timeLogs.find((item) => item.id === logId);
      const targetSeconds = target ? target.time_spent_seconds : 0;

      setTimeLogs((prev) => prev.filter((item) => item.id !== logId));
      setTotalSeconds((prev) => Math.max(0, prev - targetSeconds));

      try {
        setError(null);
        await timeLogRepository.deleteTimeLog(db, logId);
        const [logsData, total] = await Promise.all([
          timeLogRepository.getTimeLogsByTaskId(db, taskId),
          timeLogRepository.getTotalTimeSpent(db, taskId),
        ]);
        setTimeLogs(logsData);
        setTotalSeconds(total);
      } catch (err: any) {
        console.error(`[useTimeLogs] Error deleting time log ${logId}:`, err);
        setTimeLogs(previousLogs);
        setTotalSeconds(previousTotal);
        setError(err?.message || 'Failed to delete time log.');
        throw err;
      }
    },
    [db, taskId, timeLogs, totalSeconds]
  );

  // Load time logs on mount / when taskId changes
  useEffect(() => {
    fetchTimeLogs();
  }, [fetchTimeLogs]);

  // Reactive automatic refresh when a timer stops for this task
  useEffect(() => {
    if (lastStopped && lastStopped.taskId === taskId) {
      fetchTimeLogs();
    }
  }, [lastStopped, taskId, fetchTimeLogs]);

  return {
    timeLogs,
    totalSeconds,
    totalMinutes: Math.floor(totalSeconds / 60),
    loading,
    error,
    refreshTimeLogs: fetchTimeLogs,
    addTimeLog,
    updateTimeLog,
    deleteTimeLog,
  };
}
