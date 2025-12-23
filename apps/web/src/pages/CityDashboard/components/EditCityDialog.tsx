import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../../components/Modal";
import type { City } from "../../../types";
import { deleteCity, updateCity } from "../../../api/cities";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../../lib/errors";

export function EditCityDialog({
                                   open,
                                   onClose,
                                   city,
                               }: {
    open: boolean;
    onClose: () => void;
    city: City | null;
}) {
    const qc = useQueryClient();
    const [name, setName] = useState("");

    useEffect(() => {
        setName(city?.name ?? "");
    }, [city, open]);

    const saveM = useMutation({
        mutationFn: async () => {
            if (!city) throw new Error("No city");
            return updateCity(city.id, name.trim());
        },
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ["cities"] });
            onClose();
        },
    });

    const delM = useMutation({
        mutationFn: async () => {
            if (!city) throw new Error("No city");
            return deleteCity(city.id);
        },
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ["cities"] });
            onClose();
            toast.success("City deleted");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
    });

    const disabled = !city || !name.trim() || saveM.isPending || delM.isPending;

    return (
        <Modal open={open} title="Edit city" onClose={onClose}>
            {!city ? (
                <div className="text-sm text-slate-600 dark:text-slate-300">No city selected.</div>
            ) : (
                <div className="space-y-3">
                    <div>
                        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Name</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950"
                        />
                    </div>

                    {(saveM.isError || delM.isError) && (
                        <div className="rounded-xl bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">
                            {String((saveM.error || delM.error) as any)?.includes("CityHasClients")
                                ? "Cannot delete city with active clients."
                                : "Action failed."}
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                        <button
                            onClick={() => delM.mutate()}
                            disabled={!city || delM.isPending || saveM.isPending}
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
