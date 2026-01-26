import { useData } from "@/lib/dataContext";
import { GitHubStarsButton } from "./animate-ui/components/buttons/github-stars";
import Logo from "./Logo";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuGroup, DropdownMenuItem } from "./ui/dropdown-menu";
import { Link, useNavigate, useParams } from "react-router-dom";
import React from "react";
import { Plus, LayoutDashboard, Library, Brain, BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { UserMenu } from "./auth/UserMenu";
import { GoogleLoginButton } from "./auth/GoogleLoginButton";
import { ThemeToggle, LanguageToggle } from "./settings/ThemeToggle";

export default function Header() {
    const { t } = useTranslation();
    const datas = useData();
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, isLoading } = useAuth();

    const data = React.useMemo(() => {
        return datas.data.find(x => x.id === id)
    }, [id, datas.data])

    return (
        <div className="p-8">
            <div className="max-w-7xl mx-auto flex justify-between">
                <div className="flex gap-5 items-center">
                    <Link to={"/"} className="flex items-center gap-4">
                        <Logo className="w-7" />
                        <h1 className="font-medium tracking-wide text-lg">SmartNotes</h1>
                    </Link>

                    {/* Navigation for authenticated users */}
                    {isAuthenticated && (
                        <nav className="hidden md:flex items-center gap-1">
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
                        </nav>
                    )}

                    {/* History dropdown for local data */}
                    {datas.data.length > 0 &&
                        <DropdownMenu>
                            <DropdownMenuTrigger className="outline-0">
                                <Button variant={"outline"} size="sm">
                                    <BookOpen className="h-4 w-4 mr-2" />
                                    {data ? data.title : t('library.myMaterials')}
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
                                <DropdownMenuItem onSelect={() => navigate("/")}>{t('common.create')}</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    }
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => navigate("/")}
                        className="cursor-pointer hidden sm:flex"
                        variant="outline"
                        size="sm"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        {t('prompt.generate')}
                    </Button>

                    <LanguageToggle />
                    <ThemeToggle />

                    {!isLoading && (
                        isAuthenticated ? (
                            <UserMenu />
                        ) : (
                            <GoogleLoginButton />
                        )
                    )}

                    <a href="https://github.com/meszmate/smartnotes" className="hidden sm:block">
                        <GitHubStarsButton
                            size={"sm"}
                            username="meszmate"
                            repo="smartnotes"
                        />
                    </a>
                </div>
            </div>
        </div>
    )
}
