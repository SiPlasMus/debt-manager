import { api } from "./http";

export type ExchangeRate = {
    id: string;
    usdToUzs: string | number;
    usdToRub: string | number;
    updatedAt: string;
    updatedBy?: string | null;
};

export async function getExchangeRate(): Promise<ExchangeRate> {
    const r = await api.get("/api/exchange-rate");
    return r.data.data;
}

export async function updateExchangeRate(payload: {
    usdToUzs: number;
    usdToRub: number;
    updatedBy?: string;
}): Promise<ExchangeRate> {
    const r = await api.put("/api/exchange-rate", payload);
    return r.data.data;
}
