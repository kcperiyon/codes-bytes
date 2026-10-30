import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth } from "../auth";
import { linksForOwner } from "../services/links";
import { availableBalance, requestPayout, PayoutError } from "../services/commissions";

export const associateRouter = Router();
associateRouter.use("/api/associate", requireAuth("ASSOCIATE"));

function me(req: any) {
  return req.auth.sub as string;
}

associateRouter.get("/api/associate/me", async (req, res) => {
  const associate = await prisma.associate.findUnique({
    where: { id: me(req) },
    include: { partner: { select: { id: true, name: true, code: true } } },
  });
  if (!associate) return res.status(404).json({ error: "Not found" });
  const { passwordHash, setPasswordToken, ...safe } = associate;
  res.json(safe);
});

associateRouter.get("/api/associate/links", async (req, res) => {
  res.json(await linksForOwner("ASSOCIATE", me(req)));
});

associateRouter.get("/api/associate/sales", async (req, res) => {
  const sales = await prisma.sale.findMany({
    where: { associateId: me(req) },
    include: { product: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  res.json(sales);
});

associateRouter.get("/api/associate/commissions", async (req, res) => {
  const commissions = await prisma.commission.findMany({
    where: { associateId: me(req), beneficiaryType: "ASSOCIATE" },
    include: { sale: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  res.json(commissions);
});

associateRouter.get("/api/associate/balance", async (req, res) => {
  const associate = await prisma.associate.findUnique({ where: { id: me(req) } });
  const products = await prisma.product.findMany();
  const currencies = [...new Set(products.flatMap((p) => p.currencies))];
  const balances = await Promise.all(
    currencies.map(async (currency) => ({ currency, amountMinor: await availableBalance("ASSOCIATE", me(req), currency) }))
  );
  res.json({ status: associate?.status, balances: balances.filter((b) => b.amountMinor !== 0) });
});

const payoutSchema = z.object({ currency: z.string().length(3) });

associateRouter.post("/api/associate/payouts", async (req, res) => {
  const associate = await prisma.associate.findUnique({ where: { id: me(req) } });
  if (associate?.status !== "APPROVED") return res.status(403).json({ error: "Account is not in good standing" });
  const parsed = payoutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const payout = await requestPayout("ASSOCIATE", me(req), parsed.data.currency);
    res.status(201).json(payout);
  } catch (err) {
    if (err instanceof PayoutError) return res.status(400).json({ error: err.message });
    throw err;
  }
});

associateRouter.get("/api/associate/payouts", async (req, res) => {
  const payouts = await prisma.payoutRequest.findMany({
    where: { associateId: me(req) },
    orderBy: { requestedAt: "desc" },
  });
  res.json(payouts);
});
