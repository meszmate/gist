import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, BookOpen, Brain, FileQuestion } from 'lucide-react';
import Animate from '@/components/Animate';
import { useAuth } from '@/hooks/useAuth';

export function Landing() {
  const { t } = useTranslation();
  const { isAuthenticated, login, isLoading } = useAuth();

  // Show loading spinner while checking auth status
  if (isLoading) {
    return (
      <section className="relative min-h-[calc(100vh-120px)] overflow-hidden flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </section>
    );
  }

  return (
    <section className="relative min-h-[calc(100vh-120px)] overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-16 pb-16">
        <Animate>
          <div className="text-center">
            <Badge variant="secondary" className="mb-6 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200">
              <Sparkles className="w-4 h-4 mr-1" />
              {t('landing.badge')}
            </Badge>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold text-neutral-900 dark:text-neutral-100 mb-6 tracking-tight">
              {t('landing.title')}
            </h1>

            <p className="text-lg sm:text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto mb-10">
              {t('landing.subtitle')}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              {isAuthenticated ? (
                <>
                  <Button asChild size="lg" className="gap-2">
                    <Link to="/dashboard">
                      {t('landing.goToDashboard')}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="gap-2">
                    <Link to="/create">
                      <Sparkles className="h-4 w-4" />
                      {t('landing.createMaterials')}
                    </Link>
                  </Button>
                </>
              ) : (
                <Button
                  onClick={login}
                  size="lg"
                  className="gap-2"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  {t('landing.loginWithGoogle')}
                </Button>
              )}
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="flex flex-col items-center p-6 rounded-xl bg-white/50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
                  {t('landing.features.summaries')}
                </h3>
              </div>

              <div className="flex flex-col items-center p-6 rounded-xl bg-white/50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
                  {t('landing.features.flashcards')}
                </h3>
              </div>

              <div className="flex flex-col items-center p-6 rounded-xl bg-white/50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <FileQuestion className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
                  {t('landing.features.quizzes')}
                </h3>
              </div>
            </div>
          </div>
        </Animate>
      </div>
    </section>
  );
}
