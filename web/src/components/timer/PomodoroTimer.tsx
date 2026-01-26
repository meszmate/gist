import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Play, Pause, RotateCcw, Settings, Timer, X } from 'lucide-react';
import { usePomodoro } from '@/hooks/usePomodoro';
import { cn } from '@/lib/utils';

interface PomodoroTimerProps {
  onSessionComplete?: (type: 'work' | 'break', duration: number) => void;
  className?: string;
}

export function PomodoroTimer({ onSessionComplete, className }: PomodoroTimerProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const {
    timerState,
    sessionType,
    formattedTime,
    sessionsCompleted,
    progress,
    settings,
    setSettings,
    toggle,
    reset,
    skip,
  } = usePomodoro(onSessionComplete);

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(true)}
        className={cn('relative', className)}
      >
        <Timer className="h-5 w-5" />
        {timerState === 'running' && (
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse" />
        )}
      </Button>
    );
  }

  return (
    <Card className={cn('fixed bottom-4 right-4 w-80 shadow-lg z-50', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Timer className="h-5 w-5" />
            {t('timer.pomodoro')}
          </CardTitle>
          <div className="flex gap-1">
            <Popover open={showSettings} onOpenChange={setShowSettings}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">
                      {t('timer.workDuration')}: {settings.workDuration} {t('timer.minutes')}
                    </label>
                    <Slider
                      value={[settings.workDuration]}
                      onValueChange={([value]) => setSettings({ workDuration: value })}
                      min={5}
                      max={60}
                      step={5}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">
                      {t('timer.breakDuration')}: {settings.breakDuration} {t('timer.minutes')}
                    </label>
                    <Slider
                      value={[settings.breakDuration]}
                      onValueChange={([value]) => setSettings({ breakDuration: value })}
                      min={1}
                      max={30}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Session Type Indicator */}
        <div className="text-center mb-4">
          <span
            className={cn(
              'inline-block px-3 py-1 rounded-full text-sm font-medium',
              sessionType === 'work'
                ? 'bg-primary/10 text-primary'
                : 'bg-green-500/10 text-green-600'
            )}
          >
            {sessionType === 'work' ? t('timer.work') : t('timer.break')}
          </span>
        </div>

        {/* Timer Display */}
        <div className="text-center mb-6">
          <div className="text-5xl font-mono font-bold tabular-nums">
            {formattedTime}
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            {sessionsCompleted} {t('dashboard.quizzesCompleted').toLowerCase()}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-secondary rounded-full mb-6 overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-1000',
              sessionType === 'work' ? 'bg-primary' : 'bg-green-500'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="icon" onClick={reset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button size="lg" onClick={toggle} className="px-8">
            {timerState === 'running' ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                {t('timer.pause')}
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                {t('timer.start')}
              </>
            )}
          </Button>
          <Button variant="outline" onClick={skip}>
            {t('common.next')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function PomodoroButton({ onSessionComplete }: { onSessionComplete?: (type: 'work' | 'break', duration: number) => void }) {
  return <PomodoroTimer onSessionComplete={onSessionComplete} />;
}
