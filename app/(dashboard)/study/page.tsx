"use client";

import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
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
  Zap,
  Repeat,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
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
  const [startTime] = useState(() => Date.now());
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  // Practice mode state
  const [practiceMode, setPracticeMode] = useState(false);
  const [sessionCards, setSessionCards] = useState<DueCard[]>([]);
  const [cardRatings, setCardRatings] = useState<Record<string, Rating>>({});

  // Continuation round state
  const [continuationRound, setContinuationRound] = useState(0);
  const [showContinuationBanner, setShowContinuationBanner] = useState(false);
  const [markedDone, setMarkedDone] = useState(false);

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["due-cards", resourceId],
    queryFn: () => fetchDueCards(resourceId || undefined),
  });

  // Update elapsed time every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedMinutes(Math.floor((Date.now() - startTime) / 60000));
    }, 30000);
    return () => clearInterval(interval);
  }, [startTime]);

  // Use session cards when available (practice mode or continuation rounds), otherwise use fresh cards
  const activeCards = sessionCards.length > 0 ? sessionCards : cards;

  // Get the unique resource ID for single-resource sessions
  const sessionResourceId = useMemo(() => {
    if (resourceId) return resourceId;
    const ids = new Set(activeCards.map((c) => c.studyMaterialId));
    return ids.size === 1 ? activeCards[0]?.studyMaterialId : null;
  }, [resourceId, activeCards]);

  const markComplete = useMutation({
    mutationFn: async (resId: string) => {
      const res = await fetch(`/api/resources/${resId}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      if (!res.ok) throw new Error("Failed to mark as done");
      return res.json();
    },
    onSuccess: () => {
      setMarkedDone(true);
      queryClient.invalidateQueries({ queryKey: ["due-cards"] });
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast.success("Resource marked as done!");
    },
    onError: () => {
      toast.error("Failed to mark resource as done");
    },
  });

  const reviewCard = useMutation({
    mutationFn: async ({ cardId, rating }: { cardId: string; rating: Rating }) => {
      // In practice mode, skip API call for SRS updates
      if (practiceMode) {
        return { success: true };
      }
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
      setCardRatings((prev) => ({ ...prev, [variables.cardId]: variables.rating }));
      setReviewedCount((prev) => prev + 1);
      if (currentIndex < activeCards.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setIsFlipped(false);
      } else {
        // Round complete - check if we should continue with difficult cards
        const difficultCards = activeCards.filter((card) => {
          const latestRating = variables.cardId === card.id
            ? variables.rating
            : cardRatings[card.id];
          return latestRating === 1 || latestRating === 2;
        });

        if (difficultCards.length > 0 && !practiceMode) {
          // Build continuation deck: all difficult cards + 1-2 random good cards for reinforcement
          const goodCards = activeCards.filter((card) => {
            const latestRating = variables.cardId === card.id
              ? variables.rating
              : cardRatings[card.id];
            return latestRating === 3 || latestRating === 4;
          });

          const reinforcementCards = goodCards
            .sort(() => Math.random() - 0.5)
            .slice(0, Math.min(2, goodCards.length));

          const nextRoundCards = [...difficultCards, ...reinforcementCards]
            .sort(() => Math.random() - 0.5);

          setSessionCards(nextRoundCards);
          setContinuationRound((prev) => prev + 1);
          setShowContinuationBanner(true);
          setCurrentIndex(0);
          setIsFlipped(false);
        } else {
          setSessionComplete(true);
        }
      }
    },
  });

  const currentCard = activeCards[currentIndex];
  const progress = activeCards.length > 0 ? (reviewedCount / activeCards.length) * 100 : 0;
  const remainingCards = activeCards.length - currentIndex - 1;

  // Dismiss continuation banner after a delay
  useEffect(() => {
    if (showContinuationBanner) {
      const timer = setTimeout(() => setShowContinuationBanner(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showContinuationBanner]);

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

  const finishSession = useCallback(() => {
    setSessionComplete(true);
    setShowContinuationBanner(false);
  }, []);

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
    setContinuationRound(0);
    setShowContinuationBanner(false);
    setMarkedDone(false);

    if (practiceMode) {
      // In practice mode, shuffle cards with priority for difficult ones (rated 1-2)
      const shuffledCards = [...sessionCards].sort((a, b) => {
        const ratingA = cardRatings[a.id] || 3;
        const ratingB = cardRatings[b.id] || 3;
        // Prioritize cards with lower ratings (1-2 go first)
        if (ratingA <= 2 && ratingB > 2) return -1;
        if (ratingB <= 2 && ratingA > 2) return 1;
        // Shuffle within groups
        return Math.random() - 0.5;
      });
      setSessionCards(shuffledCards);
    } else {
      setSessionCards([]);
      setCardRatings({});
      queryClient.invalidateQueries({ queryKey: ["due-cards", resourceId] });
    }
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

  if (activeCards.length === 0) {
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
              {markedDone ? (
                <>
                  <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
                  <h2 className="text-3xl font-bold mb-2">Resource Complete!</h2>
                  <p className="text-muted-foreground">
                    You&apos;ve mastered this resource. It&apos;s been marked as done.
                  </p>
                </>
              ) : (
                <>
                  <Trophy className="h-16 w-16 mx-auto text-primary mb-4" />
                  <h2 className="text-3xl font-bold mb-2">Session Complete!</h2>
                  <p className="text-muted-foreground">
                    Great job! You reviewed {reviewedCount} card{reviewedCount !== 1 ? "s" : ""}.
                    {continuationRound > 0 && (
                      <> ({continuationRound} continuation round{continuationRound !== 1 ? "s" : ""})</>
                    )}
                  </p>
                </>
              )}
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
            <div className="flex justify-center gap-3 flex-wrap">
              <Button variant="outline" onClick={restartSession} size="lg">
                <RotateCcw className="mr-2 h-4 w-4" />
                Study Again
              </Button>
              {sessionResourceId && !markedDone && (
                <Button
                  variant="outline"
                  size="lg"
                  className="border-green-500/50 text-green-700 hover:bg-green-500/10 dark:text-green-400"
                  onClick={() => markComplete.mutate(sessionResourceId)}
                  disabled={markComplete.isPending}
                >
                  {markComplete.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Mark as Done
                </Button>
              )}
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
      {/* Continuation Banner */}
      {showContinuationBanner && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 flex items-center justify-between animate-slide-up">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <div>
              <p className="font-medium text-sm">
                Continuing with {activeCards.length} difficult card{activeCards.length !== 1 ? "s" : ""}...
              </p>
              <p className="text-xs text-muted-foreground">
                Round {continuationRound + 1} — cards rated Again or Hard will keep appearing
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={finishSession}>
            Finish Session
          </Button>
        </div>
      )}

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
                    {continuationRound > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        Round {continuationRound + 1}
                      </Badge>
                    )}
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
            <div className="flex items-center gap-2">
              <Switch
                id="practice-mode"
                checked={practiceMode}
                onCheckedChange={setPracticeMode}
              />
              <Label
                htmlFor="practice-mode"
                className={cn(
                  "text-sm cursor-pointer flex items-center gap-1",
                  practiceMode ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Repeat className="h-3 w-3" />
                Practice
              </Label>
            </div>
            {continuationRound > 0 && (
              <Button variant="outline" size="sm" onClick={finishSession}>
                Finish
              </Button>
            )}
            <Badge variant="outline" className="gap-1">
              <Target className="h-3 w-3" />
              {currentIndex + 1} / {activeCards.length}
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
          <span>{activeCards.length - reviewedCount} remaining</span>
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
