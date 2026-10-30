import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma";
import { requireAuth } from "../auth";
import { ensureLinksForOwner } from "../services/links";
import { generatePersonCode, generateToken } from "../utils";
import { APP_BASE_URL } from "../config";

export const adminRouter = Router();
// Scoped to /api/admin only — an unscoped `.use(requireAuth(...))` would intercept every
// request that reaches this router (e.g. /healthz, or partner/associate routes mounted after it).
adminRouter.use("/api/admin", requireAuth("ADMIN"));

const SET_PASSWORD_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const changePasswordSchema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8) });

adminRouter.post("/api/admin/change-password", async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const admin = await prisma.adminUser.findUnique({ where: { id: (req as any).auth.sub } });
  if (!admin) return res.status(404).json({ error: "Not found" });
  const ok = await bcrypt.compare(parsed.data.currentPassword, admin.passwordHash);
  if (!ok) return res.status(401).json({ error: "Current password is incorrect" });
  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.adminUser.update({ where: { id: admin.id }, data: { passwordHash } });
  res.json({ ok: true });
});

function setPasswordLink(token: string) {
  return `${APP_BASE_URL}/set-password?token=${token}`;
}

// ---- Overview ----
adminRouter.get("/api/admin/overview", async (_req, res) => {
  const [products, partners, associates, pendingPartners, sales, pendingCommissions, payoutRequests] =
    await Promise.all([
      prisma.product.count(),
      prisma.partner.count({ where: { status: "APPROVED" } }),
      prisma.associate.count({ where: { status: "APPROVED" } }),
      prisma.partner.count({ where: { status: "PENDING" } }),
      prisma.sale.groupBy({ by: ["currency"], _sum: { amountMinor: true }, _count: true }),
      prisma.commission.groupBy({
        by: ["currency"],
        where: { status: "PENDING" },
        _sum: { amountMinor: true },
      }),
      prisma.payoutRequest.count({ where: { status: "REQUESTED" } }),
    ]);
  res.json({ products, partners, associates, pendingPartners, sales, pendingCommissions, payoutRequests });
});

// ---- Products ----
adminRouter.get("/api/admin/products", async (_req, res) => {
  res.json(await prisma.product.findMany({ orderBy: { createdAt: "asc" } }));
});

const productSchema = z.object({
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2),
  baseUrl: z.string().url(),
  refParam: z.string().min(1).default("cb_ref"),
  currencies: z.array(z.string().length(3)).min(1),
});

adminRouter.post("/api/admin/products", async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const apiSecret = generateToken();
  const product = await prisma.product.create({ data: { ...parsed.data, apiSecret } });
  res.status(201).json(product);
});

adminRouter.patch("/api/admin/products/:id", async (req, res) => {
  const patch = productSchema.partial().safeParse(req.body);
  if (!patch.success) return res.status(400).json({ error: patch.error.flatten() });
  const product = await prisma.product.update({ where: { id: req.params.id }, data: patch.data });
  res.json(product);
});

adminRouter.post("/api/admin/products/:id/rotate-secret", async (req, res) => {
  const apiSecret = generateToken();
  const product = await prisma.product.update({ where: { id: req.params.id }, data: { apiSecret } });
  res.json({ apiSecret: product.apiSecret });
});

adminRouter.patch("/api/admin/products/:id/active", async (req, res) => {
  const schema = z.object({ active: z.boolean() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const product = await prisma.product.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(product);
});

// ---- Partners ----
adminRouter.get("/api/admin/partners", async (req, res) => {
  const status = req.query.status as string | undefined;
  const partners = await prisma.partner.findMany({
    where: status ? { status: status as any } : undefined,
    include: { _count: { select: { associates: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(partners);
});

const createPartnerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
});

// Admin-created partner (bypasses the public application, already approved).
adminRouter.post("/api/admin/partners", async (req, res) => {
  const parsed = createPartnerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const email = parsed.data.email.toLowerCase();
  if (await prisma.partner.findUnique({ where: { email } })) {
    return res.status(409).json({ error: "A partner with this email already exists" });
  }
  const code = generatePersonCode(parsed.data.name);
  const token = generateToken();
  const partner = await prisma.partner.create({
    data: {
      ...parsed.data,
      email,
      code,
      status: "APPROVED",
      approvedAt: new Date(),
      setPasswordToken: token,
      setPasswordExpires: new Date(Date.now() + SET_PASSWORD_WINDOW_MS),
    },
  });
  await ensureLinksForOwner("PARTNER", partner.id, partner.code);
  res.status(201).json({ partner, setPasswordLink: setPasswordLink(token) });
});

adminRouter.post("/api/admin/partners/:id/approve", async (req, res) => {
  const partner = await prisma.partner.findUnique({ where: { id: req.params.id } });
  if (!partner) return res.status(404).json({ error: "Not found" });
  const token = generateToken();
  const updated = await prisma.partner.update({
    where: { id: partner.id },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      setPasswordToken: token,
      setPasswordExpires: new Date(Date.now() + SET_PASSWORD_WINDOW_MS),
    },
  });
  await ensureLinksForOwner("PARTNER", updated.id, updated.code);
  res.json({ partner: updated, setPasswordLink: setPasswordLink(token) });
});

adminRouter.post("/api/admin/partners/:id/reject", async (req, res) => {
  const partner = await prisma.partner.update({ where: { id: req.params.id }, data: { status: "REJECTED" } });
  res.json(partner);
});

adminRouter.post("/api/admin/partners/:id/suspend", async (req, res) => {
  const partner = await prisma.partner.update({
    where: { id: req.params.id },
    data: { status: "SUSPENDED", suspendedAt: new Date() },
  });
  res.json(partner);
});

adminRouter.post("/api/admin/partners/:id/reinstate", async (req, res) => {
  const partner = await prisma.partner.update({
    where: { id: req.params.id },
    data: { status: "APPROVED", suspendedAt: null },
  });
  res.json(partner);
});

// ---- Associates (read + moderation only; creation happens via the owning partner) ----
adminRouter.get("/api/admin/associates", async (req, res) => {
  const status = req.query.status as string | undefined;
  const associates = await prisma.associate.findMany({
    where: status ? { status: status as any } : undefined,
    include: { partner: { select: { id: true, name: true, code: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(associates);
});

adminRouter.post("/api/admin/associates/:id/suspend", async (req, res) => {
  const associate = await prisma.associate.update({
    where: { id: req.params.id },
    data: { status: "SUSPENDED", suspendedAt: new Date() },
  });
  res.json(associate);
});

adminRouter.post("/api/admin/associates/:id/reinstate", async (req, res) => {
  const associate = await prisma.associate.update({
    where: { id: req.params.id },
    data: { status: "APPROVED", suspendedAt: null },
  });
  res.json(associate);
});

// ---- Sales ----
adminRouter.get("/api/admin/sales", async (req, res) => {
  const { productSlug, status } = req.query as { productSlug?: string; status?: string };
  const sales = await prisma.sale.findMany({
    where: {
      status: status ? (status as any) : undefined,
      product: productSlug ? { slug: productSlug } : undefined,
    },
    include: { product: true, partner: true, associate: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  res.json(sales);
});

// ---- Commissions ----
adminRouter.get("/api/admin/commissions", async (req, res) => {
  const { status } = req.query as { status?: string };
  const commissions = await prisma.commission.findMany({
    where: status ? { status: status as any } : undefined,
    include: { sale: { include: { product: true } }, partner: true, associate: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  res.json(commissions);
});

const idsSchema = z.object({ ids: z.array(z.string()).optional() });

adminRouter.post("/api/admin/commissions/approve", async (req, res) => {
  const parsed = idsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const where = parsed.data.ids?.length ? { id: { in: parsed.data.ids }, status: "PENDING" as const } : { status: "PENDING" as const };
  const result = await prisma.commission.updateMany({ where, data: { status: "APPROVED", approvedAt: new Date() } });
  res.json({ approved: result.count });
});

// ---- Payouts ----
adminRouter.get("/api/admin/payouts", async (req, res) => {
  const { status } = req.query as { status?: string };
  const payouts = await prisma.payoutRequest.findMany({
    where: status ? { status: status as any } : undefined,
    include: { partner: true, associate: true },
    orderBy: { requestedAt: "desc" },
  });
  res.json(payouts);
});

const decidePayoutSchema = z.object({ reference: z.string().optional(), note: z.string().optional() });

adminRouter.post("/api/admin/payouts/:id/mark-paid", async (req, res) => {
  const parsed = decidePayoutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const payout = await prisma.payoutRequest.findUnique({ where: { id: req.params.id } });
  if (!payout || payout.status !== "REQUESTED") return res.status(400).json({ error: "Payout not awaiting a decision" });

  await prisma.$transaction([
    prisma.payoutRequest.update({
      where: { id: payout.id },
      data: { status: "PAID", decidedAt: new Date(), reference: parsed.data.reference, note: parsed.data.note },
    }),
    prisma.commission.updateMany({ where: { payoutRequestId: payout.id }, data: { status: "PAID" } }),
  ]);
  res.json({ ok: true });
});

adminRouter.post("/api/admin/payouts/:id/reject", async (req, res) => {
  const parsed = decidePayoutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const payout = await prisma.payoutRequest.findUnique({ where: { id: req.params.id } });
  if (!payout || payout.status !== "REQUESTED") return res.status(400).json({ error: "Payout not awaiting a decision" });

  await prisma.$transaction([
    prisma.payoutRequest.update({
      where: { id: payout.id },
      data: { status: "REJECTED", decidedAt: new Date(), note: parsed.data.note },
    }),
    // release the commissions back to the available balance
    prisma.commission.updateMany({ where: { payoutRequestId: payout.id }, data: { payoutRequestId: null } }),
  ]);
  res.json({ ok: true });
});
