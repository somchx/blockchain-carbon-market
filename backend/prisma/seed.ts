import "dotenv/config";
import { assessProject } from "../src/riskEngine.js";
import { saveProject } from "../src/store.js";
import { prisma } from "../src/db.js";
import { DEMO_CREATOR_ADDRESS, DEMO_SEED_PROJECTS } from "./demoProjects.js";

async function main() {
  console.log(`🌱 Seeding DB with ${DEMO_SEED_PROJECTS.length} initial demo projects...\n`);

  for (const seed of DEMO_SEED_PROJECTS) {
    const existing = await prisma.carbonProject.findUnique({ where: { id: seed.id } });
    if (existing) {
      console.log(`⏭  ${seed.id} already exists — skipping "${seed.input.projectName}"`);
      continue;
    }

    console.log(`📡 Assessing "${seed.input.projectName}" (${seed.input.province})...`);
    const { id, input } = seed;

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
        `${seed.marketplaceReady ? "marketplace-ready seed, " : ""}` +
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
