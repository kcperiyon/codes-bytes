import "dotenv/config";
import { prisma } from "./prisma";
import { generateToken } from "./utils";

async function upsertProduct(slug: string, name: string, baseUrl: string, currencies: string[]) {
  const existing = await prisma.product.findUnique({ where: { slug } });
  if (existing) {
    console.log(`Product ${slug} already exists, skipping.`);
    return existing;
  }
  const product = await prisma.product.create({
    data: { slug, name, baseUrl, currencies, apiSecret: generateToken() },
  });
  console.log(`Created product ${slug}. API secret (give this to that product's team, store nowhere else): ${product.apiSecret}`);
  return product;
}

async function main() {
  await upsertProduct("flux9", "Flux9", "https://flux9webinars.com", ["USD", "NGN"]);
  await upsertProduct("taxmasteragent", "TaxMasterAgent", "https://taxmasteragent.com", ["NGN"]);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
