import { useState, useEffect, useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { timeLogRepository, TimeLog } from '../db/timeLogRepository';

/**
 * Custom hook to interact with SQLite database for time logs tied to a task.
 * Manages load state, error reporting, input validation, and reactive updates for time logs and total duration.
 */
export function useTimeLogs(taskId: number) {
  const db = useSQLiteContext();
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [totalMinutes, setTotalMinutes] = useState<number>(0);
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
      setTotalMinutes(total);
    } catch (err: any) {
      console.error(`[useTimeLogs] Error fetching time logs for task ${taskId}:`, err);
      setError(err?.message || 'Failed to fetch time logs.');
    } finally {
      setLoading(false);
    }
  }, [db, taskId]);

  // Create: Add new time log entry
  const addTimeLog = useCallback(
    async (timeSpentMinutes: number, description: string, workDate: string) => {
      const trimmed = description.trim();
      if (!trimmed) {
        throw new Error('Description cannot be empty.');
      }
      if (timeSpentMinutes <= 0 || isNaN(timeSpentMinutes)) {
        throw new Error('Time spent must be greater than 0.');
      }

      try {
        setError(null);
        await timeLogRepository.createTimeLog(db, taskId, timeSpentMinutes, trimmed, workDate);
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
    async (logId: number, timeSpentMinutes: number, description: string, workDate: string) => {
      const trimmed = description.trim();
      if (!trimmed) {
        throw new Error('Description cannot be empty.');
      }
      if (timeSpentMinutes <= 0 || isNaN(timeSpentMinutes)) {
        throw new Error('Time spent must be greater than 0.');
      }

      try {
        setError(null);
        await timeLogRepository.updateTimeLog(db, logId, timeSpentMinutes, trimmed, workDate);
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
      const previousTotal = totalMinutes;

      const target = timeLogs.find((item) => item.id === logId);
      const targetMinutes = target ? target.time_spent_minutes : 0;

      setTimeLogs((prev) => prev.filter((item) => item.id !== logId));
      setTotalMinutes((prev) => Math.max(0, prev - targetMinutes));

      try {
        setError(null);
        await timeLogRepository.deleteTimeLog(db, logId);
        const [logsData, total] = await Promise.all([
          timeLogRepository.getTimeLogsByTaskId(db, taskId),
          timeLogRepository.getTotalTimeSpent(db, taskId),
        ]);
        setTimeLogs(logsData);
        setTotalMinutes(total);
      } catch (err: any) {
        console.error(`[useTimeLogs] Error deleting time log ${logId}:`, err);
        setTimeLogs(previousLogs);
        setTotalMinutes(previousTotal);
        setError(err?.message || 'Failed to delete time log.');
        throw err;
      }
    },
    [db, taskId, timeLogs, totalMinutes]
  );

  // Load time logs on mount / when taskId changes
  useEffect(() => {
    fetchTimeLogs();
  }, [fetchTimeLogs]);

  return {
    timeLogs,
    totalMinutes,
    loading,
    error,
    refreshTimeLogs: fetchTimeLogs,
    addTimeLog,
    updateTimeLog,
    deleteTimeLog,
  };
}
