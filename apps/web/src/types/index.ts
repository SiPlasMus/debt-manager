export type City = {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
};

export type Client = {
    id: string;
    cityId: string;
    name: string;
    phone?: string | null;
    tags: string[];
    archived: boolean;
    createdAt: string;
    updatedAt: string;
};

export type LedgerType = "DEBT_ADD" | "PAYMENT" | "ADJUSTMENT" | "NOTE";

export type LedgerEntry = {
    id: string;
    clientId: string;
    type: LedgerType;
    amount: string | number; // backend might return string for numeric/decimal
    currency: string;
    note: string;
    entryDate: string;
    createdBy?: string | null;
    createdAt: string;
    updatedAt: string;
};
