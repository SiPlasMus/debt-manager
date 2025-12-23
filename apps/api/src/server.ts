import express from "express";
import cors from "cors";
import { z } from "zod";
import { prisma } from "./prisma.js";

const app = express();
app.use(express.json());

const UuidParam = z.string().uuid();
function parseUuidParam(value: unknown, name: string) {
    const r = UuidParam.safeParse(value);
    if (!r.success) {
        const err = new Error(`Invalid ${name}`);
        // attach status so middleware can use it (simple pattern)
        (err as any).status = 400;
        throw err;
    }
    return r.data;
}

const allowlist = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
const corsOptions: cors.CorsOptions = {
    credentials: true,
    origin: (origin, cb) => {
        // allow same-origin / curl / server-to-server
        if (!origin) return cb(null, true);

        // dev: allow everything if allowlist not set
        if (allowlist.length === 0) return cb(null, true);

        if (allowlist.includes(origin)) return cb(null, true);
        return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
};
app.use(cors(corsOptions));

// Health
app.get("/health", (_req, res) => res.json({ ok: true }));

// Cities
app.get("/api/cities", async (_req, res) => {
    const cities = await prisma.city.findMany({ orderBy: { name: "asc" } });
    res.json({ ok: true, data: cities });
});

app.post("/api/cities", async (req, res) => {
    const body = z.object({ name: z.string().min(2) }).parse(req.body);
    const city = await prisma.city.create({ data: { name: body.name } });
    res.json({ ok: true, data: city });
});

// Clients (by city)
app.get("/api/cities/:cityId/clients", async (req, res) => {
    const cityId = parseUuidParam(req.params.cityId, "cityId");
    const clients = await prisma.client.findMany({
        where: { cityId, archived: false },
        orderBy: { updatedAt: "desc" },
    });
    res.json({ ok: true, data: clients });
});

app.post("/api/clients", async (req, res) => {
    const body = z.object({
        cityId: z.string().uuid("Invalid city id"),
        name: z.string().min(2, "Name must be at least 2 chars"),
        phone: z.string().optional().refine(
            (v) => !v || /^[+\d][\d\s-]{6,20}$/.test(v),
            "Phone looks incorrect"
        ),
        tags: z.array(z.string()).optional(),
    }).parse(req.body);

    const client = await prisma.client.create({
        data: {
            cityId: body.cityId,
            name: body.name,
            phone: body.phone,
            tags: body.tags ?? [],
        },
    });
    res.json({ ok: true, data: client });
});

// Ledger (by client)
app.get("/api/clients/:clientId/ledger", async (req, res) => {
    const clientId = parseUuidParam(req.params.clientId, "clientId");
    const rows = await prisma.ledgerEntry.findMany({
        where: { clientId },
        orderBy: { entryDate: "desc" },
    });
    res.json({ ok: true, data: rows });
});

// Create entry
app.post("/api/clients/:clientId/ledger", async (req, res) => {
    const clientId = parseUuidParam(req.params.clientId, "clientId");

    const body = z.object({
        type: z.enum(["DEBT_ADD", "PAYMENT", "ADJUSTMENT", "NOTE"]),
        amount: z.number().optional(),     // note can be omitted
        currency: z.string().min(1).optional().default("USD"),
        note: z.string().min(1),
        entryDate: z.string().datetime().optional(),
        createdBy: z.string().optional(),
    }).parse(req.body);

    // server-side normalization:
    let amount = Number(body.amount ?? 0);
    if (body.type === "PAYMENT" && amount > 0) amount = -amount;

    const row = await prisma.ledgerEntry.create({
        data: {
            clientId,
            type: body.type,
            amount,
            currency: body.currency,
            note: body.note,
            entryDate: body.entryDate ? new Date(body.entryDate) : new Date(),
            createdBy: body.createdBy ?? null,
        },
    });

    res.json({ ok: true, data: row });
});

// Exchange rate (single current row)
app.get("/api/exchange-rate", async (_req, res) => {
    let row = await prisma.exchangeRate.findFirst({ orderBy: { updatedAt: "desc" } });

    // auto-create default row if not exists
    if (!row) {
        row = await prisma.exchangeRate.create({
            data: {
                usdToUzs: 12000, // default - change if you want
                usdToRub: 100,   // default - change if you want
                updatedBy: null,
            },
        });
    }

    res.json({ ok: true, data: row });
});

app.put("/api/exchange-rate", async (req, res) => {
    const body = z.object({
        usdToUzs: z.number().positive(),
        usdToRub: z.number().positive(),
        updatedBy: z.string().optional(),
    }).parse(req.body);

    // later you will add auth/role check here

    const row = await prisma.exchangeRate.create({
        data: {
            usdToUzs: body.usdToUzs,
            usdToRub: body.usdToRub,
            updatedBy: body.updatedBy ?? null,
        },
    });

    res.json({ ok: true, data: row });
});

// Update city (rename)
app.patch("/api/cities/:cityId", async (req, res) => {
    const cityId = parseUuidParam(req.params.cityId, "cityId");
    const body = z.object({ name: z.string().min(2) }).parse(req.body);

    const city = await prisma.city.update({
        where: { id: cityId },
        data: { name: body.name },
    });

    res.json({ ok: true, data: city });
});

// Delete city (SAFE: forbid if has clients)
app.delete("/api/cities/:cityId", async (req, res) => {
    const cityId = parseUuidParam(req.params.cityId, "cityId");

    const count = await prisma.client.count({
        where: { cityId, archived: false },
    });

    if (count > 0) {
        return res.status(400).json({
            ok: false,
            error: "CityHasClients",
            message: "Cannot delete city with active clients. Archive or delete clients first.",
        });
    }

    await prisma.city.delete({ where: { id: cityId } });
    res.json({ ok: true });
});

// Update client
app.patch("/api/clients/:clientId", async (req, res) => {
    const clientId = parseUuidParam(req.params.clientId, "clientId");

    const body = z.object({
        name: z.string().min(2).optional(),
        phone: z.string().optional().nullable(),
        tags: z.array(z.string()).optional(),
        archived: z.boolean().optional(),
    }).parse(req.body);

    const client = await prisma.client.update({
        where: { id: clientId },
        data: {
            name: body.name,
            phone: body.phone,
            tags: body.tags,
            archived: body.archived,
        },
    });

    res.json({ ok: true, data: client });
});

// "Delete" client = archive
app.delete("/api/clients/:clientId", async (req, res) => {
    const clientId = parseUuidParam(req.params.clientId, "clientId");

    const client = await prisma.client.update({
        where: { id: clientId },
        data: { archived: true },
    });

    res.json({ ok: true, data: client });
});

// Update ledger entry by id
app.patch("/api/ledger/:entryId", async (req, res) => {
    const entryId = parseUuidParam(req.params.entryId, "entryId");

    const body = z.object({
        type: z.enum(["DEBT_ADD", "PAYMENT", "ADJUSTMENT", "NOTE"]).optional(),
        amount: z.number().optional(),
        currency: z.string().min(1).optional(),
        note: z.string().min(1).optional(),
        entryDate: z.string().datetime().optional(),
    }).parse(req.body);

    // fetch existing to normalize correctly
    const existing = await prisma.ledgerEntry.findUnique({ where: { id: entryId } });
    if (!existing) return res.status(404).json({ ok: false, error: "NotFound" });

    const newType = body.type ?? existing.type;
    let newAmount =
        body.amount === undefined ? Number(existing.amount) : Number(body.amount);

    // normalization: payments always negative
    if (newType === "PAYMENT" && newAmount > 0) newAmount = -newAmount;

    const row = await prisma.ledgerEntry.update({
        where: { id: entryId },
        data: {
            type: newType,
            amount: newAmount,
            currency: body.currency ?? existing.currency,
            note: body.note ?? existing.note,
            entryDate: body.entryDate ? new Date(body.entryDate) : existing.entryDate,
        },
    });

    res.json({ ok: true, data: row });
});

// Delete ledger entry by id
app.delete("/api/ledger/:entryId", async (req, res) => {
    const entryId = parseUuidParam(req.params.entryId, "entryId");
    await prisma.ledgerEntry.delete({ where: { id: entryId } });
    res.json({ ok: true });
});

import type { ErrorRequestHandler } from "express";
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
    // Zod validation errors
    if (err instanceof z.ZodError) {
        return res.status(400).json({
            ok: false,
            error: "ValidationError",
            details: err.flatten(),
        });
    }

    // our custom status errors
    const status = (err as any)?.status;
    if (typeof status === "number") {
        return res.status(status).json({ ok: false, error: err.message || "Error" });
    }

    console.error(err);
    res.status(500).json({ ok: false, error: "InternalServerError" });
};
app.use(errorHandler);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
