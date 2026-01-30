import { useState } from "react";
import { useData } from "@/lib/dataContext";
import { GitHubStarsButton } from "./animate-ui/components/buttons/github-stars";
import Logo from "./Logo";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuGroup, DropdownMenuItem } from "./ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { Link, useNavigate, useParams } from "react-router-dom";
import React from "react";
import { Plus, LayoutDashboard, Library, Brain, BookOpen, Sparkles, Menu, Settings, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { UserMenu } from "./auth/UserMenu";
import { GoogleLoginButton } from "./auth/GoogleLoginButton";
import { ThemeToggle, LanguageToggle } from "./settings/ThemeToggle";

// Mobile avatar with fallback
function MobileAvatar({ user }: { user: { name: string; avatar_url?: string } }) {
    const [imgError, setImgError] = useState(false);
    const showAvatar = user.avatar_url && !imgError;

    if (showAvatar) {
        return (
            <img
                src={user.avatar_url}
                alt={user.name}
                className="h-10 w-10 rounded-full object-cover"
                onError={() => setImgError(true)}
            />
        );
    }

    return (
        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
            <span className="text-sm font-medium text-primary-foreground">
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
        </div>
    );
}

export default function Header() {
    const { t } = useTranslation();
    const datas = useData();
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, isLoading, user, logout } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

    const data = React.useMemo(() => {
        return datas.data.find(x => x.id === id)
    }, [id, datas.data])

    const closeMobileMenu = () => setMobileMenuOpen(false);

    return (
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <div className="flex gap-3 sm:gap-5 items-center">
                    <Link to={"/"} className="flex items-center gap-2 sm:gap-4">
                        <Logo className="w-6 sm:w-7" />
                        <h1 className="font-medium tracking-wide text-base sm:text-lg">SmartNotes</h1>
                    </Link>

                    {/* Desktop Navigation for authenticated users */}
                    {isAuthenticated && (
                        <nav className="hidden lg:flex items-center gap-1">
                            <Button variant="ghost" size="sm" asChild>
                                <Link to="/dashboard">
                                    <LayoutDashboard className="h-4 w-4 mr-2" />
                                    {t('nav.dashboard')}
                                </Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                                <Link to="/library">
                                    <Library className="h-4 w-4 mr-2" />
                                    {t('nav.library')}
                                </Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                                <Link to="/study">
                                    <Brain className="h-4 w-4 mr-2" />
                                    {t('nav.study')}
                                </Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                                <Link to="/create">
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    {t('nav.create')}
                                </Link>
                            </Button>
                        </nav>
                    )}

                    {/* History dropdown for local data - hidden on mobile */}
                    {datas.data.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger className="outline-0 hidden sm:block">
                                <Button variant={"outline"} size="sm">
                                    <BookOpen className="h-4 w-4 sm:mr-2" />
                                    <span className="hidden sm:inline truncate max-w-32">
                                        {data ? data.title : t('library.myMaterials')}
                                    </span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-60">
                                <DropdownMenuLabel className="font-bold">{t('library.myMaterials')}</DropdownMenuLabel>
                                <DropdownMenuGroup>
                                    {datas.data.map((d) => (
                                        <DropdownMenuItem
                                            key={d.id}
                                            className="truncate"
                                            onSelect={() => {
                                                navigate(`/${d.id}`)
                                            }}
                                        >{d.title}</DropdownMenuItem>
                                    ))}
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => navigate("/create")}>{t('common.create')}</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                {/* Desktop right side */}
                <div className="hidden sm:flex items-center gap-2 sm:gap-3">
                    {isAuthenticated && (
                        <Button
                            onClick={() => navigate("/create")}
                            className="cursor-pointer hidden md:flex"
                            variant="outline"
                            size="sm"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            {t('nav.create')}
                        </Button>
                    )}

                    <LanguageToggle />
                    <ThemeToggle />

                    {!isLoading && (
                        isAuthenticated ? (
                            <UserMenu />
                        ) : (
                            <GoogleLoginButton />
                        )
                    )}

                    <a href="https://github.com/meszmate/smartnotes" className="hidden lg:block">
                        <GitHubStarsButton
                            size={"sm"}
                            username="meszmate"
                            repo="smartnotes"
                        />
                    </a>
                </div>

                {/* Mobile menu button and toggles */}
                <div className="flex sm:hidden items-center gap-2">
                    <LanguageToggle />
                    <ThemeToggle />

                    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="sm" className="p-2">
                                <Menu className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[280px] sm:w-[350px]">
                            <SheetHeader>
                                <SheetTitle className="flex items-center gap-2">
                                    <Logo className="w-6" />
                                    SmartNotes
                                </SheetTitle>
                            </SheetHeader>

                            <div className="mt-6 flex flex-col gap-2">
                                {isAuthenticated ? (
                                    <>
                                        {/* User info */}
                                        {user && (
                                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 mb-4">
                                                <MobileAvatar user={user} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate">{user.name}</p>
                                                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Navigation links */}
                                        <Button variant="ghost" className="justify-start" asChild onClick={closeMobileMenu}>
                                            <Link to="/dashboard">
                                                <LayoutDashboard className="h-4 w-4 mr-3" />
                                                {t('nav.dashboard')}
                                            </Link>
                                        </Button>
                                        <Button variant="ghost" className="justify-start" asChild onClick={closeMobileMenu}>
                                            <Link to="/library">
                                                <Library className="h-4 w-4 mr-3" />
                                                {t('nav.library')}
                                            </Link>
                                        </Button>
                                        <Button variant="ghost" className="justify-start" asChild onClick={closeMobileMenu}>
                                            <Link to="/study">
                                                <Brain className="h-4 w-4 mr-3" />
                                                {t('nav.study')}
                                            </Link>
                                        </Button>
                                        <Button variant="ghost" className="justify-start" asChild onClick={closeMobileMenu}>
                                            <Link to="/create">
                                                <Sparkles className="h-4 w-4 mr-3" />
                                                {t('nav.create')}
                                            </Link>
                                        </Button>

                                        <div className="my-2 border-t" />

                                        <Button variant="ghost" className="justify-start" asChild onClick={closeMobileMenu}>
                                            <Link to="/settings">
                                                <Settings className="h-4 w-4 mr-3" />
                                                {t('auth.settings')}
                                            </Link>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="justify-start text-red-600"
                                            onClick={() => {
                                                closeMobileMenu();
                                                logout();
                                            }}
                                        >
                                            <LogOut className="h-4 w-4 mr-3" />
                                            {t('auth.logout')}
                                        </Button>
                                    </>
                                ) : (
                                    <div className="p-4">
                                        <GoogleLoginButton />
                                    </div>
                                )}

                                {/* Local materials on mobile */}
                                {datas.data.length > 0 && (
                                    <>
                                        <div className="my-2 border-t" />
                                        <p className="px-3 py-2 text-sm font-medium text-muted-foreground">
                                            {t('library.myMaterials')}
                                        </p>
                                        {datas.data.slice(0, 5).map((d) => (
                                            <Button
                                                key={d.id}
                                                variant="ghost"
                                                className="justify-start"
                                                onClick={() => {
                                                    closeMobileMenu();
                                                    navigate(`/${d.id}`);
                                                }}
                                            >
                                                <BookOpen className="h-4 w-4 mr-3" />
                                                <span className="truncate">{d.title}</span>
                                            </Button>
                                        ))}
                                    </>
                                )}
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </div>
    )
}
