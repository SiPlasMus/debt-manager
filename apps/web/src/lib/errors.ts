import type { AxiosError } from "axios";

export function getErrorMessage(err: unknown): string {
    // Axios error
    const e = err as AxiosError<any>;

    const data = e?.response?.data;

    // Our API: { ok:false, error:"ValidationError", details:{ fieldErrors... } }
    if (data?.error === "ValidationError" && data?.details) {
        const fe = data.details?.fieldErrors || {};
        const messages: string[] = [];

        for (const key of Object.keys(fe)) {
            const arr = fe[key];
            if (Array.isArray(arr) && arr.length) {
                messages.push(`${key}: ${arr[0]}`);
            }
        }

        if (messages.length) return messages.join(", ");
        return "Validation error";
    }

    // City delete custom error
    if (data?.error === "CityHasClients") {
        return data?.message || "Cannot delete city with active clients.";
    }

    // Generic { ok:false, error:"Something" }
    if (typeof data?.error === "string") return data.error;

    // Axios message fallback
    if (typeof e?.message === "string" && e.message) return e.message;

    return "Something went wrong";
}
