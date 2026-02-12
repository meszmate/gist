"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, Sun, Moon, Globe } from "lucide-react";
import { GistLogo } from "@/components/icons/gist-logo";
import { useLocale } from "@/hooks/use-locale";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/types";

function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled aria-label="Toggle theme" className="h-9 w-9 rounded-full" />
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 rounded-full cursor-pointer"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {resolvedTheme === "dark" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </Button>
  );
}

function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
      <SelectTrigger className="w-auto gap-1.5 h-9 px-3 text-muted-foreground border-0 bg-transparent hover:bg-accent rounded-full cursor-pointer [&>svg:last-child]:hidden">
        <Globe className="h-4 w-4" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {LOCALES.map((l) => (
          <SelectItem key={l} value={l}>
            {LOCALE_LABELS[l]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const { t } = useLocale();

  return (
    <Button
      variant="outline"
      className="w-full h-12 text-[15px] font-medium cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
      onClick={() => signIn("google", { callbackUrl })}
    >
      <GoogleIcon />
      {t("login.continueWithGoogle")}
    </Button>
  );
}

function LoginButtonFallback() {
  const { t } = useLocale();

  return (
    <Button variant="outline" className="w-full h-12" disabled>
      <Loader2 className="h-5 w-5 animate-spin" />
      {t("common.loading")}
    </Button>
  );
}

export default function LoginPage() {
  const { t } = useLocale();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Atmospheric radial gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 38%, oklch(from var(--primary) l c h / 0.06), transparent)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-primary p-2">
              <GistLogo className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">gist</span>
          </div>
          <div className="flex items-center gap-0.5">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>

        {/* Centered auth */}
        <main className="flex-1 flex items-center justify-center px-4 pb-20">
          <div className="w-full max-w-[420px] animate-scale-in">

            {/* Auth card */}
            <Card className="shadow-lg border-border/60">
              <CardHeader className="text-center space-y-1.5 pb-2">
                <CardTitle className="text-2xl font-bold tracking-tight">
                  {t("login.welcomeBack")}
                </CardTitle>
                <CardDescription className="text-[15px]">
                  {t("login.signInContinue")}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 pb-6 space-y-5">
                <Suspense fallback={<LoginButtonFallback />}>
                  <LoginForm />
                </Suspense>

                <Separator />

                <p className="text-xs text-muted-foreground text-center leading-relaxed">
                  {t("login.termsText")}{" "}
                  <a
                    href="#"
                    className="underline underline-offset-2 hover:text-foreground transition-colors"
                  >
                    {t("login.termsOfService")}
                  </a>{" "}
                  {t("login.and")}{" "}
                  <a
                    href="#"
                    className="underline underline-offset-2 hover:text-foreground transition-colors"
                  >
                    {t("login.privacyPolicy")}
                  </a>
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
