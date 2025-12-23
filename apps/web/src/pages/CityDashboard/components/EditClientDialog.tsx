import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../../components/Modal";
import type { Client } from "../../../types";
import { archiveClient, updateClient } from "../../../api/clients";

export function EditClientDialog({
                                     open,
                                     onClose,
                                     client,
                                     cityId,
                                 }: {
    open: boolean;
    onClose: () => void;
    client: Client | null;
    cityId: string | null;
}) {
    const qc = useQueryClient();

    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [tags, setTags] = useState(""); // comma separated

    useEffect(() => {
        setName(client?.name ?? "");
        setPhone(client?.phone ?? "");
        setTags((client?.tags ?? []).join(", "));
    }, [client, open]);

    const saveM = useMutation({
        mutationFn: async () => {
            if (!client) throw new Error("No client");
            const payload = {
                name: name.trim(),
                phone: phone.trim() ? phone.trim() : null,
                tags: tags
                    .split(",")
                    .map((x) => x.trim())
                    .filter(Boolean),
            };
            return updateClient(client.id, payload);
        },
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ["clients", cityId] });
            onClose();
        },
    });

    const archiveM = useMutation({
        mutationFn: async () => {
            if (!client) throw new Error("No client");
            return archiveClient(client.id);
        },
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ["clients", cityId] });
            onClose();
        },
    });

    const disabled = !client || !name.trim() || saveM.isPending || archiveM.isPending;

    return (
        <Modal open={open} title="Edit client" onClose={onClose}>
            {!client ? (
                <div className="text-sm text-slate-600 dark:text-slate-300">No client selected.</div>
            ) : (
                <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Name</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Phone</label>
                            <input
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Tags (comma separated)</label>
                        <input
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950"
                        />
                    </div>

                    {(saveM.isError || archiveM.isError) && (
                        <div className="rounded-xl bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">
                            Action failed.
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                        <button
                            onClick={() => archiveM.mutate()}
                            disabled={archiveM.isPending || saveM.isPending}
                            className="rounded-xl px-3 py-2 text-sm ring-1 ring-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:ring-rose-900 dark:text-rose-200 dark:hover:bg-rose-950/30"
                        >
                            {archiveM.isPending ? "Archiving..." : "Archive"}
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
