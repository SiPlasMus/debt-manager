import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../../components/Modal";
import type { LedgerEntry } from "../../../types";
import { deleteLedgerEntry, updateLedgerEntry } from "../../../api/ledger";

export function EditLedgerEntryDialog({
                                          open,
                                          onClose,
                                          entry,
                                          clientId,
                                      }: {
    open: boolean;
    onClose: () => void;
    entry: LedgerEntry | null;
    clientId: string | null;
}) {
    const qc = useQueryClient();

    const [amount, setAmount] = useState("");
    const [currency, setCurrency] = useState("USD");
    const [note, setNote] = useState("");
    const [date, setDate] = useState(""); // yyyy-mm-ddTHH:mm

    useEffect(() => {
        if (!entry) return;
        setAmount(String(entry.amount ?? ""));
        setCurrency(entry.currency ?? "USD");
        setNote(entry.note ?? "");
        // local datetime input wants "YYYY-MM-DDTHH:mm"
        const d = new Date(entry.entryDate);
        const pad = (n: number) => String(n).padStart(2, "0");
        const v = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        setDate(v);
    }, [entry, open]);

    const saveM = useMutation({
        mutationFn: async () => {
            if (!entry) throw new Error("No entry");
            const amt = Number(String(amount).replace(",", "."));
            if (!Number.isFinite(amt)) throw new Error("Invalid amount");
            return updateLedgerEntry(entry.id, {
                amount: amt,
                currency,
                note: note.trim(),
                entryDate: date ? new Date(date).toISOString() : undefined,
            });
        },
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ["ledger", clientId] });
            onClose();
        },
    });

    const delM = useMutation({
        mutationFn: async () => {
            if (!entry) throw new Error("No entry");
            return deleteLedgerEntry(entry.id);
        },
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ["ledger", clientId] });
            onClose();
        },
    });

    const disabled =
        !entry ||
        !note.trim() ||
        !currency.trim() ||
        saveM.isPending ||
        delM.isPending ||
        !amount.trim();

    return (
        <Modal open={open} title="Edit entry" onClose={onClose}>
            {!entry ? (
                <div className="text-sm text-slate-600 dark:text-slate-300">No entry selected.</div>
            ) : (
                <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <div className="sm:col-span-2">
                            <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Amount</label>
                            <input
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950"
                            />
                            {entry.type === "PAYMENT" && (
                                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    Payment amount will be normalized to negative on server.
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Currency</label>
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

                    <div>
                        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Date</label>
                        <input
                            type="datetime-local"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Note</label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="min-h-[96px] w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950"
                        />
                    </div>

                    {(saveM.isError || delM.isError) && (
                        <div className="rounded-xl bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">
                            Action failed.
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                        <button
                            onClick={() => delM.mutate()}
                            disabled={delM.isPending || saveM.isPending}
                            className="rounded-xl px-3 py-2 text-sm ring-1 ring-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:ring-rose-900 dark:text-rose-200 dark:hover:bg-rose-950/30"
                        >
                            {delM.isPending ? "Deleting..." : "Delete"}
                        </button>

                        <div className="flex gap-2">
                            <button
                                onClick={onClose}
                                className="rounded-xl px-3 py-2 text-sm ring-1 ring-slate-200 hover:bg-slate-50 dark:ring-slate-800 dark:hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={disabled}
                                onClick={() => saveM.mutate()}
                                className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
                            >
                                {saveM.isPending ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    );
}
