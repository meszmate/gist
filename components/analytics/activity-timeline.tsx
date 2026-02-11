"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useLocale } from "@/hooks/use-locale";

interface ActivityTimelineProps {
  views: Array<{ date: string; count: number }>;
  attempts: Array<{ date: string; count: number }>;
  lessonAttempts?: Array<{ date: string; count: number }>;
}

export function ActivityTimeline({ views, attempts, lessonAttempts = [] }: ActivityTimelineProps) {
  const { t } = useLocale();

  // Merge all datasets by date
  const dateMap = new Map<string, { date: string; views: number; attempts: number; lessonAttempts: number }>();

  for (const v of views) {
    dateMap.set(v.date, {
      date: v.date,
      views: v.count,
      attempts: 0,
      lessonAttempts: 0,
    });
  }

  for (const a of attempts) {
    const existing = dateMap.get(a.date);
    if (existing) {
      existing.attempts = a.count;
    } else {
      dateMap.set(a.date, {
        date: a.date,
        views: 0,
        attempts: a.count,
        lessonAttempts: 0,
      });
    }
  }

  for (const la of lessonAttempts) {
    const existing = dateMap.get(la.date);
    if (existing) {
      existing.lessonAttempts = la.count;
    } else {
      dateMap.set(la.date, {
        date: la.date,
        views: 0,
        attempts: 0,
        lessonAttempts: la.count,
      });
    }
  }

  const data = Array.from(dateMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const hasData = data.length > 0;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {t("analytics.activityTimeline")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="text-center text-muted-foreground py-8">
            {t("analytics.noActivityData")}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                className="text-muted-foreground"
                fontSize={12}
              />
              <YAxis
                className="text-muted-foreground"
                fontSize={12}
                allowDecimals={false}
              />
              <Tooltip
                labelFormatter={formatDate}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="views"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                name={t("analytics.viewsLabel")}
              />
              <Line
                type="monotone"
                dataKey="attempts"
                stroke="hsl(var(--chart-2, 220 70% 50%))"
                strokeWidth={2}
                dot={false}
                name={t("analytics.quizAttemptsLabel")}
              />
              <Line
                type="monotone"
                dataKey="lessonAttempts"
                stroke="hsl(142 71% 45%)"
                strokeWidth={2}
                dot={false}
                name={t("analytics.lessonAttemptsLabel")}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
