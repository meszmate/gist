"use client";

import { ReactNode, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  description?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
  sparklineData?: number[];
  onClick?: () => void;
  className?: string;
  delay?: number;
}

function AnimatedNumber({ value, delay = 0 }: { value: number; delay?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const duration = 1000;
      const steps = 30;
      const stepValue = value / steps;
      let current = 0;
      let step = 0;

      const interval = setInterval(() => {
        step++;
        current = Math.min(Math.round(stepValue * step), value);
        setDisplayValue(current);

        if (step >= steps) {
          clearInterval(interval);
          setDisplayValue(value);
        }
      }, duration / steps);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timeout);
  }, [value, delay]);

  return <span>{displayValue}</span>;
}

function MiniSparkline({ data, className }: { data: number[]; className?: string }) {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const height = 32;
  const width = 80;
  const padding = 2;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(" ");

  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;

  return (
    <svg
      width={width}
      height={height}
      className={cn("overflow-visible", className)}
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill="url(#sparklineGradient)"
        className="text-primary"
      />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
      />
    </svg>
  );
}

export function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  sparklineData,
  onClick,
  className,
  delay = 0,
}: StatCardProps) {
  const isClickable = !!onClick;
  const numericValue = typeof value === "number" ? value : null;

  const TrendIcon = trend
    ? trend.value > 0
      ? TrendingUp
      : trend.value < 0
      ? TrendingDown
      : Minus
    : null;

  const trendColor = trend
    ? trend.value > 0
      ? "text-green-600 dark:text-green-400"
      : trend.value < 0
      ? "text-red-600 dark:text-red-400"
      : "text-muted-foreground"
    : "";

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-200",
        isClickable && "cursor-pointer card-hover",
        className
      )}
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight">
                {numericValue !== null ? (
                  <AnimatedNumber value={numericValue} delay={delay} />
                ) : (
                  value
                )}
              </span>
              {trend && TrendIcon && (
                <div className={cn("flex items-center gap-1 text-sm", trendColor)}>
                  <TrendIcon className="h-4 w-4" />
                  <span>{Math.abs(trend.value)}%</span>
                </div>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {trend?.label && (
              <p className="text-xs text-muted-foreground">{trend.label}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {icon && (
              <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                {icon}
              </div>
            )}
            {sparklineData && sparklineData.length > 0 && (
              <MiniSparkline data={sparklineData} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
