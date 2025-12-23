import { api } from "./http";

import type { LedgerType, LedgerEntry } from "../types";

export async function getLedger(clientId: string): Promise<LedgerEntry[]> {
    const r = await api.get(`/api/clients/${clientId}/ledger`);
    return r.data.data;
}

export async function createLedgerEntry(
    clientId: string,
    payload: {
        type: LedgerType;
        amount?: number;
        currency?: string;
        note: string;
        entryDate?: string;
    }
) {
    const r = await api.post(`/api/clients/${clientId}/ledger`, payload);
    return r.data.data as LedgerEntry;
}
export async function updateLedgerEntry(
    entryId: string,
    payload: Partial<{
        type: LedgerType;
        amount: number;
        currency: string;
        note: string;
        entryDate: string;
    }>
) {
    const r = await api.patch(`/api/ledger/${entryId}`, payload);
    return r.data.data as LedgerEntry;
}

export async function deleteLedgerEntry(entryId: string) {
    await api.delete(`/api/ledger/${entryId}`);
}