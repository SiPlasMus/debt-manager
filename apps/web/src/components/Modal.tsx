import { useEffect } from "react";

type Props = {
    open: boolean;
    title: string;
    onClose: () => void;
    children: React.ReactNode;
};

export function Modal({ open, title, onClose, children }: Props) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50">
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />
            <div className="absolute inset-0 grid place-items-center p-4">
                <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="text-base font-semibold">{title}</div>
                        <button
                            onClick={onClose}
                            className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            ✕
                        </button>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
