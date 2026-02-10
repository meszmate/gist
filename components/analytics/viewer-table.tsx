"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface Viewer {
  email: string;
  lastViewed: string;
  viewCount: number;
  quizScore: number | null;
  timeSpent: number | null;
}

interface ViewerTableProps {
  viewers: Viewer[];
}

export function ViewerTable({ viewers }: ViewerTableProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Viewers ({viewers.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {viewers.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No viewers yet
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Last Viewed</TableHead>
                <TableHead className="text-center">Views</TableHead>
                <TableHead className="text-center">Quiz Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {viewers.map((viewer) => (
                <TableRow key={viewer.email}>
                  <TableCell className="font-medium">{viewer.email}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(viewer.lastViewed)}
                  </TableCell>
                  <TableCell className="text-center">{viewer.viewCount}</TableCell>
                  <TableCell className="text-center">
                    {viewer.quizScore !== null ? (
                      <Badge
                        variant={
                          viewer.quizScore >= 80
                            ? "default"
                            : viewer.quizScore >= 60
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {viewer.quizScore.toFixed(0)}%
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
