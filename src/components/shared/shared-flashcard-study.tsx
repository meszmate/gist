"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Shuffle,
  Check,
  X,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

interface SharedFlashcardStudyProps {
  flashcards: Flashcard[];
  resourceId: string;
  token: string;
}

export function SharedFlashcardStudy({
  flashcards,
  resourceId,
  token,
}: SharedFlashcardStudyProps) {
  const [cards, setCards] = useState(flashcards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [results, setResults] = useState<Record<string, "correct" | "review">>({});
  const [isComplete, setIsComplete] = useState(false);
  const [startTime] = useState(Date.now());

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;
  const correctCount = Object.values(results).filter((r) => r === "correct").length;
  const reviewCount = Object.values(results).filter((r) => r === "review").length;

  const goToNext = useCallback(() => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((i) => i + 1);
      setIsFlipped(false);
    } else {
      setIsComplete(true);
      // Log study session
      const timeSpent = Math.round((Date.now() - startTime) / 1000);
      fetch(`/api/shared/${token}/study`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceId,
          cardsStudied: cards.length,
          cardsCorrect: correctCount,
          timeSpentSeconds: timeSpent,
        }),
      }).catch(() => {});
    }
  }, [currentIndex, cards.length, token, resourceId, correctCount, startTime]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setIsFlipped(false);
    }
  }, [currentIndex]);

  const markCard = (result: "correct" | "review") => {
    setResults((prev) => ({ ...prev, [currentCard.id]: result }));
    goToNext();
  };

  const shuffleCards = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setResults({});
    setIsComplete(false);
  };

  const restart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setResults({});
    setIsComplete(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isComplete) return;
      switch (e.key) {
        case " ":
        case "Enter":
          e.preventDefault();
          setIsFlipped((f) => !f);
          break;
        case "ArrowLeft":
          e.preventDefault();
          goToPrev();
          break;
        case "ArrowRight":
          e.preventDefault();
          if (isFlipped) goToNext();
          break;
        case "1":
          if (isFlipped) markCard("correct");
          break;
        case "2":
          if (isFlipped) markCard("review");
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isComplete, isFlipped, goToNext, goToPrev]);

  if (isComplete) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-6 py-8">
        <div className="rounded-full bg-primary/10 w-20 h-20 flex items-center justify-center mx-auto">
          <Brain className="h-10 w-10 text-primary" />
        </div>
        <div>
          <h3 className="text-2xl font-bold">Study Complete!</h3>
          <p className="text-muted-foreground mt-2">
            You studied {cards.length} cards
          </p>
        </div>
        <div className="flex justify-center gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{correctCount}</p>
            <p className="text-sm text-muted-foreground">Got it</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-amber-600">{reviewCount}</p>
            <p className="text-sm text-muted-foreground">Needs review</p>
          </div>
        </div>
        <div className="flex justify-center gap-3">
          <Button onClick={restart} variant="outline">
            <RotateCcw className="mr-2 h-4 w-4" />
            Study Again
          </Button>
          <Button onClick={shuffleCards}>
            <Shuffle className="mr-2 h-4 w-4" />
            Shuffle & Restart
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Card {currentIndex + 1} of {cards.length}
          </span>
          <div className="flex items-center gap-3">
            {correctCount > 0 && (
              <Badge
                variant="outline"
                className="bg-green-500/10 text-green-700"
              >
                <Check className="mr-1 h-3 w-3" />
                {correctCount}
              </Badge>
            )}
            {reviewCount > 0 && (
              <Badge
                variant="outline"
                className="bg-amber-500/10 text-amber-700"
              >
                <X className="mr-1 h-3 w-3" />
                {reviewCount}
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={shuffleCards}>
              <Shuffle className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Card */}
      <div
        className="perspective-1000 cursor-pointer"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div
          className={cn(
            "relative transition-transform duration-500 transform-style-3d min-h-[250px]",
            isFlipped && "[transform:rotateY(180deg)]"
          )}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Front */}
          <Card
            className="absolute inset-0 backface-hidden"
            style={{ backfaceVisibility: "hidden" }}
          >
            <CardContent className="flex items-center justify-center min-h-[250px] p-8">
              <div className="text-center space-y-3">
                <Badge variant="secondary" className="mb-4">
                  Question
                </Badge>
                <p className="text-xl font-medium">{currentCard.front}</p>
                <p className="text-sm text-muted-foreground">
                  Click or press Space to flip
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Back */}
          <Card
            className="absolute inset-0"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <CardContent className="flex items-center justify-center min-h-[250px] p-8">
              <div className="text-center space-y-3">
                <Badge
                  variant="secondary"
                  className="mb-4 bg-primary/10 text-primary"
                >
                  Answer
                </Badge>
                <p className="text-xl">{currentCard.back}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={goToPrev}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Previous
        </Button>

        {isFlipped ? (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="border-green-500/30 text-green-700 hover:bg-green-500/10"
              onClick={() => markCard("correct")}
            >
              <Check className="mr-1 h-4 w-4" />
              Got it
            </Button>
            <Button
              variant="outline"
              className="border-amber-500/30 text-amber-700 hover:bg-amber-500/10"
              onClick={() => markCard("review")}
            >
              <X className="mr-1 h-4 w-4" />
              Needs review
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Tap card to reveal answer
          </p>
        )}

        <Button variant="outline" onClick={goToNext}>
          {currentIndex === cards.length - 1 ? "Finish" : "Next"}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
