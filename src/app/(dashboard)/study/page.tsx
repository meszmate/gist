"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Brain,
  Check,
  Loader2,
  RotateCcw,
  Sparkles,
  Trophy,
  Clock,
  Target,
  ChevronUp,
  Flame,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface DueCard {
  id: string;
  front: string;
  back: string;
  studyMaterialId: string;
  studyMaterialTitle: string;
}

type Rating = 1 | 2 | 3 | 4;

const ratingConfig: Record<
  Rating,
  { label: string; color: string; gradient: string; description: string }
> = {
  1: {
    label: "Again",
    color: "bg-red-500 hover:bg-red-600 border-red-600",
    gradient: "from-red-500 to-red-600",
    description: "Didn't know it",
  },
  2: {
    label: "Hard",
    color: "bg-orange-500 hover:bg-orange-600 border-orange-600",
    gradient: "from-orange-500 to-orange-600",
    description: "Struggled a bit",
  },
  3: {
    label: "Good",
    color: "bg-green-500 hover:bg-green-600 border-green-600",
    gradient: "from-green-500 to-green-600",
    description: "Got it right",
  },
  4: {
    label: "Easy",
    color: "bg-blue-500 hover:bg-blue-600 border-blue-600",
    gradient: "from-blue-500 to-blue-600",
    description: "Too easy!",
  },
};

async function fetchDueCards(resourceId?: string): Promise<DueCard[]> {
  const url = resourceId
    ? `/api/srs/due?resource=${resourceId}`
    : "/api/srs/due";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch due cards");
  return res.json();
}

function StudyContent() {
  const searchParams = useSearchParams();
  const resourceId = searchParams.get("resource");
  const queryClient = useQueryClient();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [startTime] = useState(Date.now());
  const [ratings, setRatings] = useState<Rating[]>([]);

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["due-cards", resourceId],
    queryFn: () => fetchDueCards(resourceId || undefined),
  });

  const reviewCard = useMutation({
    mutationFn: async ({ cardId, rating }: { cardId: string; rating: Rating }) => {
      const res = await fetch("/api/srs/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, rating }),
      });
      if (!res.ok) throw new Error("Failed to review card");
      return res.json();
    },
    onSuccess: (_, variables) => {
      setRatings((prev) => [...prev, variables.rating]);
      setReviewedCount((prev) => prev + 1);
      if (currentIndex < cards.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setIsFlipped(false);
      } else {
        setSessionComplete(true);
      }
    },
  });

  const currentCard = cards[currentIndex];
  const progress = cards.length > 0 ? (reviewedCount / cards.length) * 100 : 0;
  const remainingCards = cards.length - currentIndex - 1;
  const elapsedMinutes = Math.floor((Date.now() - startTime) / 60000);

  const flipCard = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleRating = useCallback(
    (rating: Rating) => {
      if (currentCard && isFlipped) {
        reviewCard.mutate({ cardId: currentCard.id, rating });
      }
    },
    [currentCard, isFlipped, reviewCard]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        flipCard();
      } else if (isFlipped && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        handleRating(parseInt(e.key) as Rating);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flipCard, handleRating, isFlipped]);

  const restartSession = () => {
    setCurrentIndex(0);
    setReviewedCount(0);
    setIsFlipped(false);
    setSessionComplete(false);
    setRatings([]);
    queryClient.invalidateQueries({ queryKey: ["due-cards", resourceId] });
  };

  const getSessionStats = () => {
    const avgRating = ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : 0;
    const goodOrBetter = ratings.filter((r) => r >= 3).length;
    const percentage = ratings.length > 0 ? (goodOrBetter / ratings.length) * 100 : 0;
    return { avgRating, goodOrBetter, percentage };
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        <div className="h-80 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <EmptyState
          icon={<Sparkles className="h-12 w-12" />}
          title="No cards due for review"
          description={
            resourceId
              ? "All flashcards in this resource have been reviewed."
              : "You're all caught up! Check back later for more cards."
          }
          action={{
            label: "Browse Library",
            href: "/library",
          }}
        />
      </div>
    );
  }

  if (sessionComplete) {
    const stats = getSessionStats();
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8">
            <div className="text-center animate-celebrate">
              <Trophy className="h-16 w-16 mx-auto text-primary mb-4" />
              <h2 className="text-3xl font-bold mb-2">Session Complete!</h2>
              <p className="text-muted-foreground">
                Great job! You reviewed {reviewedCount} card{reviewedCount !== 1 ? "s" : ""}.
              </p>
            </div>
          </div>
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-3xl font-bold text-primary">{reviewedCount}</div>
                <div className="text-sm text-muted-foreground">Cards Reviewed</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-3xl font-bold text-green-600">
                  {stats.percentage.toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground">Good or Better</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-3xl font-bold">{elapsedMinutes || "<1"}</div>
                <div className="text-sm text-muted-foreground">Minutes</div>
              </div>
            </div>
            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={restartSession} size="lg">
                <RotateCcw className="mr-2 h-4 w-4" />
                Study Again
              </Button>
              <Button asChild size="lg">
                <Link href="/dashboard">Back to Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Collapsible Header */}
      <Collapsible open={!headerCollapsed} onOpenChange={(open) => setHeaderCollapsed(!open)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href={resourceId ? `/library/${resourceId}` : "/dashboard"}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors">
                <div>
                  <h1 className="text-xl font-bold flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    Study Session
                  </h1>
                  {!headerCollapsed && currentCard?.studyMaterialTitle && (
                    <p className="text-sm text-muted-foreground">
                      {currentCard.studyMaterialTitle}
                    </p>
                  )}
                </div>
                <ChevronUp
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    headerCollapsed && "rotate-180"
                  )}
                />
              </button>
            </CollapsibleTrigger>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-1">
              <Target className="h-3 w-3" />
              {currentIndex + 1} / {cards.length}
            </Badge>
          </div>
        </div>

        <CollapsibleContent className="mt-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Check className="h-4 w-4 text-green-500" />
              {reviewedCount} reviewed
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {remainingCards} remaining
            </div>
            {elapsedMinutes > 0 && (
              <div className="flex items-center gap-1">
                <Zap className="h-4 w-4 text-yellow-500" />
                {elapsedMinutes} min
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Progress */}
      <div className="space-y-2">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{reviewedCount} reviewed</span>
          <span>{cards.length - reviewedCount} remaining</span>
        </div>
      </div>

      {/* Flashcard */}
      <div
        className="perspective-1000 cursor-pointer"
        onClick={flipCard}
      >
        <Card
          className={cn(
            "min-h-[350px] transition-transform duration-500 transform-style-preserve-3d relative border-2",
            isFlipped && "rotate-y-180",
            !isFlipped && "hover:border-primary/50"
          )}
        >
          {/* Front */}
          <CardContent
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center p-8 backface-hidden",
              isFlipped && "invisible"
            )}
          >
            <Badge variant="secondary" className="mb-6 uppercase tracking-wider">
              Question
            </Badge>
            <p className="text-xl text-center leading-relaxed">{currentCard?.front}</p>
          </CardContent>

          {/* Back */}
          <CardContent
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center p-8 backface-hidden rotate-y-180 bg-primary/5",
              !isFlipped && "invisible"
            )}
          >
            <Badge className="mb-6 uppercase tracking-wider bg-primary">
              Answer
            </Badge>
            <p className="text-xl text-center leading-relaxed">{currentCard?.back}</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      {!isFlipped ? (
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Press <kbd className="px-2 py-1 bg-muted rounded font-mono border mx-1">Space</kbd> or click to flip
          </p>
          <Button onClick={flipCard} size="lg" className="px-8">
            Show Answer
          </Button>
        </div>
      ) : (
        <div className="space-y-4 animate-slide-up">
          <p className="text-center text-sm text-muted-foreground">
            How well did you know this?
          </p>
          <div className="grid grid-cols-4 gap-3">
            {([1, 2, 3, 4] as Rating[]).map((rating) => (
              <Button
                key={rating}
                onClick={() => handleRating(rating)}
                disabled={reviewCard.isPending}
                className={cn(
                  "h-auto py-4 px-2 flex flex-col gap-1 text-white border-b-4 transition-all hover:scale-105",
                  ratingConfig[rating].color
                )}
              >
                <span className="text-lg font-bold">{rating}</span>
                <span className="text-xs font-medium">{ratingConfig[rating].label}</span>
              </Button>
            ))}
          </div>
          <div className="flex justify-center gap-6 text-xs text-muted-foreground">
            {([1, 2, 3, 4] as Rating[]).map((rating) => (
              <div key={rating} className="text-center">
                <kbd className="px-1.5 py-0.5 bg-muted rounded border">{rating}</kbd>
                <p className="mt-1">{ratingConfig[rating].description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StudyFallback() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-center h-80">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    </div>
  );
}

export default function StudyPage() {
  return (
    <Suspense fallback={<StudyFallback />}>
      <StudyContent />
    </Suspense>
  );
}
