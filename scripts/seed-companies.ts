import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { CURATED_COMPANIES } from "../src/lib/constants";

const databaseUrl = process.env.DATABASE_URL!;
const prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });

async function main() {
  console.log(`Seeding ${CURATED_COMPANIES.length} companies...`);

  for (const c of CURATED_COMPANIES) {
    await prisma.company.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        logo: c.logo,
        website: c.website,
        companyType: c.companyType,
        atsType: c.atsType,
        atsBoard: c.atsBoard,
      },
      create: {
        name: c.name,
        slug: c.slug,
        logo: c.logo,
        website: c.website,
        companyType: c.companyType,
        atsType: c.atsType,
        atsBoard: c.atsBoard,
      },
    });
    console.log(`  ✓ ${c.name}`);
  }

  console.log("Done!");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
