import { api } from "./http";
import type { Client } from "../types";

export async function getClientsByCity(cityId: string): Promise<Client[]> {
    const res = await api.get(`/api/cities/${cityId}/clients`);
    return res.data.data as Client[];
}

export async function createClient(payload: {
    cityId: string;
    name: string;
    phone?: string;
    tags?: string[];
}): Promise<Client> {
    const res = await api.post("/api/clients", payload);
    return res.data.data as Client;
}
export async function updateClient(
    id: string,
    payload: Partial<Pick<Client, "name" | "phone" | "tags" | "archived">>
): Promise<Client> {
    const res = await api.patch(`/api/clients/${id}`, payload);
    return res.data.data as Client;
}

export async function archiveClient(id: string): Promise<Client> {
    const res = await api.delete(`/api/clients/${id}`);
    return res.data.data as Client;
}