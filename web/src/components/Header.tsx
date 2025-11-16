import { useData } from "@/lib/dataContext";
import { GitHubStarsButton } from "./animate-ui/components/buttons/github-stars";
import Logo from "./Logo";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuGroup, DropdownMenuItem } from "./ui/dropdown-menu";
import { Link, useNavigate, useParams } from "react-router-dom";
import React from "react";

export default function Header() {
    const datas = useData();
    const { id } = useParams();
    const navigate = useNavigate()

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
                    {datas.data.length > 0 &&
                        <DropdownMenu>
                            <DropdownMenuTrigger className="outline-0">
                                <Button variant={"outline"} className="truncate max-w-42">{data ? data.title : "Select from history..."}</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-60">
                                <DropdownMenuLabel className="font-bold">History</DropdownMenuLabel>
                                <DropdownMenuGroup>
                                    {datas.data.map((d) => (
                                        <DropdownMenuItem
                                            className="truncate"
                                            onSelect={() => {
                                                navigate(`/${d.id}`)
                                            }}
                                        >{d.title}</DropdownMenuItem>
                                    ))}
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => navigate("/")}>Create New</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    }
                </div>
                <div className="flex items-center gap-5">
                    <Button
                        onClick={() => navigate("/")}
                        className="cursor-pointer"
                        variant="outline"
                    >
                        New
                    </Button>
                    <a href="https://github.com/meszmate/smartnotes">
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
