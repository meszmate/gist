import { createContext, useContext } from "react";
import { type Data } from "./types";

interface DataContextValue {
    data: Data[];
    updateData: (data: Data[]) => void;
}

export const DataContext = createContext<DataContextValue | undefined>(undefined)

export function useData() {
    const c = useContext(DataContext)
    if (!c) {
        throw new Error("You must wrap the content in DataProvider element")
    }
    return c
}
