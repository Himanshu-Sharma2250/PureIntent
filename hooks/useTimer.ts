import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { timerRepository, ActiveTimer } from '../db/timerRepository';
import { taskRepository } from '../db/taskRepository';

export interface TimerStopEvent {
  taskId: number;
  timestamp: number;
}

interface TimerContextValue {
  activeTimer: ActiveTimer | null;
  elapsedSeconds: number;
  loading: boolean;
  lastStopped: TimerStopEvent | null;
  start: (taskId: number, taskTitle?: string) => Promise<void>;
  stop: (force?: boolean) => Promise<{ logId: number; taskId: number; timeSpentSeconds: number } | null>;
  discard: () => Promise<void>;
  refreshTimer: () => Promise<void>;
}

const TimerContext = createContext<TimerContextValue | null>(null);

/**
 * Global Timer Provider to be mounted at application root.
 * Manages active timer persistence in SQLite, 1-second UI re-render tick computed
 * from started_at, app backgrounding/foregrounding resync, 12-hour safety prompts,
 * under-60-second confirmations, and single-timer enforcement across the entire app.
 */
export const TimerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const db = useSQLiteContext();
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastStopped, setLastStopped] = useState<TimerStopEvent | null>(null);

  const activeTimerRef = useRef<ActiveTimer | null>(null);
  activeTimerRef.current = activeTimer;

  const hasPrompted12HoursRef = useRef<boolean>(false);
  const isActionInProgressRef = useRef<boolean>(false);

  // Recomputes live elapsed seconds from started_at timestamp
  const calculateElapsed = useCallback((startedAt: string): number => {
    const started = new Date(startedAt).getTime();
    const now = Date.now();
    // Guard against device clock or timezone changes: clamp to 0
    return Math.max(0, Math.floor((now - started) / 1000));
  }, []);

  // Fetch active timer from SQLite
  const refreshTimer = useCallback(async () => {
    try {
      const current = await timerRepository.getActiveTimer(db);
      if (current) {
        setActiveTimer(current);
        const elapsed = calculateElapsed(current.started_at);
        setElapsedSeconds(elapsed);
      } else {
        setActiveTimer(null);
        setElapsedSeconds(0);
      }
    } catch (err) {
      console.error('[TimerProvider] Error loading active timer:', err);
    } finally {
      setLoading(false);
    }
  }, [db, calculateElapsed]);

  // Load timer on mount
  useEffect(() => {
    refreshTimer();
  }, [refreshTimer]);

  // 1-second interval to re-render elapsed time purely from started_at
  useEffect(() => {
    if (!activeTimer) {
      setElapsedSeconds(0);
      return;
    }

    // Immediately compute on change
    setElapsedSeconds(calculateElapsed(activeTimer.started_at));

    const interval = setInterval(() => {
      if (activeTimerRef.current) {
        setElapsedSeconds(calculateElapsed(activeTimerRef.current.started_at));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimer, calculateElapsed]);

  // Discard the running timer
  const discard = useCallback(async () => {
    if (isActionInProgressRef.current) return;
    isActionInProgressRef.current = true;
    try {
      await timerRepository.discardTimer(db);
      setActiveTimer(null);
      setElapsedSeconds(0);
      hasPrompted12HoursRef.current = false;
    } catch (err) {
      console.error('[TimerProvider] Error discarding timer:', err);
      throw err;
    } finally {
      isActionInProgressRef.current = false;
    }
  }, [db]);

  // Internal direct stop that commits the log to SQLite
  const executeStop = useCallback(async () => {
    if (isActionInProgressRef.current) return null;
    isActionInProgressRef.current = true;
    try {
      const result = await timerRepository.stopTimer(db);
      if (result) {
        setActiveTimer(null);
        setElapsedSeconds(0);
        hasPrompted12HoursRef.current = false;
        setLastStopped({ taskId: result.taskId, timestamp: Date.now() });
      }
      return result;
    } catch (err) {
      console.error('[TimerProvider] Error stopping timer:', err);
      throw err;
    } finally {
      isActionInProgressRef.current = false;
    }
  }, [db]);

  // Public stop method with < 60s session prompt
  const stop = useCallback(
    async (force: boolean = false): Promise<{ logId: number; taskId: number; timeSpentSeconds: number } | null> => {
      const current = activeTimerRef.current;
      if (!current) return null;

      const currentElapsed = calculateElapsed(current.started_at);

      // Sessions under 60 seconds: on stop, ask whether to keep or discard
      if (!force && currentElapsed < 60) {
        return new Promise((resolve) => {
          Alert.alert(
            'Short Session',
            'This session was under 1 minute. Would you like to keep this log or discard it?',
            [
              {
                text: 'Discard',
                style: 'destructive',
                onPress: async () => {
                  await discard();
                  resolve(null);
                },
              },
              {
                text: 'Keep Log',
                onPress: async () => {
                  const res = await executeStop();
                  resolve(res);
                },
              },
            ],
            { cancelable: true }
          );
        });
      }

      return await executeStop();
    },
    [calculateElapsed, discard, executeStop]
  );

  // Directly starts timer for taskId in SQLite
  const executeStart = useCallback(
    async (taskId: number) => {
      if (isActionInProgressRef.current) return;
      isActionInProgressRef.current = true;
      try {
        const timer = await timerRepository.startTimer(db, taskId);
        setActiveTimer(timer);
        setElapsedSeconds(0);
        hasPrompted12HoursRef.current = false;
      } catch (err) {
        console.error(`[TimerProvider] Error starting timer for task ${taskId}:`, err);
        throw err;
      } finally {
        isActionInProgressRef.current = false;
      }
    },
    [db]
  );

  // Public start with switch confirmation if another timer is running
  const start = useCallback(
    async (taskId: number, taskTitle?: string) => {
      const current = activeTimerRef.current;

      // Already running on this task
      if (current && current.task_id === taskId) {
        return;
      }

      // If another task's timer is running: show confirmation
      if (current && current.task_id !== taskId) {
        let runningTitle = current.task_title;
        if (!runningTitle) {
          const taskData = await taskRepository.getIntentById(db, current.task_id);
          runningTitle = taskData?.title || 'another task';
        }

        Alert.alert(
          'Switch Active Timer',
          `Stop timer on '${runningTitle}' and start here?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Switch & Start',
              onPress: async () => {
                // Stop running timer (saving its log) and start the new one
                await executeStop();
                await executeStart(taskId);
              },
            },
          ]
        );
        return;
      }

      // No timer running: start directly
      await executeStart(taskId);
    },
    [db, executeStart, executeStop]
  );

  // 12-hour edge case check
  const checkTwelveHours = useCallback(async () => {
    const current = activeTimerRef.current;
    if (!current || hasPrompted12HoursRef.current) return;

    const elapsed = calculateElapsed(current.started_at);
    // 12 hours = 43200 seconds
    if (elapsed >= 43200) {
      hasPrompted12HoursRef.current = true;
      const hoursNum = Math.floor(elapsed / 3600);
      const minsNum = Math.floor((elapsed % 3600) / 60);

      Alert.alert(
        'Long-Running Timer',
        `The timer on "${current.task_title || 'your task'}" has been running for ${hoursNum}h ${minsNum}m. What would you like to do?`,
        [
          {
            text: 'Discard',
            style: 'destructive',
            onPress: async () => {
              await discard();
            },
          },
          {
            text: 'Save As-Is',
            onPress: async () => {
              await executeStop();
            },
          },
        ]
      );
    }
  }, [calculateElapsed, discard, executeStop]);

  // AppState listener for app foregrounding: re-evaluates elapsed time & 12h check
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        if (activeTimerRef.current) {
          setElapsedSeconds(calculateElapsed(activeTimerRef.current.started_at));
          checkTwelveHours();
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    // Also check on mount if already > 12h
    checkTwelveHours();

    return () => sub.remove();
  }, [calculateElapsed, checkTwelveHours]);

  return React.createElement(
    TimerContext.Provider,
    {
      value: {
        activeTimer,
        elapsedSeconds,
        loading,
        lastStopped,
        start,
        stop,
        discard,
        refreshTimer,
      },
    },
    children
  );
};

/**
 * Hook to access active timer, elapsed time, and timer actions from any screen/component.
 */
export function useTimer(): TimerContextValue {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}
