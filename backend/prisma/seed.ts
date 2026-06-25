import "dotenv/config";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { assessProject } from "../src/riskEngine.js";
import { saveProject, saveEvidence } from "../src/store.js";
import { prisma } from "../src/db.js";
import { uploadFileToIPFS } from "../src/ipfsService.js";
import { DEMO_CREATOR_ADDRESS, DEMO_SEED_PROJECTS } from "./demoProjects.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_FILE_PATH = join(__dirname, "..", "..", "testfile.pdf");

async function attachEvidence(projectId: string): Promise<void> {
  const buffer = readFileSync(EVIDENCE_FILE_PATH);
  const fileName = "testfile.pdf";
  const mimeType = "application/pdf";

  console.log(`  📎 Uploading evidence for ${projectId}...`);
  const result = await uploadFileToIPFS(buffer, fileName, mimeType);

  await saveEvidence({
    id: `E-SEED-${projectId}-${Date.now()}`,
    projectId,
    fileName: result.fileName,
    mimeType,
    fileSizeBytes: result.fileSizeBytes,
    ipfsCid: result.cid,
    ipfsUrl: result.url,
    uploadedAt: new Date().toISOString(),
  });

  console.log(`  ✅ Evidence attached — CID: ${result.cid}`);
}

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

      if (seed.marketplaceReady || seed.slashed) {
        await attachEvidence(id);
      }
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
