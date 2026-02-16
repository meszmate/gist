"use client";

import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import {
  LogOut,
  User,
  Keyboard,
  Palette,
  Database,
  Moon,
  Sun,
  Monitor,
  Check,
  Globe,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  useColorTheme,
  type ColorTheme,
} from "@/hooks/use-color-theme";
import { useLocale } from "@/hooks/use-locale";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/types";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const { colorTheme, setColorTheme } = useColorTheme();
  const { t, locale, setLocale } = useLocale();
  const [activeTab, setActiveTab] = useState("profile");
  const user = session?.user;

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const shortcuts = [
    { keys: ["?"], description: t("keyboard.showShortcuts") },
    { keys: ["j"], description: t("keyboard.navigateDown") },
    { keys: ["k"], description: t("keyboard.navigateUp") },
    { keys: ["Enter"], description: t("keyboard.selectConfirm") },
    { keys: ["/"], description: t("keyboard.openSearch") },
    { keys: ["Esc"], description: t("keyboard.closeDialogs") },
    { keys: ["h"], description: t("keyboard.previousTab") },
    { keys: ["l"], description: t("keyboard.nextTab") },
    { keys: ["Space"], description: t("keyboard.flipFlashcard") },
    { keys: ["1", "2", "3", "4"], description: t("keyboard.rateFlashcard") },
    { keys: ["\u2318", "K"], description: t("keyboard.openCommandMenu") },
  ];

  const themeOptions = [
    { value: "light", label: t("settings.light"), icon: Sun },
    { value: "dark", label: t("settings.dark"), icon: Moon },
    { value: "system", label: t("settings.system"), icon: Monitor },
  ];

  const colorSwatches: { value: ColorTheme; label: string; color: string }[] = [
    { value: "neutral", label: t("settings.neutral"), color: "oklch(0.729 0.047 77)" },
    { value: "blue", label: t("settings.blue"), color: "oklch(0.55 0.2 250)" },
    { value: "violet", label: t("settings.violet"), color: "oklch(0.55 0.22 290)" },
    { value: "green", label: t("settings.green"), color: "oklch(0.55 0.17 155)" },
    { value: "rose", label: t("settings.rose"), color: "oklch(0.55 0.2 10)" },
    { value: "orange", label: t("settings.orange"), color: "oklch(0.55 0.17 50)" },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title={t("settings.title")}
        description={t("settings.description")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("settings.title") },
        ]}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">{t("settings.profile")}</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">{t("settings.appearance")}</span>
          </TabsTrigger>
          <TabsTrigger value="keyboard" className="gap-2">
            <Keyboard className="h-4 w-4" />
            <span className="hidden sm:inline">{t("settings.keyboard")}</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">{t("settings.data")}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="w-full overflow-hidden space-y-6 mt-6 animate-fade-in">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                {t("settings.account")}
              </CardTitle>
              <CardDescription>{t("settings.accountDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? ""} />
                  <AvatarFallback className="text-xl">{initials || "U"}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold">{user?.name}</h3>
                  <p className="text-muted-foreground">{user?.email}</p>
                  <Badge variant="secondary" className="mt-2">
                    {t("settings.googleAccount")}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">{t("settings.dangerZone")}</CardTitle>
              <CardDescription>{t("settings.irreversibleActions")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={() => signOut({ callbackUrl: "/" })}
                size="lg"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t("settings.signOut")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="w-full overflow-hidden space-y-6 mt-6 animate-fade-in">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                {t("settings.language")}
              </CardTitle>
              <CardDescription>
                {t("settings.languageDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {LOCALES.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => setLocale(loc)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all hover:border-primary/50",
                      locale === loc
                        ? "border-primary bg-primary/5"
                        : "border-muted"
                    )}
                  >
                    <span className="font-medium">{LOCALE_LABELS[loc]}</span>
                    {locale === loc && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                {t("settings.theme")}
              </CardTitle>
              <CardDescription>
                {t("settings.themeDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {themeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      "flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all hover:border-primary/50",
                      theme === option.value
                        ? "border-primary bg-primary/5"
                        : "border-muted"
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-full p-3",
                        theme === option.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <option.icon className="h-6 w-6" />
                    </div>
                    <span className="font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                {t("settings.color")}
              </CardTitle>
              <CardDescription>
                {t("settings.colorDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {colorSwatches.map((swatch) => (
                  <button
                    key={swatch.value}
                    onClick={() => setColorTheme(swatch.value)}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div
                      className={cn(
                        "relative h-10 w-10 rounded-full transition-all",
                        colorTheme === swatch.value
                          ? "ring-2 ring-offset-2 ring-offset-background ring-primary"
                          : "hover:ring-2 hover:ring-offset-2 hover:ring-offset-background hover:ring-muted-foreground/30"
                      )}
                      style={{ backgroundColor: swatch.color }}
                    >
                      {colorTheme === swatch.value && (
                        <Check className="absolute inset-0 m-auto h-5 w-5 text-white" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-xs",
                        colorTheme === swatch.value
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {swatch.label}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("settings.previewTitle")}</CardTitle>
              <CardDescription>
                {t("settings.previewDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Button>{t("settings.primary")}</Button>
                  <Button variant="secondary">{t("settings.secondary")}</Button>
                  <Button variant="outline">{t("settings.outline")}</Button>
                  <Button variant="destructive">{t("settings.destructive")}</Button>
                </div>
                <div className="flex gap-2">
                  <Badge>{t("settings.default")}</Badge>
                  <Badge variant="secondary">{t("settings.secondary")}</Badge>
                  <Badge variant="outline">{t("settings.outline")}</Badge>
                  <Badge variant="destructive">{t("settings.destructive")}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="keyboard" className="w-full overflow-hidden space-y-6 mt-6 animate-fade-in">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Keyboard className="h-5 w-5 text-primary" />
                {t("settings.keyboardShortcuts")}
              </CardTitle>
              <CardDescription>
                {t("keyboard.vimDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center justify-between py-3 px-4 rounded-lg hover:bg-muted/50 transition-colors animate-slide-up",
                    )}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <kbd
                          key={keyIndex}
                          className="px-2.5 py-1.5 text-sm font-mono bg-muted rounded border shadow-sm min-w-[2rem] text-center"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <Keyboard className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{t("common.proTip")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("keyboard.pressAnywhere", { key: "?" })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="w-full overflow-hidden space-y-6 mt-6 animate-fade-in">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                {t("settings.yourData")}
              </CardTitle>
              <CardDescription>
                {t("settings.yourDataDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <h4 className="font-medium">{t("settings.exportData")}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.exportDataDescription")}
                  </p>
                </div>
                <Button variant="outline" disabled>
                  {t("common.comingSoon")}
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <h4 className="font-medium">{t("settings.importData")}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.importDataDescription")}
                  </p>
                </div>
                <Button variant="outline" disabled>
                  {t("common.comingSoon")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-destructive">{t("settings.deleteAccount")}</CardTitle>
              <CardDescription>
                {t("settings.deleteAccountDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="text-destructive hover:bg-destructive/10" disabled>
                {t("settings.deleteAccountButton")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
