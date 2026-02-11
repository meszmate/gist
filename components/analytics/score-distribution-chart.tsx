"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useLocale } from "@/hooks/use-locale";

interface ScoreDistributionChartProps {
  distribution: Array<{ range: string; count: number }>;
  title?: string;
}

export function ScoreDistributionChart({
  distribution,
  title,
}: ScoreDistributionChartProps) {
  const { t } = useLocale();
  const hasData = distribution.some((d) => d.count > 0);

  const displayTitle = title ?? t("analytics.scoreDistribution");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          {displayTitle}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="text-center text-muted-foreground py-8">
            {t("analytics.noQuizAttemptsYet")}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={distribution}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="range"
                className="text-muted-foreground"
                fontSize={12}
              />
              <YAxis
                className="text-muted-foreground"
                fontSize={12}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar
                dataKey="count"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
