"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileQuestion } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionStat {
  id: string;
  question: string;
  questionType: string;
  totalAnswered: number;
  correctCount: number;
  successRate: number;
}

interface QuestionAnalyticsProps {
  questions: QuestionStat[];
}

const questionTypeLabels: Record<string, string> = {
  multiple_choice: "MC",
  true_false: "T/F",
  text_input: "Text",
  year_range: "Year",
  numeric_range: "Num",
  matching: "Match",
  fill_blank: "Fill",
  multi_select: "Multi",
};

export function QuestionAnalytics({ questions }: QuestionAnalyticsProps) {
  const getDifficultyColor = (rate: number) => {
    if (rate >= 80) return "text-green-600";
    if (rate >= 60) return "text-yellow-600";
    if (rate >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getDifficultyLabel = (rate: number) => {
    if (rate >= 80) return "Easy";
    if (rate >= 60) return "Medium";
    if (rate >= 40) return "Hard";
    return "Very Hard";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileQuestion className="h-5 w-5" />
          Per-Question Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        {questions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No questions to analyze
          </p>
        ) : (
          <div className="space-y-3">
            {questions.map((q, i) => (
              <div
                key={q.id}
                className="flex items-center gap-4 p-3 rounded-lg bg-muted/30"
              >
                <span className="text-sm font-medium text-muted-foreground w-6">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{q.question}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {questionTypeLabels[q.questionType] || q.questionType}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {q.totalAnswered} responses
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-24">
                    <Progress
                      value={q.successRate}
                      className="h-2"
                    />
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium w-12 text-right",
                      getDifficultyColor(q.successRate)
                    )}
                  >
                    {q.successRate}%
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs w-20 justify-center",
                      getDifficultyColor(q.successRate)
                    )}
                  >
                    {getDifficultyLabel(q.successRate)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
