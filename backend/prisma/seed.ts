import "dotenv/config";
import { assessProject } from "../src/riskEngine.js";
import { saveProject } from "../src/store.js";
import { prisma } from "../src/db.js";

const SEED_PROJECTS = [
  {
    id: "SEED-1",
    sellerName: "บริษัท สยามกรีน จำกัด",
    projectName: "ป่าชายเลนอนุรักษ์ อ.ดอนสัก",
    province: "SuratThani",
    landAreaRai: 850,
    projectType: "mangrove" as const,
    requestedCredits: 420,
    selfReportedReduction: 380,
    vintageYear: 2024,
  },
  {
    id: "SEED-2",
    sellerName: "บริษัท โคราช โซลาร์ จำกัด",
    projectName: "โซลาร์ฟาร์ม อ.ปากช่อง",
    province: "NakhonRatchasima",
    landAreaRai: 1200,
    projectType: "solar" as const,
    requestedCredits: 680,
    selfReportedReduction: 650,
    vintageYear: 2024,
  },
  {
    id: "SEED-3",
    sellerName: "วิสาหกิจชุมชน ขอนแก่นไบโอแก๊ส",
    projectName: "ก๊าซชีวภาพจากฟาร์มสุกร ขอนแก่น",
    province: "KhonKaen",
    landAreaRai: 95,
    projectType: "biogas" as const,
    requestedCredits: 210,
    selfReportedReduction: 195,
    vintageYear: 2023,
  },
  {
    id: "SEED-4",
    sellerName: "มูลนิธิป่าเชียงใหม่",
    projectName: "ฟื้นฟูป่าต้นน้ำดอยอินทนนท์",
    province: "ChiangMai",
    landAreaRai: 3200,
    projectType: "forest" as const,
    requestedCredits: 960,
    selfReportedReduction: 890,
    vintageYear: 2024,
  },
  {
    id: "SEED-5",
    sellerName: "บริษัท ภูเก็ต ซันพาวเวอร์ จำกัด",
    projectName: "โซลาร์เซลล์หลังคาโรงแรม ภูเก็ต",
    province: "Phuket",
    landAreaRai: 18,
    projectType: "solar" as const,
    requestedCredits: 155,
    selfReportedReduction: 140,
    vintageYear: 2024,
  },
] as const;

async function main() {
  console.log("🌱 Seeding Neon DB with 5 Thai carbon projects...\n");

  for (const seed of SEED_PROJECTS) {
    const existing = await prisma.carbonProject.findUnique({ where: { id: seed.id } });
    if (existing) {
      console.log(`⏭  ${seed.id} already exists — skipping "${seed.projectName}"`);
      continue;
    }

    console.log(`📡 Assessing "${seed.projectName}" (${seed.province})...`);
    const { id, ...input } = seed;

    try {
      const assessment = await assessProject(input);
      await saveProject({
        id,
        createdAt: new Date().toISOString(),
        input,
        assessment,
      });
      console.log(
        `✅ ${id} saved — risk: ${assessment.riskScore}, trust: ${assessment.trustScore}, ` +
        `approved: ${assessment.approvedCredits} credits, source: ${(assessment.signals as { dataSource?: string }).dataSource ?? "unknown"}`
      );
    } catch (err) {
      console.error(`❌ ${id} failed:`, err instanceof Error ? err.message : err);
    }
  }

  await prisma.$disconnect();
  console.log("\n✅ Seed complete.");
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
