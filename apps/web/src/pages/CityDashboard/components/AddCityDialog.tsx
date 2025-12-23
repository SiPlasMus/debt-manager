import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCity } from "../../../api/cities";
import { Modal } from "../../../components/Modal";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../../lib/errors";

export function AddCityDialog({
                                  open,
                                  onClose,
                                  onCreated,
                              }: {
    open: boolean;
    onClose: () => void;
    onCreated?: (cityId: string) => void;
}) {
    const qc = useQueryClient();
    const [name, setName] = useState("");

    const m = useMutation({
        mutationFn: (n: string) => createCity(n),
        onSuccess: async (city) => {
            await qc.invalidateQueries({ queryKey: ["cities"] });
            onCreated?.(city.id);
            setName("");
            onClose();
            toast.success("City created");
        },
        onError: (err) => {
            toast.error(getErrorMessage(err));
        },
    });

    return (
        <Modal open={open} title="Add City" onClose={onClose}>
            <div className="space-y-3">
                <div>
                    <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                        City name
                    </label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Tashkent"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950"
                    />
                </div>

                {m.isError && (
                    <div className="rounded-xl bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">
                        Failed to create city.
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
                        disabled={!name.trim() || m.isPending}
                        onClick={() => m.mutate(name.trim())}
                        className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
                    >
                        {m.isPending ? "Creating..." : "Create"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
