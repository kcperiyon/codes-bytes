import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { recordSale, recordRefund, SaleError } from "../services/commissions";

export const ingestRouter = Router();

// Every call must carry the header `x-api-secret` matching that product's Product.apiSecret.
async function requireProductSecret(req: any, res: any, next: any) {
  const slug = req.params.productSlug;
  const product = await prisma.product.findUnique({ where: { slug } });
  if (!product) return res.status(404).json({ error: "Unknown product" });
  const secret = req.headers["x-api-secret"];
  if (!secret || secret !== product.apiSecret) {
    return res.status(401).json({ error: "Invalid product API secret" });
  }
  req.product = product;
  next();
}

const saleSchema = z.object({
  externalSaleId: z.string().min(1),
  refCode: z.string().min(1),
  amountMinor: z.number().int().positive(),
  currency: z.string().min(3).max(3),
  customerEmail: z.string().email().optional(),
});

ingestRouter.post("/api/ingest/:productSlug/sale", requireProductSecret, async (req, res) => {
  const parsed = saleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const result = await recordSale({ productSlug: req.params.productSlug, ...parsed.data });
    res.status(result.duplicate ? 200 : 201).json({
      saleId: result.sale.id,
      duplicate: result.duplicate,
      commissions: result.commissions.length,
    });
  } catch (err) {
    if (err instanceof SaleError) return res.status(400).json({ error: err.message });
    throw err;
  }
});

const refundSchema = z.object({ externalSaleId: z.string().min(1) });

ingestRouter.post("/api/ingest/:productSlug/refund", requireProductSecret, async (req, res) => {
  const parsed = refundSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const sale = await recordRefund(req.params.productSlug, parsed.data.externalSaleId);
    res.json({ saleId: sale.id, status: sale.status });
  } catch (err) {
    if (err instanceof SaleError) return res.status(400).json({ error: err.message });
    throw err;
  }
});
