"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Brain,
  BookOpen,
  FileQuestion,
  Sparkles,
  Users,
  Keyboard,
  ArrowRight,
  Github,
  Star,
} from "lucide-react";
import { GistLogo } from "@/components/icons/gist-logo";
import { useLocale } from "@/hooks/use-locale";

export default function LandingPage() {
  const { t } = useLocale();

  const features = [
    {
      icon: Sparkles,
      title: t("landing.aiGeneration"),
      description: t("landing.aiGenerationDesc"),
    },
    {
      icon: Brain,
      title: t("landing.spacedRepetition"),
      description: t("landing.spacedRepetitionDesc"),
    },
    {
      icon: FileQuestion,
      title: t("landing.interactiveQuizzes"),
      description: t("landing.interactiveQuizzesDesc"),
    },
    {
      icon: Keyboard,
      title: t("landing.vimNav"),
      description: t("landing.vimNavDesc"),
    },
    {
      icon: Users,
      title: t("landing.shareCollab"),
      description: t("landing.shareCollabDesc"),
    },
    {
      icon: BookOpen,
      title: t("landing.organizedLibrary"),
      description: t("landing.organizedLibraryDesc"),
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <GistLogo className="h-6 w-6" />
            gist
          </Link>
          <div className="flex items-center gap-4">
            {process.env.NEXT_PUBLIC_REPOSITORY_URL && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={process.env.NEXT_PUBLIC_REPOSITORY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="h-4 w-4" />
                  <Star className="h-3 w-3" />
                  {t("landing.star")}
                </a>
              </Button>
            )}
            <Button variant="ghost" asChild>
              <Link href="/login">{t("landing.signIn")}</Link>
            </Button>
            <Button asChild>
              <Link href="/login">{t("landing.getStarted")}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4">
        <div className="container max-w-4xl text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            {(() => {
              const parts = t("landing.heroTitle", { highlight: "__SPLIT__" }).split("__SPLIT__");
              return (
                <>
                  {parts[0]}
                  <span className="text-primary">{t("landing.heroHighlight")}</span>
                  {parts[1]}
                </>
              );
            })()}
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t("landing.heroDescription")}
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/login">
                {t("landing.startLearning")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#features">{t("landing.learnMore")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 bg-muted/50">
        <div className="container max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              {t("landing.featuresTitle")}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t("landing.featuresDescription")}
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardContent className="pt-6">
                  <feature.icon className="h-10 w-10 text-primary mb-4" />
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4">
        <div className="container max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t("landing.howItWorks")}</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-primary">1</span>
              </div>
              <h3 className="font-semibold mb-2">{t("landing.step1Title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("landing.step1Desc")}
              </p>
            </div>
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-primary">2</span>
              </div>
              <h3 className="font-semibold mb-2">{t("landing.step2Title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("landing.step2Desc")}
              </p>
            </div>
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-primary">3</span>
              </div>
              <h3 className="font-semibold mb-2">{t("landing.step3Title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("landing.step3Desc")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container max-w-2xl text-center">
          <h2 className="text-3xl font-bold mb-4">{t("landing.ctaTitle")}</h2>
          <p className="mb-8 opacity-90">
            {t("landing.ctaDescription")}
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/login">
              {t("landing.getStartedFree")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <GistLogo className="h-4 w-4" />
            gist
          </div>
          <p className="text-sm text-muted-foreground">
            {t("landing.builtWith")}
          </p>
        </div>
      </footer>
    </div>
  );
}
