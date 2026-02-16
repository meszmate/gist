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
import { useLocale } from "@/hooks/use-locale";

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
  const { t } = useLocale();
  const [cards, setCards] = useState(flashcards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [results, setResults] = useState<Record<string, "correct" | "review">>({});
  const [isComplete, setIsComplete] = useState(false);
  const [startTime] = useState(() => Date.now());

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

  const markCard = useCallback((result: "correct" | "review") => {
    setResults((prev) => ({ ...prev, [currentCard.id]: result }));
    goToNext();
  }, [currentCard.id, goToNext]);

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
  }, [isComplete, isFlipped, goToNext, goToPrev, markCard]);

  if (isComplete) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-6 py-8">
        <div className="rounded-full bg-primary/10 w-20 h-20 flex items-center justify-center mx-auto">
          <Brain className="h-10 w-10 text-primary" />
        </div>
        <div>
          <h3 className="text-2xl font-bold">{t("flashcard.studyComplete")}</h3>
          <p className="text-muted-foreground mt-2">
            {t("flashcard.studiedCards", { count: cards.length })}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{correctCount}</p>
            <p className="text-sm text-muted-foreground">{t("flashcard.gotIt")}</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-amber-600">{reviewCount}</p>
            <p className="text-sm text-muted-foreground">{t("flashcard.needsReview")}</p>
          </div>
        </div>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={restart} variant="outline">
            <RotateCcw className="mr-2 h-4 w-4" />
            {t("flashcard.studyAgain")}
          </Button>
          <Button onClick={shuffleCards}>
            <Shuffle className="mr-2 h-4 w-4" />
            {t("flashcard.shuffleRestart")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="text-muted-foreground">
            {t("flashcard.cardOf", { current: currentIndex + 1, total: cards.length })}
          </span>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
                  {t("flashcard.question")}
                </Badge>
                <p className="text-xl font-medium">{currentCard.front}</p>
                <p className="text-sm text-muted-foreground">
                  {t("flashcard.clickToFlip")}
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
                  {t("flashcard.answer")}
                </Badge>
                <p className="text-xl">{currentCard.back}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="outline"
          onClick={goToPrev}
          disabled={currentIndex === 0}
          className="w-full sm:w-auto"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          {t("flashcard.previous")}
        </Button>

        {isFlipped ? (
          <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
            <Button
              variant="outline"
              className="border-green-500/30 text-green-700 hover:bg-green-500/10"
              onClick={() => markCard("correct")}
            >
              <Check className="mr-1 h-4 w-4" />
              {t("flashcard.gotIt")}
            </Button>
            <Button
              variant="outline"
              className="border-amber-500/30 text-amber-700 hover:bg-amber-500/10"
              onClick={() => markCard("review")}
            >
              <X className="mr-1 h-4 w-4" />
              {t("flashcard.needsReview")}
            </Button>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            {t("flashcard.tapToReveal")}
          </p>
        )}

        <Button variant="outline" onClick={goToNext} className="w-full sm:w-auto">
          {currentIndex === cards.length - 1 ? t("flashcard.finish") : t("quiz.next")}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
