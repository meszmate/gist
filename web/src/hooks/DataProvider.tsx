import { DataContext } from "@/lib/dataContext"
import React from "react";
import type { Data } from "@/lib/types";
import toast from "react-hot-toast";
import { DataArraySchema } from "@/lib/schema";

const STORAGE_KEY = "app:data";

export default function DataProvider({
    children,
}: {
    children: React.ReactNode,
}) {
    const [data, setData] = React.useState<Data[]>(() => {
        try {
            const item = localStorage.getItem(STORAGE_KEY);
            if (item) {
                const parsed = JSON.parse(item)
                const result = DataArraySchema.safeParse(parsed)
                return result.success ? result.data : []
            }
            return [];
        } catch {
            return [];
        }
    });

    const updateData = React.useCallback((newData: Data[]) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
            setData(newData);
        } catch (err) {
            console.error('Failed to write to localStorage:', err);
            toast.error(`Failed to write to localStorage: ${err}`)
        }
    }, []);

    return (
        <DataContext.Provider value={{ data, updateData }}>
            {children}
        </DataContext.Provider>
    )
}
