import "dotenv/config";
import { assessProject } from "../src/riskEngine.js";
import { saveProject } from "../src/store.js";
import { prisma } from "../src/db.js";

const DEMO_CREATOR_ADDRESS = "0xF07cc7DfEa269C8Ea36ed63538503A5b7f4484D8";

const SEED_PROJECTS = [
  {
    id: "SEED-1",
    sellerName: "สมชาย รักษ์โลก",
    projectName: "โครงการฟื้นฟูป่าชุมชน เชียงใหม่",
    province: "ChiangMai",
    landAreaRai: 240,
    projectType: "forest" as const,
    requestedCredits: 520,
    selfReportedReduction: 470,
    vintageYear: 2025,
  },
  {
    id: "SEED-2",
    sellerName: "สมชาย รักษ์โลก",
    projectName: "โครงการโซลาร์ชุมชน ขอนแก่น",
    province: "KhonKaen",
    landAreaRai: 130,
    projectType: "solar" as const,
    requestedCredits: 310,
    selfReportedReduction: 295,
    vintageYear: 2025,
  },
  {
    id: "SEED-3",
    sellerName: "สมชาย รักษ์โลก",
    projectName: "โครงการไบโอแก๊ส ฟาร์มพิษณุโลก",
    province: "Phitsanulok",
    landAreaRai: 88,
    projectType: "biogas" as const,
    requestedCredits: 260,
    selfReportedReduction: 240,
    vintageYear: 2024,
  },
] as const;

async function main() {
  console.log("🌱 Seeding DB with 3 initial demo projects...\n");

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
      }, DEMO_CREATOR_ADDRESS);
      console.log(
        `✅ ${id} saved — risk: ${assessment.riskScore}, trust: ${assessment.trustScore}, ` +
        `approved: ${assessment.approvedCredits} credits, creator: ${DEMO_CREATOR_ADDRESS}, ` +
        `source: ${(assessment.signals as { dataSource?: string }).dataSource ?? "unknown"}`
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
