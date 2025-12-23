import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../../components/Modal";
import { createLedgerEntry } from "../../../api/ledger";
import type { LedgerType } from "../../../types";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../../lib/errors";
type Mode = "DEBT" | "PAYMENT" | "NOTE";

function modeToType(mode: Mode): LedgerType {
    if (mode === "DEBT") return "DEBT_ADD";
    if (mode === "PAYMENT") return "PAYMENT";
    return "NOTE";
}

export function AddEntryDialog({
                                   open,
                                   onClose,
                                   clientId,
                                   mode,
                               }: {
    open: boolean;
    onClose: () => void;
    clientId: string | null;
    mode: Mode;
}) {
    const qc = useQueryClient();

    const [amount, setAmount] = useState("");
    const [currency, setCurrency] = useState("USD");
    const [note, setNote] = useState("");

    const title = useMemo(() => {
        if (mode === "DEBT") return "Add debt";
        if (mode === "PAYMENT") return "Add payment";
        return "Add note";
    }, [mode]);

    const m = useMutation({
        mutationFn: async () => {
            const type = modeToType(mode);

            const amt =
                mode === "NOTE"
                    ? undefined
                    : Number(String(amount).replace(",", "."));

            if (mode !== "NOTE" && !Number.isFinite(amt)) {
                throw new Error("Invalid amount");
            }

            return createLedgerEntry(clientId!, {
                type,
                amount: mode === "NOTE" ? undefined : amt!,
                currency,
                note: note.trim(),
            });
        },
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ["ledger", clientId] });
            // later we also recalc balances via server, but now ledger refresh is enough
            setAmount("");
            setNote("");
            setCurrency("USD");
            onClose();
            toast.success("Ledger created");
        },
        onError: (err) => {
            toast.error(getErrorMessage(err));
        },
    });

    const disabled =
        !clientId ||
        !note.trim() ||
        (mode !== "NOTE" && !amount.trim()) ||
        m.isPending;

    return (
        <Modal open={open} title={title} onClose={onClose}>
            {!clientId ? (
                <div className="text-sm text-slate-600 dark:text-slate-300">
                    Select a client first.
                </div>
            ) : (
                <div className="space-y-3">
                    {mode !== "NOTE" && (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                                    Amount
                                </label>
                                <input
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder={mode === "PAYMENT" ? "120" : "120"}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950"
                                />
                                {mode === "PAYMENT" && (
                                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                        Payment will be saved as negative amount automatically.
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                                    Currency
                                </label>
                                <select
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950"
                                >
                                    <option value="USD">USD</option>
                                    <option value="UZS">UZS</option>
                                    <option value="RUB">RUB</option>
                                </select>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                            Note
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder={
                                mode === "DEBT"
                                    ? "Added debt for delivery..."
                                    : mode === "PAYMENT"
                                        ? "Client paid cash..."
                                        : "Any important comment..."
                            }
                            className="min-h-[96px] w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950"
                        />
                    </div>

                    {m.isError && (
                        <div className="rounded-xl bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">
                            Failed to add entry.
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <button
                            onClick={onClose}
                            className="rounded-xl px-3 py-2 text-sm ring-1 ring-slate-200 hover:bg-slate-50 dark:ring-slate-800 dark:hover:bg-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            disabled={disabled}
                            onClick={() => m.mutate()}
                            className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
                        >
                            {m.isPending ? "Saving..." : "Save"}
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
