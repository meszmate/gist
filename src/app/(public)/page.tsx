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
} from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Generation",
    description:
      "Generate summaries, flashcards, and quizzes from any text using advanced AI.",
  },
  {
    icon: Brain,
    title: "Spaced Repetition",
    description:
      "Learn efficiently with SM-2 algorithm that optimizes your review schedule.",
  },
  {
    icon: FileQuestion,
    title: "Interactive Quizzes",
    description:
      "Test your knowledge with auto-generated multiple-choice questions.",
  },
  {
    icon: Keyboard,
    title: "Vim-Style Navigation",
    description:
      "Navigate quickly with keyboard shortcuts inspired by Vim.",
  },
  {
    icon: Users,
    title: "Share & Collaborate",
    description:
      "Share resources with students and track their progress.",
  },
  {
    icon: BookOpen,
    title: "Organized Library",
    description:
      "Keep your study materials organized with folders and tags.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Brain className="h-6 w-6" />
            SmartNotes
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/login">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4">
        <div className="container max-w-4xl text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Study Smarter with{" "}
            <span className="text-primary">AI-Powered</span> Learning
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Transform any text into flashcards, quizzes, and summaries. Learn
            efficiently with spaced repetition and vim-style keyboard navigation.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/login">
                Start Learning
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#features">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 bg-muted/50">
        <div className="container max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Everything you need to learn effectively
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              SmartNotes combines AI content generation with proven learning
              techniques to help you master any subject.
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
            <h2 className="text-3xl font-bold mb-4">How it works</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-primary">1</span>
              </div>
              <h3 className="font-semibold mb-2">Add Your Content</h3>
              <p className="text-sm text-muted-foreground">
                Paste lecture notes, textbook excerpts, or any study material.
              </p>
            </div>
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-primary">2</span>
              </div>
              <h3 className="font-semibold mb-2">Generate with AI</h3>
              <p className="text-sm text-muted-foreground">
                AI creates summaries, flashcards, and quiz questions instantly.
              </p>
            </div>
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-primary">3</span>
              </div>
              <h3 className="font-semibold mb-2">Study & Review</h3>
              <p className="text-sm text-muted-foreground">
                Use spaced repetition to memorize effectively over time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container max-w-2xl text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to study smarter?</h2>
          <p className="mb-8 opacity-90">
            Join thousands of students using SmartNotes to learn more efficiently.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/login">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Brain className="h-4 w-4" />
            SmartNotes
          </div>
          <p className="text-sm text-muted-foreground">
            Built with Next.js, shadcn/ui, and OpenAI
          </p>
        </div>
      </footer>
    </div>
  );
}
