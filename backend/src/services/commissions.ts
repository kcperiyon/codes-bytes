import { prisma } from "../prisma";
import { DIRECT_RATE_BP, OVERRIDE_RATE_BP } from "../config";

export interface RecordSaleInput {
  productSlug: string;
  externalSaleId: string;
  refCode: string;
  amountMinor: number;
  currency: string;
  customerEmail?: string;
}

export class SaleError extends Error {}

/**
 * Called when a product reports a completed sale. Idempotent on (productId, externalSaleId).
 * Creates the Sale row and, where the owner is in good standing, the commission rows:
 *  - direct 20% to whoever's link was used (partner or associate)
 *  - +5% override to the associate's recruiting partner, if the sale came via an associate
 */
export async function recordSale(input: RecordSaleInput) {
  const product = await prisma.product.findUnique({ where: { slug: input.productSlug } });
  if (!product || !product.active) throw new SaleError("Unknown or inactive product");
  if (!product.currencies.includes(input.currency)) {
    throw new SaleError(`Product ${input.productSlug} does not support currency ${input.currency}`);
  }
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new SaleError("amountMinor must be a positive integer");
  }

  const existing = await prisma.sale.findUnique({
    where: { productId_externalSaleId: { productId: product.id, externalSaleId: input.externalSaleId } },
  });
  if (existing) return { sale: existing, commissions: [], duplicate: true as const };

  const link = await prisma.referralLink.findUnique({
    where: { code: input.refCode },
    include: { partner: true, associate: { include: { partner: true } } },
  });
  if (!link) throw new SaleError(`Unknown referral code: ${input.refCode}`);
  if (link.productId !== product.id) {
    throw new SaleError(`Referral code ${input.refCode} does not belong to product ${input.productSlug}`);
  }

  const overridePartnerId = link.ownerType === "ASSOCIATE" ? link.associate?.partnerId ?? null : null;

  const sale = await prisma.sale.create({
    data: {
      productId: product.id,
      externalSaleId: input.externalSaleId,
      refCode: input.refCode,
      ownerType: link.ownerType,
      partnerId: link.ownerType === "PARTNER" ? link.partnerId : null,
      associateId: link.ownerType === "ASSOCIATE" ? link.associateId : null,
      overridePartnerId,
      amountMinor: input.amountMinor,
      currency: input.currency,
      customerEmail: input.customerEmail,
      status: "PENDING",
    },
  });

  const commissions = [];

  // Direct commission to whoever's own link made the sale.
  const directBeneficiary =
    link.ownerType === "PARTNER"
      ? { type: "PARTNER" as const, id: link.partnerId!, status: link.partner?.status }
      : { type: "ASSOCIATE" as const, id: link.associateId!, status: link.associate?.status };

  if (directBeneficiary.status === "APPROVED") {
    commissions.push(
      await prisma.commission.create({
        data: {
          saleId: sale.id,
          beneficiaryType: directBeneficiary.type,
          partnerId: directBeneficiary.type === "PARTNER" ? directBeneficiary.id : null,
          associateId: directBeneficiary.type === "ASSOCIATE" ? directBeneficiary.id : null,
          role: "DIRECT",
          rateBp: DIRECT_RATE_BP,
          amountMinor: Math.round((input.amountMinor * DIRECT_RATE_BP) / 10000),
          currency: input.currency,
          status: "PENDING",
        },
      })
    );
  }

  // +5% override to the recruiting partner, only when the sale came through an associate.
  if (link.ownerType === "ASSOCIATE" && link.associate?.partner) {
    if (link.associate.partner.status === "APPROVED") {
      commissions.push(
        await prisma.commission.create({
          data: {
            saleId: sale.id,
            beneficiaryType: "PARTNER",
            partnerId: link.associate.partner.id,
            role: "OVERRIDE",
            rateBp: OVERRIDE_RATE_BP,
            amountMinor: Math.round((input.amountMinor * OVERRIDE_RATE_BP) / 10000),
            currency: input.currency,
            status: "PENDING",
          },
        })
      );
    }
  }

  return { sale, commissions, duplicate: false as const };
}

/**
 * Called when a product reports a refund. Unpaid commissions are simply cancelled;
 * commissions already marked PAID get a negative clawback row that nets out of the
 * beneficiary's next payout (money already paid out can't be un-paid automatically).
 */
export async function recordRefund(productSlug: string, externalSaleId: string) {
  const product = await prisma.product.findUnique({ where: { slug: productSlug } });
  if (!product) throw new SaleError("Unknown product");
  const sale = await prisma.sale.findUnique({
    where: { productId_externalSaleId: { productId: product.id, externalSaleId } },
    include: { commissions: true },
  });
  if (!sale) throw new SaleError("Unknown sale");
  if (sale.status === "REFUNDED") return sale;

  for (const c of sale.commissions) {
    if (c.status === "PENDING" || c.status === "APPROVED") {
      await prisma.commission.update({
        where: { id: c.id },
        data: { status: "CLAWED_BACK", clawedBackAt: new Date() },
      });
    } else if (c.status === "PAID") {
      await prisma.commission.create({
        data: {
          saleId: sale.id,
          beneficiaryType: c.beneficiaryType,
          partnerId: c.partnerId,
          associateId: c.associateId,
          role: c.role,
          rateBp: c.rateBp,
          amountMinor: -c.amountMinor,
          currency: c.currency,
          status: "APPROVED", // immediately available to net against the next payout
        },
      });
    }
  }

  return prisma.sale.update({ where: { id: sale.id }, data: { status: "REFUNDED" } });
}

export class PayoutError extends Error {}

/**
 * Locks the beneficiary's currently-approved, unlocked commissions into a new payout request.
 * The admin later marks it paid (flips those commissions to PAID) or rejects it (unlocks them).
 */
export async function requestPayout(beneficiaryType: "PARTNER" | "ASSOCIATE", beneficiaryId: string, currency: string) {
  const beneficiaryWhere =
    beneficiaryType === "PARTNER" ? { partnerId: beneficiaryId } : { associateId: beneficiaryId };

  return prisma.$transaction(async (tx) => {
    const eligible = await tx.commission.findMany({
      where: { ...beneficiaryWhere, beneficiaryType, currency, status: "APPROVED", payoutRequestId: null },
    });
    const amountMinor = eligible.reduce((sum, c) => sum + c.amountMinor, 0);
    if (amountMinor <= 0) throw new PayoutError("No available balance in this currency");

    const payout = await tx.payoutRequest.create({
      data: {
        beneficiaryType,
        partnerId: beneficiaryType === "PARTNER" ? beneficiaryId : null,
        associateId: beneficiaryType === "ASSOCIATE" ? beneficiaryId : null,
        currency,
        amountMinor,
        status: "REQUESTED",
      },
    });
    await tx.commission.updateMany({
      where: { id: { in: eligible.map((c) => c.id) } },
      data: { payoutRequestId: payout.id },
    });
    return payout;
  });
}

export async function availableBalance(
  beneficiaryType: "PARTNER" | "ASSOCIATE",
  beneficiaryId: string,
  currency: string
) {
  const where =
    beneficiaryType === "PARTNER"
      ? { partnerId: beneficiaryId, beneficiaryType: "PARTNER" as const }
      : { associateId: beneficiaryId, beneficiaryType: "ASSOCIATE" as const };

  const rows = await prisma.commission.findMany({
    where: { ...where, currency, status: "APPROVED", payoutRequestId: null },
  });
  return rows.reduce((sum, r) => sum + r.amountMinor, 0);
}
