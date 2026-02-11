"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Folder,
  MoreVertical,
  Trash2,
  Share2,
  Edit,
  Grid3X3,
  List,
  Clock,
  Brain,
  FileQuestion,
  SortAsc,
  Lock,
  Users2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { useVimNavigation } from "@/lib/hooks/use-vim-navigation";
import { useVimContext } from "@/components/keyboard/vim-navigation-provider";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";
import Link from "next/link";

interface Resource {
  id: string;
  title: string;
  description: string | null;
  difficulty: string | null;
  completedAt: string | null;
  createdAt: string;
  flashcardCount: number;
  quizQuestionCount: number;
  folder?: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  isOwned: boolean;
  permission?: string | null;
  ownerName?: string | null;
}

async function fetchResources(): Promise<Resource[]> {
  const res = await fetch("/api/resources");
  if (!res.ok) throw new Error("Failed to fetch resources");
  return res.json();
}

type ViewMode = "grid" | "list";
type SortOption = "recent" | "name" | "cards";
type FilterOption = "all" | "owned" | "shared" | "completed";

export default function LibraryPage() {
  const router = useRouter();
  const { t, formatDate: formatDateLocale } = useLocale();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [folderFilter, setFolderFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<FilterOption>("all");
  const { searchOpen, setSearchOpen } = useVimContext();

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ["resources"],
    queryFn: fetchResources,
  });

  // Get unique folders
  const folders = Array.from(
    new Map(
      resources
        .filter((r) => r.folder)
        .map((r) => [r.folder!.id, r.folder!])
    ).values()
  );

  // Filter and sort resources
  const filteredResources = resources
    .filter((r) => {
      const matchesSearch =
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.description?.toLowerCase().includes(search.toLowerCase());
      const matchesFolder =
        folderFilter === "all" || r.folder?.id === folderFilter;
      const matchesOwner =
        ownerFilter === "all" ||
        (ownerFilter === "owned" && r.isOwned) ||
        (ownerFilter === "shared" && !r.isOwned) ||
        (ownerFilter === "completed" && r.completedAt);
      return matchesSearch && matchesFolder && matchesOwner;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.title.localeCompare(b.title);
        case "cards":
          return b.flashcardCount - a.flashcardCount;
        case "recent":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  const { selectedIndex, setSelectedIndex } = useVimNavigation({
    itemCount: filteredResources.length,
    onSelect: (index) => {
      const resource = filteredResources[index];
      if (resource) {
        router.push(`/library/${resource.id}`);
      }
    },
    enabled: !searchOpen,
  });

  const getDifficultyColor = (difficulty: string | null) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "intermediate":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      case "advanced":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getDifficultyLabel = (difficulty: string | null) => {
    switch (difficulty) {
      case "beginner":
        return t("common.difficulty.beginner");
      case "intermediate":
        return t("common.difficulty.intermediate");
      case "advanced":
        return t("common.difficulty.advanced");
      default:
        return difficulty;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t("common.today");
    if (diffDays === 1) return t("common.yesterday");
    if (diffDays < 7) return t("common.daysAgo", { count: diffDays });
    return formatDateLocale(date, { month: "short", day: "numeric" });
  };

  const savedCount = resources.filter((r) => !r.isOwned).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("library.title")}
        description={t("library.description")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("nav.library") },
        ]}
        actions={
          <Button asChild>
            <Link href="/create">
              <Plus className="mr-2 h-4 w-4" />
              {t("library.createResource")}
            </Link>
          </Button>
        }
      />

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("library.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            autoFocus={searchOpen}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setSearchOpen(false)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={ownerFilter} onValueChange={(v) => setOwnerFilter(v as FilterOption)}>
            <SelectTrigger className="w-[150px]">
              <Users2 className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("library.allResources")}</SelectItem>
              <SelectItem value="owned">{t("library.myResources")}</SelectItem>
              {savedCount > 0 && (
                <SelectItem value="shared">{t("library.sharedWithMe")}</SelectItem>
              )}
              <SelectItem value="completed">{t("library.completed")}</SelectItem>
            </SelectContent>
          </Select>

          {folders.length > 0 && (
            <Select value={folderFilter} onValueChange={setFolderFilter}>
              <SelectTrigger className="w-[140px]">
                <Folder className="mr-2 h-4 w-4" />
                <SelectValue placeholder={t("library.allFolders")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("library.allFolders")}</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[130px]">
              <SortAsc className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">{t("library.mostRecent")}</SelectItem>
              <SelectItem value="name">{t("library.name")}</SelectItem>
              <SelectItem value="cards">{t("library.mostCards")}</SelectItem>
            </SelectContent>
          </Select>

          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as ViewMode)}
          >
            <ToggleGroupItem value="grid" aria-label={t("library.gridView")}>
              <Grid3X3 className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label={t("library.listView")}>
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Results count */}
      {!isLoading && filteredResources.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {t("library.showingResults", { count: filteredResources.length })}
          {search && ` ${t("library.matchingSearch", { search })}`}
        </p>
      )}

      {isLoading ? (
        <div
          className={cn(
            "gap-4",
            viewMode === "grid"
              ? "grid md:grid-cols-2 lg:grid-cols-3"
              : "flex flex-col"
          )}
        >
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded mb-2" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredResources.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-12 w-12" />}
          title={t("library.noResourcesFound")}
          description={
            search
              ? t("library.adjustSearch")
              : t("library.getStarted")
          }
          action={
            !search
              ? {
                  label: t("library.createResource"),
                  href: "/create",
                  icon: <Plus className="mr-2 h-4 w-4" />,
                }
              : undefined
          }
        />
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredResources.map((resource, index) => (
            <HoverCard key={resource.id} openDelay={300} closeDelay={100}>
              <HoverCardTrigger asChild>
                <Card
                  className={cn(
                    "cursor-pointer transition-all duration-200 card-hover animate-scale-in",
                    selectedIndex === index && "border-primary ring-2 ring-primary ring-offset-2",
                    resource.completedAt && "border-green-500/30 opacity-80"
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                  onClick={() => router.push(`/library/${resource.id}`)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold truncate flex-1 pr-2 text-lg">
                        {resource.title}
                      </h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/library/${resource.id}`);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            {t("common.viewDetails")}
                          </DropdownMenuItem>
                          {resource.isOwned && (
                            <>
                              <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                                <Share2 className="mr-2 h-4 w-4" />
                                {t("common.share")}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t("common.delete")}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {resource.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {resource.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      {resource.completedAt && (
                        <Badge variant="secondary" className="gap-1 text-xs bg-green-500/10 text-green-700 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3" />
                          {t("common.done")}
                        </Badge>
                      )}
                      {!resource.isOwned && (
                        <Badge variant="secondary" className="gap-1 text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400">
                          <Users2 className="h-3 w-3" />
                          {t("common.sharedWithYou")}
                        </Badge>
                      )}
                      {!resource.isOwned && resource.permission === "read" && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Lock className="h-3 w-3" />
                          {t("common.readOnly")}
                        </Badge>
                      )}
                      {resource.folder && (
                        <Badge variant="outline" className="gap-1">
                          <Folder className="h-3 w-3" />
                          {resource.folder.name}
                        </Badge>
                      )}
                      {resource.difficulty && (
                        <Badge className={getDifficultyColor(resource.difficulty)}>
                          {getDifficultyLabel(resource.difficulty)}
                        </Badge>
                      )}
                    </div>

                    {!resource.isOwned && resource.ownerName && (
                      <p className="text-xs text-muted-foreground mb-2">
                        {t("common.by", { name: resource.ownerName })}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-3">
                        {resource.flashcardCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Brain className="h-3.5 w-3.5" />
                            {resource.flashcardCount}
                          </span>
                        )}
                        {resource.quizQuestionCount > 0 && (
                          <span className="flex items-center gap-1">
                            <FileQuestion className="h-3.5 w-3.5" />
                            {resource.quizQuestionCount}
                          </span>
                        )}
                      </div>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDate(resource.createdAt)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </HoverCardTrigger>
              <HoverCardContent className="w-80" side="right">
                <div className="space-y-3">
                  <h4 className="font-semibold">{resource.title}</h4>
                  {resource.description && (
                    <p className="text-sm text-muted-foreground">
                      {resource.description}
                    </p>
                  )}
                  {!resource.isOwned && resource.ownerName && (
                    <p className="text-sm text-muted-foreground">
                      {t("common.sharedBy", { name: resource.ownerName })}
                    </p>
                  )}
                  <div className="flex gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">{t("library.flashcards")}</p>
                      <p className="font-medium">{resource.flashcardCount}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("library.questions")}</p>
                      <p className="font-medium">{resource.quizQuestionCount}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("library.created")}</p>
                      <p className="font-medium">{formatDate(resource.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" asChild className="flex-1">
                      <Link href={`/library/${resource.id}`}>{t("common.view")}</Link>
                    </Button>
                    {resource.flashcardCount > 0 && (
                      <Button size="sm" variant="outline" asChild className="flex-1">
                        <Link href={`/study?resource=${resource.id}`}>{t("nav.study")}</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredResources.map((resource, index) => (
            <Card
              key={resource.id}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:bg-muted/50 animate-slide-up",
                selectedIndex === index && "border-primary ring-1 ring-primary",
                resource.completedAt && "border-green-500/30 opacity-80"
              )}
              style={{ animationDelay: `${index * 30}ms` }}
              onClick={() => router.push(`/library/${resource.id}`)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate">{resource.title}</h3>
                    {resource.completedAt && (
                      <Badge variant="secondary" className="gap-1 shrink-0 text-xs bg-green-500/10 text-green-700 dark:text-green-400">
                        <CheckCircle2 className="h-3 w-3" />
                        {t("common.done")}
                      </Badge>
                    )}
                    {!resource.isOwned && (
                      <Badge variant="secondary" className="gap-1 shrink-0 text-xs bg-blue-500/10 text-blue-700">
                        <Users2 className="h-3 w-3" />
                        {t("common.shared")}
                      </Badge>
                    )}
                    {resource.folder && (
                      <Badge variant="outline" className="gap-1 shrink-0">
                        <Folder className="h-3 w-3" />
                        {resource.folder.name}
                      </Badge>
                    )}
                  </div>
                  {resource.description && (
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {resource.description}
                    </p>
                  )}
                  {!resource.isOwned && resource.ownerName && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("common.by", { name: resource.ownerName })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground shrink-0">
                  {resource.difficulty && (
                    <Badge className={getDifficultyColor(resource.difficulty)}>
                      {getDifficultyLabel(resource.difficulty)}
                    </Badge>
                  )}
                  {!resource.isOwned && resource.permission === "read" && (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="flex items-center gap-1">
                    <Brain className="h-4 w-4" />
                    {resource.flashcardCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileQuestion className="h-4 w-4" />
                    {resource.quizQuestionCount}
                  </span>
                  <span className="hidden sm:block">{formatDate(resource.createdAt)}</span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/library/${resource.id}`);
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      {t("common.viewDetails")}
                    </DropdownMenuItem>
                    {resource.isOwned && (
                      <>
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                          <Share2 className="mr-2 h-4 w-4" />
                          {t("common.share")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("common.delete")}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
