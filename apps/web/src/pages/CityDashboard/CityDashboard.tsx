import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "../../app/layout/AppShell";
import { getCities } from "../../api/cities";
import { getClientsByCity } from "../../api/clients";
import { getLedger } from "../../api/ledger";
import type {City, Client, LedgerEntry, LedgerType} from "../../types";
import { AddCityDialog } from "./components/AddCityDialog";
import { AddClientDialog } from "./components/AddClientDialog";
import {AddEntryDialog} from "./components/AddEntryDialog.tsx";
import { getExchangeRate } from "../../api/exchangeRate";
import { FiEdit2 } from "react-icons/fi";
import { EditCityDialog } from "./components/EditCityDialog";
import { EditClientDialog } from "./components/EditClientDialog";
import { EditLedgerEntryDialog } from "./components/EditLedgerEntryDialog";

function money(n: number) {
    const sign = n < 0 ? "-" : "";
    const abs = Math.abs(n);
    return `${sign}${abs.toFixed(2)}`;
}
function toNumber(x: string | number) {
    const n = typeof x === "string" ? Number(x) : x;
    return Number.isFinite(n) ? n : 0;
}
function calcBalanceUSD(
    entries: Array<{ amount: string | number; currency: string }>,
    rate?: { usdToUzs: string | number; usdToRub: string | number } | null
) {
    const usdToUzs = rate ? toNumber(rate.usdToUzs) : 0;
    const usdToRub = rate ? toNumber(rate.usdToRub) : 0;

    let sum = 0;

    for (const e of entries) {
        const amt = toNumber(e.amount);
        const cur = (e.currency || "USD").toUpperCase();

        if (cur === "USD") sum += amt;
        else if (cur === "UZS") sum += usdToUzs > 0 ? amt / usdToUzs : 0;
        else if (cur === "RUB") sum += usdToRub > 0 ? amt / usdToRub : 0;
        else sum += amt; // unknown currency -> treat as USD (or set 0)
    }

    return sum;
}

function getBalanceCur(): "USD" | "UZS" | "RUB" {
    const v = localStorage.getItem("balanceCurrency");
    return v === "UZS" || v === "RUB" ? v : "USD";
}
function setBalanceCur(v: "USD" | "UZS" | "RUB") {
    localStorage.setItem("balanceCurrency", v);
}

function sumUsd(entries: LedgerEntry[], rate: any) {
    const usdToUzs = rate ? toNumber(rate.usdToUzs) : 0;
    const usdToRub = rate ? toNumber(rate.usdToRub) : 0;

    let debts = 0;
    let payments = 0;
    let net = 0;

    for (const e of entries) {
        const amt = toNumber(e.amount);
        const cur = (e.currency || "USD").toUpperCase();

        let usd = 0;
        if (cur === "USD") usd = amt;
        else if (cur === "UZS") usd = usdToUzs > 0 ? amt / usdToUzs : 0;
        else if (cur === "RUB") usd = usdToRub > 0 ? amt / usdToRub : 0;
        else usd = amt;

        if (e.type === "DEBT_ADD" || e.type === "ADJUSTMENT") debts += usd;
        if (e.type === "PAYMENT") payments += usd; // will be negative already
        net += usd;
    }

    return { debts, payments, net };
}

export function CityDashboard() {
    const [activeCityId, setActiveCityId] = useState<string | null>(null);
    const [activeClientId, setActiveClientId] = useState<string | null>(null);
    const [cityModalOpen, setCityModalOpen] = useState(false);
    const [clientModalOpen, setClientModalOpen] = useState(false);
    const [entryOpen, setEntryOpen] = useState(false);
    const [entryMode, setEntryMode] = useState<"DEBT" | "PAYMENT" | "NOTE">("DEBT");
    const [balanceCur, setBalanceCurState] = useState<"USD" | "UZS" | "RUB">(getBalanceCur());
    const [clientSearch, setClientSearch] = useState("");
    const [ledgerType, setLedgerType] = useState<"ALL" | LedgerType>("ALL");
    const [fromDate, setFromDate] = useState(""); // yyyy-mm-dd
    const [toDate, setToDate] = useState("");
    const [noteSearch, setNoteSearch] = useState("");
    const [editCityOpen, setEditCityOpen] = useState(false);
    const [editClientOpen, setEditClientOpen] = useState(false);
    const [editEntryOpen, setEditEntryOpen] = useState(false);
    const [cityToEdit, setCityToEdit] = useState<City | null>(null);
    const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
    const [entryToEdit, setEntryToEdit] = useState<LedgerEntry | null>(null);


    const rateQ = useQuery({
        queryKey: ["exchange-rate"],
        queryFn: getExchangeRate,
    });
    const rate = rateQ.data;

    const usdToUzs = rate ? toNumber(rate.usdToUzs) : 0;
    const usdToRub = rate ? toNumber(rate.usdToRub) : 0;

    const citiesQ = useQuery({
        queryKey: ["cities"],
        queryFn: getCities,
    });

    const cities = citiesQ.data ?? [];

    // auto-select first city when loaded
    useMemo(() => {
        if (!activeCityId && cities.length) setActiveCityId(cities[0].id);
    }, [cities, activeCityId]);

    const clientsQ = useQuery({
        queryKey: ["clients", activeCityId],
        queryFn: () => getClientsByCity(activeCityId!),
        enabled: !!activeCityId,
    });

    const clients = clientsQ.data ?? [];

    // auto-select first client
    useMemo(() => {
        if (!activeClientId && clients.length) setActiveClientId(clients[0].id);
        if (activeClientId && !clients.find(c => c.id === activeClientId)) setActiveClientId(null);
    }, [clients, activeClientId]);

    const ledgerQ = useQuery({
        queryKey: ["ledger", activeClientId],
        queryFn: () => getLedger(activeClientId!),
        enabled: !!activeClientId,
    });

    const ledger = ledgerQ.data ?? [];
    const balanceUsd = calcBalanceUSD(ledger, rate);
    const balanceShown =
        balanceCur === "USD" ? balanceUsd :
            balanceCur === "UZS" ? balanceUsd * (usdToUzs || 0) :
                balanceUsd * (usdToRub || 0);

    const activeCity: City | null = cities.find(c => c.id === activeCityId) ?? null;
    const activeClient: Client | null = clients.find(c => c.id === activeClientId) ?? null;

    const filteredClients = clients.filter(c => {
        const q = clientSearch.trim().toLowerCase();
        if (!q) return true;
        return (c.name || "").toLowerCase().includes(q) || (c.phone || "").toLowerCase().includes(q);
    });

    const filteredLedger = ledger.filter((e) => {
        if (ledgerType !== "ALL" && e.type !== ledgerType) return false;

        const d = new Date(e.entryDate);
        if (fromDate) {
            const from = new Date(fromDate + "T00:00:00");
            if (d < from) return false;
        }
        if (toDate) {
            const to = new Date(toDate + "T23:59:59");
            if (d > to) return false;
        }

        const q = noteSearch.trim().toLowerCase();
        if (q && !(e.note || "").toLowerCase().includes(q)) return false;

        return true;
    });

    const periodTotals = sumUsd(filteredLedger, rate);

    return (
        <AppShell>
            {/* Cities row */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold">Cities</div>

                    <div className="flex flex-wrap gap-2">
                        {cities.map((c) => {
                            const active = c.id === activeCityId;
                            return (
                                <div key={c.id} className="flex items-center gap-1">
                                    <button
                                        onClick={() => { setActiveCityId(c.id); setActiveClientId(null); }}
                                        className={[
                                            "rounded-xl px-3 py-1.5 text-sm transition",
                                            active
                                                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                                                : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800 dark:hover:bg-slate-800"
                                        ].join(" ")}
                                    >
                                        {c.name}
                                    </button>
                                    <button
                                        onClick={() => { setCityToEdit(c); setEditCityOpen(true); }}
                                        className="grid h-9 w-9 place-items-center rounded-xl bg-white ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:ring-slate-800 dark:hover:bg-slate-800"
                                        title="Edit city"
                                    >
                                        <FiEdit2 />
                                    </button>
                                </div>
                            );
                        })}

                        {!citiesQ.isLoading && cities.length === 0 && (
                            <div className="rounded-xl bg-white px-3 py-1.5 text-sm text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                                No cities yet
                            </div>
                        )}
                    </div>
                </div>

                <button
                    onClick={() => setCityModalOpen(true)}
                    className="rounded-xl bg-white px-3 py-1.5 text-sm ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:ring-slate-800 dark:hover:bg-slate-800"
                >
                    + Add City
                </button>
            </div>

            {/* Loading / error states */}
            {citiesQ.isLoading && (
                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                    Loading cities…
                </div>
            )}

            {citiesQ.isError && (
                <div className="rounded-2xl bg-white p-4 ring-1 ring-red-200 dark:bg-slate-900 dark:ring-red-900">
                    <div className="font-semibold text-red-600">Failed to load cities</div>
                    <div className="mt-1 text-sm text-slate-500">
                        Check API is running and VITE_API_URL is correct.
                    </div>
                </div>
            )}

            {/* Main grid */}
            {!citiesQ.isLoading && !citiesQ.isError && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                    {/* Left: clients */}
                    <div className="lg:col-span-4">
                        <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <div>
                                    <div className="text-sm font-semibold">Clients</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                        {activeCity ? `City: ${activeCity.name}` : "Choose a city"}
                                    </div>
                                </div>

                                <button
                                    onClick={() => setClientModalOpen(true)}
                                    disabled={!activeCityId}
                                    className="rounded-xl bg-white px-3 py-1.5 text-sm ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50 dark:bg-slate-900 dark:ring-slate-800 dark:hover:bg-slate-800"
                                >
                                    + Add Client
                                </button>
                            </div>

                            <input
                                value={clientSearch}
                                onChange={(e) => setClientSearch(e.target.value)}
                                placeholder="Search client..."
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950"
                            />

                            {clientsQ.isLoading && <div className="text-sm text-slate-500">Loading clients…</div>}
                            {clientsQ.isError && <div className="text-sm text-red-600">Failed to load clients</div>}

                            {!clientsQ.isLoading && clients.length === 0 && (
                                <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                                    No Clients
                                </div>
                            )}

                            <div className="mt-2 space-y-2">
                                {filteredClients.map((cl) => {
                                    const active = cl.id === activeClientId;
                                    return (
                                        <div
                                            key={cl.id}
                                            onClick={() => setActiveClientId(cl.id)}
                                            className={[
                                                "w-full rounded-xl p-3 text-left ring-1 transition",
                                                active
                                                    ? "bg-slate-900 text-white ring-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:ring-slate-100"
                                                    : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-800 dark:hover:bg-slate-800"
                                            ].join(" ")}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <button
                                                    onClick={() => setActiveClientId(cl.id)}
                                                    className="min-w-0 flex-1 text-left"
                                                >
                                                    <div className="truncate text-sm font-semibold">{cl.name}</div>
                                                    <div className="truncate text-xs opacity-70">{cl.phone ?? "—"}</div>
                                                </button>

                                                <button
                                                    onClick={() => { setClientToEdit(cl); setEditClientOpen(true); }}
                                                    className="grid h-9 w-9 place-items-center rounded-xl bg-black/10 hover:bg-black/20 dark:bg-white/15 dark:hover:bg-white/25"
                                                    title="Edit client"
                                                >
                                                    <FiEdit2 />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right: details */}
                    <div className="lg:col-span-8">
                        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                            {!activeClient && (
                                <div className="text-sm text-slate-600 dark:text-slate-300">
                                    Select a client to view ledger.
                                </div>
                            )}

                            {activeClient && (
                                <>
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="min-w-0">
                                            <div className="truncate text-lg font-semibold">{activeClient.name}</div>
                                            <div className="text-sm text-slate-500 dark:text-slate-400">
                                                {activeClient.phone ?? "—"} • {activeCity?.name ?? ""}
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <button
                                                    onClick={() => { setEntryMode("DEBT"); setEntryOpen(true); }}
                                                    disabled={!activeClientId}
                                                    className="rounded-xl bg-white px-3 py-1.5 text-sm ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50 dark:bg-slate-900 dark:ring-slate-800 dark:hover:bg-slate-800"
                                                >
                                                    + Debt
                                                </button>
                                                <button
                                                    onClick={() => { setEntryMode("PAYMENT"); setEntryOpen(true); }}
                                                    disabled={!activeClientId}
                                                    className="rounded-xl bg-white px-3 py-1.5 text-sm ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50 dark:bg-slate-900 dark:ring-slate-800 dark:hover:bg-slate-800"
                                                >
                                                    + Payment
                                                </button>
                                                <button
                                                    onClick={() => { setEntryMode("NOTE"); setEntryOpen(true); }}
                                                    disabled={!activeClientId}
                                                    className="rounded-xl bg-white px-3 py-1.5 text-sm ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50 dark:bg-slate-900 dark:ring-slate-800 dark:hover:bg-slate-800"
                                                >
                                                    + Note
                                                </button>
                                            </div>

                                            <div className="rounded-2xl bg-slate-50 px-4 py-2 text-right dark:bg-slate-950">
                                                <div className="mb-1 flex items-center justify-end gap-1">
                                                    {(["USD","UZS","RUB"] as const).map((c) => {
                                                        const active = c === balanceCur;
                                                        return (
                                                            <button
                                                                key={c}
                                                                onClick={() => { setBalanceCurState(c); setBalanceCur(c); }}
                                                                className={[
                                                                    "rounded-lg px-2 py-1 text-xs ring-1 transition",
                                                                    active
                                                                        ? "bg-slate-900 text-white ring-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:ring-slate-100"
                                                                        : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800 dark:hover:bg-slate-800",
                                                                ].join(" ")}
                                                            >
                                                                {c}
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                <div className="text-xl font-semibold">
                                                    {money(balanceShown)} {balanceCur}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
                                        <select
                                            value={ledgerType}
                                            onChange={(e) => setLedgerType(e.target.value as any)}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
                                        >
                                            <option value="ALL">All types</option>
                                            <option value="DEBT_ADD">DEBT_ADD</option>
                                            <option value="PAYMENT">PAYMENT</option>
                                            <option value="ADJUSTMENT">ADJUSTMENT</option>
                                            <option value="NOTE">NOTE</option>
                                        </select>

                                        <input
                                            type="date"
                                            value={fromDate}
                                            onChange={(e) => setFromDate(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
                                        />

                                        <input
                                            type="date"
                                            value={toDate}
                                            onChange={(e) => setToDate(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
                                        />

                                        <input
                                            value={noteSearch}
                                            onChange={(e) => setNoteSearch(e.target.value)}
                                            placeholder="Search note..."
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
                                        />
                                    </div>

                                    <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
                                            <div className="text-xs text-slate-500 dark:text-slate-400">Debts (period)</div>
                                            <div className="text-sm font-semibold">{money(periodTotals.debts)} USD</div>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
                                            <div className="text-xs text-slate-500 dark:text-slate-400">Payments (period)</div>
                                            <div className="text-sm font-semibold">{money(periodTotals.payments)} USD</div>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
                                            <div className="text-xs text-slate-500 dark:text-slate-400">Net (period)</div>
                                            <div className="text-sm font-semibold">{money(periodTotals.net)} USD</div>
                                        </div>
                                    </div>


                                    <div className="mt-4">
                                        <div className="mb-2 flex items-center justify-between">
                                            <div className="text-sm font-semibold">Ledger</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                                {ledgerQ.isLoading ? "Loading…" : `${filteredLedger.length} entries`}
                                            </div>
                                        </div>

                                        <div className="rounded-xl ring-1 ring-slate-200 dark:ring-slate-800">
                                            <div className="overflow-x-auto">
                                                <table className="min-w-[720px] w-full text-sm">
                                                    <thead className="bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                                                        <tr>
                                                            <th className="px-3 py-2 text-left">Date</th>
                                                            <th className="px-3 py-2 text-left">Type</th>
                                                            <th className="px-3 py-2 text-right">Amount</th>
                                                            <th className="px-3 py-2 text-left">Note</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                    {ledgerQ.isLoading && (
                                                        <tr>
                                                            <td className="px-3 py-3 text-slate-500" colSpan={4}>Loading ledger…</td>
                                                        </tr>
                                                    )}

                                                    {!ledgerQ.isLoading && ledger.length === 0 && (
                                                        <tr>
                                                            <td className="px-3 py-3 text-slate-500" colSpan={4}>
                                                                No entries yet. Next we add “Add debt / Add payment”.
                                                            </td>
                                                        </tr>
                                                    )}

                                                    {ledger.length !== 0 && filteredLedger.length === 0 && (
                                                        <tr>
                                                            <td className="px-3 py-3 text-slate-500" colSpan={4}>
                                                                No matched entries found.
                                                            </td>
                                                        </tr>
                                                    )}

                                                    {filteredLedger.map((e) => {
                                                        const amountNum = typeof e.amount === "string" ? Number(e.amount) : e.amount;
                                                        const isNeg = amountNum < 0;
                                                        return (
                                                            <tr key={e.id}
                                                                onClick={() => { setEntryToEdit(e); setEditEntryOpen(true); }}
                                                                className="border-t border-slate-200 dark:border-slate-800">
                                                                <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                                                                    {new Date(e.entryDate).toLocaleString()}
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">
                                                                    {e.type}
                                                                  </span>
                                                                </td>
                                                                <td className={`px-3 py-2 text-right font-semibold ${isNeg ? "text-emerald-600" : "text-rose-600"}`}>
                                                                    {money(amountNum)} {e.currency}
                                                                </td>
                                                                <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{e.note}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <AddCityDialog
                open={cityModalOpen}
                onClose={() => setCityModalOpen(false)}
                onCreated={(id) => { setActiveCityId(id); setActiveClientId(null); }}
            />
            <AddClientDialog
                open={clientModalOpen}
                onClose={() => setClientModalOpen(false)}
                cityId={activeCityId}
            />
            <AddEntryDialog
                open={entryOpen}
                onClose={() => setEntryOpen(false)}
                clientId={activeClientId}
                mode={entryMode}
            />

            <EditCityDialog
                open={editCityOpen}
                onClose={() => setEditCityOpen(false)}
                city={cityToEdit}
            />
            <EditClientDialog
                open={editClientOpen}
                onClose={() => setEditClientOpen(false)}
                client={clientToEdit}
                cityId={activeCityId}
            />
            <EditLedgerEntryDialog
                open={editEntryOpen}
                onClose={() => setEditEntryOpen(false)}
                entry={entryToEdit}
                clientId={activeClientId}
            />

        </AppShell>
    );
}
