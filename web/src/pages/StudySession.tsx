import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, RotateCcw, CheckCircle2 } from 'lucide-react';
import type { Flashcard } from '@/lib/api';
import { useFlashcardShortcuts } from '@/hooks/useKeyboardShortcuts';
import toast from 'react-hot-toast';
import { useDueCards, useReviewCard } from '@/lib/queries';

type Rating = 0 | 1 | 2 | 3;

interface RatingOption {
  rating: Rating;
  label: string;
  description: string;
  color: string;
  key: string;
}

export function StudySession() {
  const { t } = useTranslation();
  const { materialId } = useParams();
  const navigate = useNavigate();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  // TanStack Query hooks
  const { data: dueCardsData, isLoading, refetch } = useDueCards(materialId);
  const reviewCard = useReviewCard();

  const cards: Flashcard[] = dueCardsData?.cards || [];
  const totalDue = dueCardsData?.total_due || 0;

  const ratingOptions: RatingOption[] = [
    {
      rating: 0,
      label: t('srs.rating.again'),
      description: t('srs.ratingDesc.again'),
      color: 'bg-red-500 hover:bg-red-600',
      key: '1',
    },
    {
      rating: 1,
      label: t('srs.rating.hard'),
      description: t('srs.ratingDesc.hard'),
      color: 'bg-orange-500 hover:bg-orange-600',
      key: '2',
    },
    {
      rating: 2,
      label: t('srs.rating.good'),
      description: t('srs.ratingDesc.good'),
      color: 'bg-green-500 hover:bg-green-600',
      key: '3',
    },
    {
      rating: 3,
      label: t('srs.rating.easy'),
      description: t('srs.ratingDesc.easy'),
      color: 'bg-blue-500 hover:bg-blue-600',
      key: '4',
    },
  ];

  const currentCard = cards[currentIndex];

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleRate = useCallback(
    async (rating: Rating) => {
      if (!currentCard) return;

      try {
        await reviewCard.mutateAsync({ cardId: currentCard.id, rating });
        setReviewedCount((prev) => prev + 1);

        // Move to next card
        if (currentIndex < cards.length - 1) {
          setCurrentIndex((prev) => prev + 1);
          setIsFlipped(false);
        } else {
          // All cards reviewed
          toast.success(t('srs.allCaughtUp'));
        }
      } catch {
        toast.error(t('errors.generic'));
      }
    },
    [currentCard, currentIndex, cards.length, t, reviewCard]
  );

  const handleNext = useCallback(() => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    }
  }, [currentIndex, cards.length]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsFlipped(false);
    }
  }, [currentIndex]);

  // Keyboard shortcuts
  useFlashcardShortcuts({
    onFlip: handleFlip,
    onNext: handleNext,
    onPrevious: handlePrevious,
    onRateAgain: () => handleRate(0),
    onRateHard: () => handleRate(1),
    onRateGood: () => handleRate(2),
    onRateEasy: () => handleRate(3),
    enabled: isFlipped,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (cards.length === 0 || currentIndex >= cards.length) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Card className="max-w-lg mx-auto text-center py-12">
          <CardContent>
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">{t('srs.allCaughtUp')}</h2>
            <p className="text-muted-foreground mb-6">
              {reviewedCount > 0
                ? `${reviewedCount} ${t('dashboard.cardsReviewed').toLowerCase()}`
                : t('srs.noDueCards')}
            </p>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('common.back')}
              </Button>
              <Button onClick={() => refetch()}>
                <RotateCcw className="mr-2 h-4 w-4" />
                {t('common.refresh') || 'Refresh'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.back')}
        </Button>
        <div className="text-sm text-muted-foreground">
          {currentIndex + 1} / {cards.length} ({totalDue} {t('srs.dueCards').toLowerCase()})
        </div>
      </div>

      {/* Progress */}
      <Progress value={(reviewedCount / totalDue) * 100} className="mb-8" />

      {/* Flashcard */}
      <div className="max-w-2xl mx-auto">
        <div
          className="relative h-80 cursor-pointer perspective-1000"
          onClick={handleFlip}
        >
          <Card
            className={`absolute inset-0 transition-transform duration-500 backface-hidden ${
              isFlipped ? 'rotate-y-180' : ''
            }`}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <CardContent className="flex items-center justify-center h-full p-8">
              <div className="text-center">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
                  {t('viewer.question')}
                </p>
                <p className="text-xl">{currentCard.question}</p>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`absolute inset-0 transition-transform duration-500 backface-hidden rotate-y-180 ${
              isFlipped ? 'rotate-y-0' : ''
            }`}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <CardContent className="flex items-center justify-center h-full p-8 bg-primary/5">
              <div className="text-center">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
                  {t('viewer.answer')}
                </p>
                <p className="text-xl">{currentCard.answer}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          {t('viewer.flipCard')} ({t('common.space') || 'Space'})
        </p>

        {/* Rating Buttons */}
        {isFlipped && (
          <div className="grid grid-cols-4 gap-3 mt-8">
            {ratingOptions.map((option) => (
              <Button
                key={option.rating}
                onClick={() => handleRate(option.rating)}
                className={`${option.color} text-white flex flex-col h-auto py-3`}
              >
                <span className="font-medium">{option.label}</span>
                <span className="text-xs opacity-80">[{option.key}]</span>
              </Button>
            ))}
          </div>
        )}

        {/* Keyboard shortcuts help */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            Space: {t('viewer.flipCard')} | 1-4: {t('srs.rating.again')}/{t('srs.rating.hard')}/{t('srs.rating.good')}/{t('srs.rating.easy')}
          </p>
        </div>
      </div>
    </div>
  );
}
