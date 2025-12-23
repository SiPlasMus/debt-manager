import { api } from "./http";
import type { City } from "../types";

export async function getCities(): Promise<City[]> {
    const res = await api.get("/api/cities");
    return res.data.data as City[];
}

export async function createCity(name: string): Promise<City> {
    const res = await api.post("/api/cities", { name });
    return res.data.data as City;
}
export async function updateCity(id: string, name: string): Promise<City> {
    const res = await api.patch(`/api/cities/${id}`, { name });
    return res.data.data as City;
}

export async function deleteCity(id: string): Promise<void> {
    await api.delete(`/api/cities/${id}`);
}