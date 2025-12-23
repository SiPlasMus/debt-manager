import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getExchangeRate, updateExchangeRate } from "../../api/exchangeRate";

function num(x: string | number | undefined, fallback: number) {
    const n = typeof x === "string" ? Number(x) : typeof x === "number" ? x : NaN;
    return Number.isFinite(n) ? n : fallback;
}

export function Topbar() {
    const qc = useQueryClient();

    const rateQ = useQuery({
        queryKey: ["exchange-rate"],
        queryFn: getExchangeRate,
    });

    const current = rateQ.data;
    const [usdToUzs, setUsdToUzs] = useState("");
    const [usdToRub, setUsdToRub] = useState("");
    const [dirty, setDirty] = useState(false);

    // hydrate inputs when loaded (only if not editing)
    useEffect(() => {
        if (!current) return;
        if (dirty) return;
        setUsdToUzs(String(num(current.usdToUzs, 12000)));
        setUsdToRub(String(num(current.usdToRub, 100)));
    }, [current, dirty]);

    const saveM = useMutation({
        mutationFn: async () => {
            const uzs = Number(usdToUzs.replace(",", "."));
            const rub = Number(usdToRub.replace(",", "."));
            if (!Number.isFinite(uzs) || uzs <= 0) throw new Error("Invalid UZS rate");
            if (!Number.isFinite(rub) || rub <= 0) throw new Error("Invalid RUB rate");
            return updateExchangeRate({ usdToUzs: uzs, usdToRub: rub });
        },
        onSuccess: async () => {
            setDirty(false);
            await qc.invalidateQueries({ queryKey: ["exchange-rate"] });
            // also refresh ledger balances display in UI (optional)
            await qc.invalidateQueries({ queryKey: ["ledger"] });
        },
    });

    const canSave = useMemo(() => {
        if (!dirty) return false;
        if (saveM.isPending) return false;
        const uzs = Number(usdToUzs.replace(",", "."));
        const rub = Number(usdToRub.replace(",", "."));
        return Number.isFinite(uzs) && uzs > 0 && Number.isFinite(rub) && rub > 0;
    }, [dirty, saveM.isPending, usdToUzs, usdToRub]);

    return (
        <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/70">
            <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Left: brand */}
                <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                        DM
                    </div>
                    <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            Debt Manager
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                            Cities • Clients • Ledger
                        </div>
                    </div>
                </div>

                {/* Right: rates */}
                <div className="flex flex-col gap-2 sm:items-end">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="rounded-xl bg-white px-3 py-2 text-xs ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-slate-500 dark:text-slate-400">1 USD =</span>

                                <input
                                    value={usdToUzs}
                                    onChange={(e) => { setUsdToUzs(e.target.value); setDirty(true); }}
                                    inputMode="decimal"
                                    className="w-[110px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950"
                                />
                                <span className="text-slate-500 dark:text-slate-400">UZS</span>

                                <span className="text-slate-300 dark:text-slate-600">|</span>

                                <input
                                    value={usdToRub}
                                    onChange={(e) => { setUsdToRub(e.target.value); setDirty(true); }}
                                    inputMode="decimal"
                                    className="w-[90px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950"
                                />
                                <span className="text-slate-500 dark:text-slate-400">RUB</span>
                            </div>
                        </div>

                        <button
                            disabled={!canSave}
                            onClick={() => saveM.mutate()}
                            className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
                        >
                            {saveM.isPending ? "Saving..." : "Save rate"}
                        </button>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        {rateQ.isLoading ? "Loading rate..." : current ? `Updated: ${new Date(current.updatedAt).toLocaleString()}` : "—"}
                    </div>
                </div>
            </div>
        </div>
    );
}
