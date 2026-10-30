import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma";
import { signToken } from "../auth";
import { generatePersonCode, generateToken } from "../utils";
import { APP_BASE_URL } from "../config";

export const publicRouter = Router();

// Powers the /partners/<code> and /associates/<code> landing pages: who this link
// belongs to, which products they can sell, and (partners only) that they can
// recruit Associates under this same code.
publicRouter.get("/api/public/link/:code", async (req, res) => {
  const code = req.params.code;
  const products = await prisma.product.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } });

  const partner = await prisma.partner.findUnique({ where: { code } });
  if (partner) {
    if (partner.status !== "APPROVED") return res.status(404).json({ error: "This link is not active" });
    return res.json({
      ownerType: "PARTNER",
      ownerName: partner.name,
      code: partner.code,
      canRecruit: true,
      products: products.map((p) => ({ slug: p.slug, name: p.name, goUrl: `${APP_BASE_URL}/go/${partner.code}-${p.slug}` })),
    });
  }

  const associate = await prisma.associate.findUnique({ where: { code } });
  if (associate) {
    if (associate.status !== "APPROVED") return res.status(404).json({ error: "This link is not active" });
    return res.json({
      ownerType: "ASSOCIATE",
      ownerName: associate.name,
      code: associate.code,
      canRecruit: false,
      products: products.map((p) => ({ slug: p.slug, name: p.name, goUrl: `${APP_BASE_URL}/go/${associate.code}-${p.slug}` })),
    });
  }

  res.status(404).json({ error: "Link not found" });
});

// Click-through redirect: /go/<code> -> logs the click, redirects to the product with the ref param attached.
publicRouter.get("/go/:code", async (req, res) => {
  const link = await prisma.referralLink.findUnique({
    where: { code: req.params.code },
    include: { product: true },
  });
  if (!link || !link.product.active) {
    return res.status(404).send("Link not found");
  }
  await prisma.click.create({
    data: {
      code: link.code,
      productId: link.productId,
      ip: req.ip,
      userAgent: req.headers["user-agent"]?.toString(),
    },
  });
  const sep = link.product.baseUrl.includes("?") ? "&" : "?";
  const dest = `${link.product.baseUrl}${sep}${link.product.refParam}=${encodeURIComponent(link.code)}`;
  res.redirect(302, dest);
});

const applySchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().optional(),
});

// Public Partner application. Creates a PENDING partner; an admin approves it later.
publicRouter.post("/api/apply/partner", async (req, res) => {
  const parsed = applySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { name, email, phone, message } = parsed.data;
  const existing = await prisma.partner.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return res.status(409).json({ error: "An application or account already exists for this email" });

  const partner = await prisma.partner.create({
    data: {
      code: generatePersonCode(name),
      name,
      email: email.toLowerCase(),
      phone,
      notes: message,
      status: "PENDING",
    },
  });
  res.status(201).json({ id: partner.id, status: partner.status });
});

// Public Associate application, via a specific Partner's recruiting link (/partners/<code>).
// Creates a PENDING associate under that partner; the partner approves it from their own dashboard.
publicRouter.post("/api/apply/associate/:partnerCode", async (req, res) => {
  const parsed = applySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const partner = await prisma.partner.findUnique({ where: { code: req.params.partnerCode } });
  if (!partner || partner.status !== "APPROVED") {
    return res.status(404).json({ error: "This Partner link is not active" });
  }

  const { name, email, phone, message } = parsed.data;
  const existing = await prisma.associate.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return res.status(409).json({ error: "An application or account already exists for this email" });

  const associate = await prisma.associate.create({
    data: {
      code: generatePersonCode(name),
      name,
      email: email.toLowerCase(),
      phone,
      notes: message,
      partnerId: partner.id,
      status: "PENDING",
    },
  });
  res.status(201).json({ id: associate.id, status: associate.status, partnerName: partner.name });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

publicRouter.post("/api/auth/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const email = parsed.data.email.toLowerCase();

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (admin && (await bcrypt.compare(parsed.data.password, admin.passwordHash))) {
    const token = signToken({ sub: admin.id, role: "ADMIN", email: admin.email });
    return res.json({ token, role: "ADMIN", name: admin.name });
  }

  const partner = await prisma.partner.findUnique({ where: { email } });
  if (partner?.passwordHash && (await bcrypt.compare(parsed.data.password, partner.passwordHash))) {
    if (partner.status !== "APPROVED") return res.status(403).json({ error: `Account is ${partner.status.toLowerCase()}` });
    const token = signToken({ sub: partner.id, role: "PARTNER", email: partner.email });
    return res.json({ token, role: "PARTNER", name: partner.name, code: partner.code });
  }

  const associate = await prisma.associate.findUnique({ where: { email } });
  if (associate?.passwordHash && (await bcrypt.compare(parsed.data.password, associate.passwordHash))) {
    if (associate.status !== "APPROVED")
      return res.status(403).json({ error: `Account is ${associate.status.toLowerCase()}` });
    const token = signToken({ sub: associate.id, role: "ASSOCIATE", email: associate.email });
    return res.json({ token, role: "ASSOCIATE", name: associate.name, code: associate.code });
  }

  res.status(401).json({ error: "Invalid email or password" });
});

const setPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8),
});

publicRouter.post("/api/auth/set-password", async (req, res) => {
  const parsed = setPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { token, password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);

  const partner = await prisma.partner.findUnique({ where: { setPasswordToken: token } });
  if (partner) {
    if (!partner.setPasswordExpires || partner.setPasswordExpires < new Date()) {
      return res.status(400).json({ error: "This link has expired" });
    }
    await prisma.partner.update({
      where: { id: partner.id },
      data: { passwordHash, setPasswordToken: null, setPasswordExpires: null },
    });
    return res.json({ ok: true, role: "PARTNER" });
  }

  const associate = await prisma.associate.findUnique({ where: { setPasswordToken: token } });
  if (associate) {
    if (!associate.setPasswordExpires || associate.setPasswordExpires < new Date()) {
      return res.status(400).json({ error: "This link has expired" });
    }
    await prisma.associate.update({
      where: { id: associate.id },
      data: { passwordHash, setPasswordToken: null, setPasswordExpires: null },
    });
    return res.json({ ok: true, role: "ASSOCIATE" });
  }

  res.status(404).json({ error: "Invalid or already-used link" });
});

// One-time bootstrap for the very first admin account. Only works for an allow-listed email
// and only while no admin exists yet for it.
publicRouter.post("/api/admin/bootstrap", async (req, res) => {
  const parsed = loginSchema.extend({ name: z.string().min(2) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const email = parsed.data.email.toLowerCase();

  const { BOOTSTRAP_ADMIN_EMAILS } = await import("../config");
  if (!BOOTSTRAP_ADMIN_EMAILS.includes(email)) {
    return res.status(403).json({ error: "This email is not allowed to bootstrap an admin account" });
  }
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Admin already exists, use /api/auth/login" });

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const admin = await prisma.adminUser.create({
    data: { email, passwordHash, name: parsed.data.name },
  });
  const token = signToken({ sub: admin.id, role: "ADMIN", email: admin.email });
  res.status(201).json({ token, role: "ADMIN" });
});

export { generateToken };
