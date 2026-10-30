import { prisma } from "../prisma";
import { OwnerType } from "@prisma/client";
import { APP_BASE_URL } from "../config";

// Generates (or backfills) one referral link per active product for a partner or associate.
export async function ensureLinksForOwner(ownerType: OwnerType, ownerId: string, ownerCode: string) {
  const products = await prisma.product.findMany({ where: { active: true } });
  for (const product of products) {
    const code = `${ownerCode}-${product.slug}`;
    const where =
      ownerType === "PARTNER"
        ? { ownerType: "PARTNER" as const, partnerId: ownerId, associateId: null, productId: product.id }
        : { ownerType: "ASSOCIATE" as const, associateId: ownerId, partnerId: null, productId: product.id };

    const existing = await prisma.referralLink.findFirst({ where });
    if (!existing) {
      await prisma.referralLink.create({
        data: {
          code,
          ownerType,
          productId: product.id,
          partnerId: ownerType === "PARTNER" ? ownerId : null,
          associateId: ownerType === "ASSOCIATE" ? ownerId : null,
        },
      });
    }
  }
}

export async function linksForOwner(ownerType: OwnerType, ownerId: string) {
  const links = await prisma.referralLink.findMany({
    where:
      ownerType === "PARTNER"
        ? { ownerType: "PARTNER", partnerId: ownerId }
        : { ownerType: "ASSOCIATE", associateId: ownerId },
    include: { product: true },
  });
  return links.map((l) => ({
    product: l.product.slug,
    productName: l.product.name,
    code: l.code,
    url: `${APP_BASE_URL}/go/${l.code}`,
  }));
}
