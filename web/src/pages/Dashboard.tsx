import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Brain,
  Trophy,
  Clock,
  Flame,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { formatDuration } from '@/lib/i18n';
import { useAnalyticsOverview, useSrsStats } from '@/lib/queries';

export function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: overview, isLoading: isOverviewLoading } = useAnalyticsOverview();
  const { data: srsStats, isLoading: isSrsLoading } = useSrsStats();

  const isLoading = isOverviewLoading || isSrsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          {t('dashboard.welcome')}, {user?.name?.split(' ')[0]}!
        </h1>
        <p className="text-muted-foreground mt-1">{t('dashboard.todayProgress')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.cardsReviewed')}
            </CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview?.cards_reviewed_today || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {overview?.due_cards_count || 0} {t('dashboard.dueForReview')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.currentStreak')}
            </CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview?.current_streak || 0} {t('dashboard.days')}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.longestStreak')}: {overview?.longest_streak || 0} {t('dashboard.days')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('analytics.averageScore')}
            </CardTitle>
            <Trophy className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(overview?.average_quiz_score || 0)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {overview?.total_quizzes || 0} {t('analytics.totalQuizzes').toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.studyTime')}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(overview?.total_study_time || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {overview?.total_materials || 0} {t('analytics.totalMaterials').toLowerCase()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {srsStats && srsStats.due_today > 0 && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-primary" />
                {t('srs.dueCards')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                {srsStats.due_today} {t('srs.dueCards').toLowerCase()}
              </p>
              <Link to="/study">
                <Button className="w-full">
                  {t('srs.study')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {t('library.myMaterials')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {overview?.total_materials || 0} {t('analytics.totalMaterials').toLowerCase()}
            </p>
            <Link to="/library">
              <Button variant="outline" className="w-full">
                {t('nav.library')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              {t('srs.stats.totalCards')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('srs.stats.newCards')}</span>
                <span>{srsStats?.new_cards || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('srs.stats.learned')}</span>
                <span>{srsStats?.learned_cards || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('srs.stats.mature')}</span>
                <span>{srsStats?.mature_cards || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
