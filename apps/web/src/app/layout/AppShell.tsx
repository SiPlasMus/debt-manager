import type { ReactNode } from "react";
import { Topbar } from "./Topbar";
import { Toaster } from "react-hot-toast";

export function AppShell({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
            <Topbar />
            <main className="mx-auto max-w-6xl px-4 py-4">{children}</main>
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        borderRadius: "12px",
                    },
                }}
            />
        </div>
    );
}
