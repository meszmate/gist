"use client";

import { Suspense, useSyncExternalStore } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sun, Moon, Globe, ArrowRight } from "lucide-react";
import { GistLogo } from "@/components/icons/gist-logo";
import { useLocale } from "@/hooks/use-locale";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/types";

function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled aria-label="Toggle theme" className="h-9 w-9 rounded-full" />
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 rounded-full cursor-pointer text-muted-foreground"
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
      className="group relative h-12 w-full justify-between rounded-full border-border bg-background px-5 text-sm font-medium shadow-sm transition-all hover:border-foreground/30 hover:bg-background hover:shadow-md cursor-pointer"
      onClick={() => signIn("google", { callbackUrl })}
    >
      <span className="flex items-center gap-3">
        <GoogleIcon />
        {t("login.continueWithGoogle")}
      </span>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Button>
  );
}

function LoginButtonFallback() {
  const { t } = useLocale();
  return (
    <Button
      variant="outline"
      className="h-12 w-full justify-center rounded-full text-sm"
      disabled
    >
      <Loader2 className="h-5 w-5 animate-spin" />
      {t("common.loading")}
    </Button>
  );
}

export default function LoginPage() {
  const { t } = useLocale();

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-background px-6">
      {/* Top bar overlay */}
      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-6 sm:p-8">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold transition-opacity hover:opacity-80"
        >
          <GistLogo className="h-6 w-6 text-foreground" />
          <span className="text-[15px] tracking-tight">gist</span>
        </Link>
        <div className="flex items-center gap-0.5">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      {/* Centered content */}
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <h1
          className="text-3xl font-semibold leading-tight tracking-[-0.02em] sm:text-4xl"
          style={{ margin: 0 }}
        >
          {t("login.welcomeBack")}
        </h1>

        <p
          className="text-base leading-relaxed text-muted-foreground"
          style={{ marginTop: 16, marginBottom: 0 }}
        >
          {t("login.signInContinue")}
        </p>

        <div className="w-full" style={{ marginTop: 32 }}>
          <Suspense fallback={<LoginButtonFallback />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
