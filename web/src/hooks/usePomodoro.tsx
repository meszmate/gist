import { useState, useEffect, useCallback, useRef } from 'react';

type TimerState = 'idle' | 'running' | 'paused';
type SessionType = 'work' | 'break';

interface PomodoroSettings {
  workDuration: number; // minutes
  breakDuration: number; // minutes
  longBreakDuration: number; // minutes
  sessionsUntilLongBreak: number;
}

interface PomodoroState {
  state: TimerState;
  sessionType: SessionType;
  timeRemaining: number; // seconds
  sessionsCompleted: number;
  totalWorkTime: number; // seconds
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  breakDuration: 5,
  longBreakDuration: 15,
  sessionsUntilLongBreak: 4,
};

const loadSettings = (): PomodoroSettings => {
  try {
    const saved = localStorage.getItem('pomodoro_settings');
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch {
    // Ignore
  }
  return DEFAULT_SETTINGS;
};

const saveSettings = (settings: PomodoroSettings) => {
  localStorage.setItem('pomodoro_settings', JSON.stringify(settings));
};

export function usePomodoro(onSessionComplete?: (type: SessionType, duration: number) => void) {
  const [settings, setSettingsState] = useState<PomodoroSettings>(loadSettings);
  const [state, setState] = useState<PomodoroState>({
    state: 'idle',
    sessionType: 'work',
    timeRemaining: settings.workDuration * 60,
    sessionsCompleted: 0,
    totalWorkTime: 0,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartRef = useRef<number>(0);

  const setSettings = useCallback((newSettings: Partial<PomodoroSettings>) => {
    setSettingsState((prev) => {
      const updated = { ...prev, ...newSettings };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  const showNotification = useCallback((title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  }, []);

  const playSound = useCallback(() => {
    // Play a subtle notification sound
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {
      // Ignore errors (autoplay restrictions)
    });
  }, []);

  const start = useCallback(() => {
    requestNotificationPermission();
    sessionStartRef.current = Date.now();
    setState((prev) => ({ ...prev, state: 'running' }));
  }, [requestNotificationPermission]);

  const pause = useCallback(() => {
    setState((prev) => ({ ...prev, state: 'paused' }));
  }, []);

  const resume = useCallback(() => {
    setState((prev) => ({ ...prev, state: 'running' }));
  }, []);

  const reset = useCallback(() => {
    setState((prev) => ({
      ...prev,
      state: 'idle',
      timeRemaining:
        prev.sessionType === 'work'
          ? settings.workDuration * 60
          : settings.breakDuration * 60,
    }));
  }, [settings]);

  const skip = useCallback(() => {
    setState((prev) => {
      const isWork = prev.sessionType === 'work';

      if (isWork) {
        // Calculate actual work time
        const workTime = settings.workDuration * 60 - prev.timeRemaining;
        if (workTime > 0 && onSessionComplete) {
          onSessionComplete('work', workTime);
        }

        // Determine break type
        const newSessionsCompleted = prev.sessionsCompleted + 1;
        const isLongBreak = newSessionsCompleted % settings.sessionsUntilLongBreak === 0;
        const breakDuration = isLongBreak
          ? settings.longBreakDuration
          : settings.breakDuration;

        return {
          ...prev,
          state: 'idle',
          sessionType: 'break',
          timeRemaining: breakDuration * 60,
          sessionsCompleted: newSessionsCompleted,
          totalWorkTime: prev.totalWorkTime + workTime,
        };
      } else {
        // Skip break
        return {
          ...prev,
          state: 'idle',
          sessionType: 'work',
          timeRemaining: settings.workDuration * 60,
        };
      }
    });
  }, [settings, onSessionComplete]);

  // Timer tick
  useEffect(() => {
    if (state.state !== 'running') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setState((prev) => {
        if (prev.timeRemaining <= 1) {
          // Session complete
          playSound();

          const isWork = prev.sessionType === 'work';

          if (isWork) {
            const workTime = settings.workDuration * 60;
            if (onSessionComplete) {
              onSessionComplete('work', workTime);
            }

            showNotification(
              'Work session complete!',
              'Time for a break. Good job!'
            );

            const newSessionsCompleted = prev.sessionsCompleted + 1;
            const isLongBreak =
              newSessionsCompleted % settings.sessionsUntilLongBreak === 0;
            const breakDuration = isLongBreak
              ? settings.longBreakDuration
              : settings.breakDuration;

            return {
              ...prev,
              state: 'idle',
              sessionType: 'break',
              timeRemaining: breakDuration * 60,
              sessionsCompleted: newSessionsCompleted,
              totalWorkTime: prev.totalWorkTime + workTime,
            };
          } else {
            showNotification(
              'Break time is over!',
              'Ready to get back to work?'
            );

            return {
              ...prev,
              state: 'idle',
              sessionType: 'work',
              timeRemaining: settings.workDuration * 60,
            };
          }
        }

        return {
          ...prev,
          timeRemaining: prev.timeRemaining - 1,
        };
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.state, settings, playSound, showNotification, onSessionComplete]);

  // Compute effective time remaining based on settings when idle
  const effectiveTimeRemaining =
    state.state === 'idle'
      ? state.sessionType === 'work'
        ? settings.workDuration * 60
        : settings.breakDuration * 60
      : state.timeRemaining;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (() => {
    const totalTime =
      state.sessionType === 'work'
        ? settings.workDuration * 60
        : settings.breakDuration * 60;
    return ((totalTime - effectiveTimeRemaining) / totalTime) * 100;
  })();

  return {
    // State
    timerState: state.state,
    sessionType: state.sessionType,
    timeRemaining: effectiveTimeRemaining,
    formattedTime: formatTime(effectiveTimeRemaining),
    sessionsCompleted: state.sessionsCompleted,
    totalWorkTime: state.totalWorkTime,
    progress,

    // Settings
    settings,
    setSettings,

    // Actions
    start,
    pause,
    resume,
    reset,
    skip,
    toggle: state.state === 'running' ? pause : state.state === 'paused' ? resume : start,
  };
}
