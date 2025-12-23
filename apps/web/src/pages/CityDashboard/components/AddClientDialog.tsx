import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "../../../api/clients";
import { Modal } from "../../../components/Modal";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../../lib/errors";

export function AddClientDialog({
                                    open,
                                    onClose,
                                    cityId,
                                }: {
    open: boolean;
    onClose: () => void;
    cityId: string | null;
}) {
    const qc = useQueryClient();
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");

    const m = useMutation({
        mutationFn: () =>
            createClient({
                cityId: cityId!,
                name: name.trim(),
                phone: phone.trim() || undefined,
            }),
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ["clients", cityId] });
            setName("");
            setPhone("");
            onClose();
            toast.success("Client created");
        },
        onError: (err) => {
            toast.error(getErrorMessage(err));
        },
    });

    const disabled = !cityId || !name.trim() || m.isPending;

    return (
        <Modal open={open} title="Add Client" onClose={onClose}>
            {!cityId ? (
                <div className="text-sm text-slate-600 dark:text-slate-300">
                    Select a city first.
                </div>
            ) : (
                <div className="space-y-3">
                    <div>
                        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                            Client name
                        </label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Client name"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                            Phone (optional)
                        </label>
                        <input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+998..."
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950"
                        />
                    </div>

                    {m.isError && (
                        <div className="rounded-xl bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">
                            Failed to create client.
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
                            {m.isPending ? "Creating..." : "Create"}
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
