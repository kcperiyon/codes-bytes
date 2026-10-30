import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth } from "../auth";
import { ensureLinksForOwner, linksForOwner } from "../services/links";
import { availableBalance, requestPayout, PayoutError } from "../services/commissions";
import { generatePersonCode, generateToken } from "../utils";
import { APP_BASE_URL } from "../config";

export const partnerRouter = Router();
partnerRouter.use("/api/partner", requireAuth("PARTNER"));

function me(req: any) {
  return req.auth.sub as string;
}

partnerRouter.get("/api/partner/me", async (req, res) => {
  const partner = await prisma.partner.findUnique({ where: { id: me(req) } });
  if (!partner) return res.status(404).json({ error: "Not found" });
  const { passwordHash, setPasswordToken, ...safe } = partner;
  res.json(safe);
});

partnerRouter.get("/api/partner/links", async (req, res) => {
  res.json(await linksForOwner("PARTNER", me(req)));
});

partnerRouter.get("/api/partner/associates", async (req, res) => {
  const associates = await prisma.associate.findMany({
    where: { partnerId: me(req) },
    orderBy: { createdAt: "desc" },
  });
  res.json(associates.map(({ passwordHash, setPasswordToken, ...safe }) => safe));
});

const addAssociateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
});

partnerRouter.post("/api/partner/associates", async (req, res) => {
  const parsed = addAssociateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const email = parsed.data.email.toLowerCase();
  if (await prisma.associate.findUnique({ where: { email } })) {
    return res.status(409).json({ error: "An associate with this email already exists" });
  }
  const code = generatePersonCode(parsed.data.name);
  const token = generateToken();
  const associate = await prisma.associate.create({
    data: {
      ...parsed.data,
      email,
      code,
      partnerId: me(req),
      status: "APPROVED",
      approvedAt: new Date(),
      setPasswordToken: token,
      setPasswordExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  await ensureLinksForOwner("ASSOCIATE", associate.id, associate.code);
  res.status(201).json({
    associate: { ...associate, passwordHash: undefined, setPasswordToken: undefined },
    setPasswordLink: `${APP_BASE_URL}/set-password?token=${token}`,
  });
});

partnerRouter.post("/api/partner/associates/:id/approve", async (req, res) => {
  const associate = await prisma.associate.findFirst({ where: { id: req.params.id, partnerId: me(req), status: "PENDING" } });
  if (!associate) return res.status(404).json({ error: "Not found" });
  const token = generateToken();
  const updated = await prisma.associate.update({
    where: { id: associate.id },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      setPasswordToken: token,
      setPasswordExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  await ensureLinksForOwner("ASSOCIATE", updated.id, updated.code);
  res.json({
    associate: { ...updated, passwordHash: undefined, setPasswordToken: undefined },
    setPasswordLink: `${APP_BASE_URL}/set-password?token=${token}`,
  });
});

partnerRouter.post("/api/partner/associates/:id/reject", async (req, res) => {
  const associate = await prisma.associate.findFirst({ where: { id: req.params.id, partnerId: me(req), status: "PENDING" } });
  if (!associate) return res.status(404).json({ error: "Not found" });
  const updated = await prisma.associate.update({ where: { id: associate.id }, data: { status: "REJECTED" } });
  res.json({ ...updated, passwordHash: undefined, setPasswordToken: undefined });
});

partnerRouter.post("/api/partner/associates/:id/suspend", async (req, res) => {
  const associate = await prisma.associate.findFirst({ where: { id: req.params.id, partnerId: me(req) } });
  if (!associate) return res.status(404).json({ error: "Not found" });
  const updated = await prisma.associate.update({
    where: { id: associate.id },
    data: { status: "SUSPENDED", suspendedAt: new Date() },
  });
  res.json({ ...updated, passwordHash: undefined, setPasswordToken: undefined });
});

partnerRouter.post("/api/partner/associates/:id/reinstate", async (req, res) => {
  const associate = await prisma.associate.findFirst({ where: { id: req.params.id, partnerId: me(req) } });
  if (!associate) return res.status(404).json({ error: "Not found" });
  const updated = await prisma.associate.update({
    where: { id: associate.id },
    data: { status: "APPROVED", suspendedAt: null },
  });
  res.json({ ...updated, passwordHash: undefined, setPasswordToken: undefined });
});

// Own direct sales + overrides earned from associates.
partnerRouter.get("/api/partner/sales", async (req, res) => {
  const sales = await prisma.sale.findMany({
    where: { OR: [{ partnerId: me(req) }, { overridePartnerId: me(req) }] },
    include: { product: true, associate: { select: { id: true, name: true, code: true } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  res.json(sales);
});

partnerRouter.get("/api/partner/commissions", async (req, res) => {
  const commissions = await prisma.commission.findMany({
    where: { partnerId: me(req), beneficiaryType: "PARTNER" },
    include: { sale: { include: { product: true, associate: true } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  res.json(commissions);
});

partnerRouter.get("/api/partner/balance", async (req, res) => {
  const partner = await prisma.partner.findUnique({ where: { id: me(req) } });
  const products = await prisma.product.findMany();
  const currencies = [...new Set(products.flatMap((p) => p.currencies))];
  const balances = await Promise.all(
    currencies.map(async (currency) => ({ currency, amountMinor: await availableBalance("PARTNER", me(req), currency) }))
  );
  res.json({ status: partner?.status, balances: balances.filter((b) => b.amountMinor !== 0) });
});

const payoutSchema = z.object({ currency: z.string().length(3) });

partnerRouter.post("/api/partner/payouts", async (req, res) => {
  const partner = await prisma.partner.findUnique({ where: { id: me(req) } });
  if (partner?.status !== "APPROVED") return res.status(403).json({ error: "Account is not in good standing" });
  const parsed = payoutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const payout = await requestPayout("PARTNER", me(req), parsed.data.currency);
    res.status(201).json(payout);
  } catch (err) {
    if (err instanceof PayoutError) return res.status(400).json({ error: err.message });
    throw err;
  }
});

partnerRouter.get("/api/partner/payouts", async (req, res) => {
  const payouts = await prisma.payoutRequest.findMany({
    where: { partnerId: me(req) },
    orderBy: { requestedAt: "desc" },
  });
  res.json(payouts);
});
