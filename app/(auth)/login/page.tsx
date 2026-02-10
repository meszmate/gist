"use client";

import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, BookOpen, Sparkles, Target } from "lucide-react";
import { GistLogo } from "@/components/icons/gist-logo";

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered",
    description: "Generate flashcards and quizzes from any content",
  },
  {
    icon: BookOpen,
    title: "Spaced Repetition",
    description: "Learn efficiently with scientifically-proven methods",
  },
  {
    icon: Target,
    title: "Track Progress",
    description: "Monitor your learning journey with detailed analytics",
  },
];

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  return (
    <Button
      className="w-full h-12 text-base"
      size="lg"
      onClick={() => signIn("google", { callbackUrl })}
    >
      <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="currentColor"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="currentColor"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="currentColor"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      Continue with Google
    </Button>
  );
}

function LoginButtonFallback() {
  return (
    <Button className="w-full h-12" size="lg" disabled>
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      Loading...
    </Button>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left side - Features */}
      <div className="hidden lg:flex flex-col justify-center p-12 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <div className="max-w-md mx-auto space-y-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-xl bg-primary p-2.5">
                <GistLogo className="h-7 w-7 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold">gist</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">
              Study smarter,
              <br />
              <span className="text-primary">not harder</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Transform any content into interactive study materials with AI
            </p>
          </div>

          <div className="space-y-4">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="flex items-start gap-4 p-4 rounded-lg bg-background/50 backdrop-blur-sm border animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="rounded-lg bg-primary/10 p-2.5 shrink-0">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-muted border-2 border-background"
                />
              ))}
            </div>
            <span>Join 1,000+ students already learning smarter</span>
          </div>
        </div>
      </div>

      {/* Right side - Login */}
      <div className="flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md border-0 shadow-none lg:shadow-lg lg:border animate-fade-in">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center lg:hidden mb-2">
              <div className="rounded-xl bg-primary p-3">
                <GistLogo className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl lg:text-3xl">
                Welcome back
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Sign in to continue your learning journey
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Suspense fallback={<LoginButtonFallback />}>
              <LoginForm />
            </Suspense>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Secure authentication
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <svg
                  className="h-4 w-4 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>No password required</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <svg
                  className="h-4 w-4 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Your data stays private</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              By signing in, you agree to our{" "}
              <a href="#" className="underline hover:text-primary">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="underline hover:text-primary">
                Privacy Policy
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
