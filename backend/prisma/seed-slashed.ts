import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { Contract, JsonRpcProvider, MaxUint256, Wallet, ethers } from "ethers";
import { assessProject } from "../src/riskEngine.js";
import { prisma } from "../src/db.js";
import { uploadFileToIPFS } from "../src/ipfsService.js";
import { saveEvidence } from "../src/store.js";
import { DEMO_SLASHED_PROJECT } from "./demoProjects.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_FILE_PATH = join(__dirname, "..", "..", "testfile.pdf");

const marketAbi = [
  "function nextProjectId() view returns (uint256)",
  "function submitProject(string metadataUri, string sourceDataHash, uint256 requestedCredits, uint256 vintageYear) returns (uint256)",
  "function assessProject(uint256 projectId, uint256 approvedCredits, uint256 riskScore, uint256 trustScore, uint256 requiredStake)",
  "function depositProjectStake(uint256 projectId, uint256 amount)",
  "function mintAndListCredits(uint256 projectId, uint256 pricePerCredit, string tokenUri)",
  "function registerReviewer()",
  "function openChallenge(uint256 projectId)",
  "function demoResolveChallenge(uint256 projectId, bool upholdChallenge)",
];

const erc20Abi = [
  "function approve(address spender, uint256 amount) returns (bool)",
];

loadEnv({ path: join(process.cwd(), ".env") });
loadEnv({ path: join(process.cwd(), "..", "contracts", ".env"), override: true });

async function main() {
  if (!DEMO_SLASHED_PROJECT) throw new Error("No slashed project defined in demoProjects.ts");

  const deploymentPath = join(process.cwd(), "..", "contracts", "deployments", "sepolia.json");
  const deployment = JSON.parse(readFileSync(deploymentPath, "utf8")) as {
    market: string;
    utilityToken: string;
  };

  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!rpcUrl) throw new Error("SEPOLIA_RPC_URL is not configured");
  if (!privateKey) throw new Error("DEPLOYER_PRIVATE_KEY is not configured");

  const provider = new JsonRpcProvider(rpcUrl);
  const signer = new Wallet(privateKey, provider);
  const market = new Contract(deployment.market, marketAbi, signer);
  const utilityToken = new Contract(deployment.utilityToken, erc20Abi, signer);

  const input = DEMO_SLASHED_PROJECT.input;
  const id = DEMO_SLASHED_PROJECT.id;
  console.log(`⚔️  Preparing slashed seed: "${input.projectName}"`);
  console.log(`⛓️  Script wallet: ${signer.address}`);

  const existing = await prisma.carbonProject.findUnique({ where: { id } });
  if (!existing) throw new Error(`Project ${id} not found in DB. Run seed.ts first.`);

  const assessment = await assessProject(input);
  const requiredStakeWei = ethers.parseEther(String(assessment.requiredStake));
  const pricePerCreditWei = ethers.parseEther("1");
  const nextProjectId = Number(await market.nextProjectId());

  console.log("1. Approving TCUT allowance (MaxUint256)...");
  await (await utilityToken.approve(deployment.market, MaxUint256)).wait();

  console.log(`2. Submitting project on-chain as project #${nextProjectId}...`);
  await (
    await market.submitProject(
      `ipfs://seed-project/${id}`,
      assessment.sourceHash,
      input.requestedCredits,
      input.vintageYear,
    )
  ).wait();

  console.log("3. Assessing project on-chain...");
  await (
    await market.assessProject(
      nextProjectId,
      assessment.approvedCredits,
      assessment.riskScore,
      assessment.trustScore,
      requiredStakeWei,
    )
  ).wait();

  console.log("4. Depositing stake...");
  await (await market.depositProjectStake(nextProjectId, requiredStakeWei)).wait();

  console.log("5. Minting and listing credits...");
  await (
    await market.mintAndListCredits(
      nextProjectId,
      pricePerCreditWei,
      `ipfs://seed-credit/${id}`,
    )
  ).wait();

  console.log("6. Registering as reviewer...");
  await (await market.registerReviewer()).wait();

  console.log("7. Opening challenge...");
  await (await market.openChallenge(nextProjectId)).wait();

  console.log("8. Resolving challenge → Slash!");
  await (await market.demoResolveChallenge(nextProjectId, true)).wait();

  console.log("9. Updating DB...");
  await prisma.carbonProject.update({
    where: { id },
    data: {
      onChainId: nextProjectId,
      sourceHash: assessment.sourceHash,
      approvedCredits: assessment.approvedCredits,
      approvedReduction: assessment.approvedReduction,
      requiredStake: assessment.requiredStake,
      riskScore: assessment.riskScore,
      trustScore: assessment.trustScore,
      recommendation: assessment.recommendation,
      signals: assessment.signals as object,
    },
  });

  const evidenceCount = await prisma.evidenceFile.count({ where: { projectId: id } });
  if (evidenceCount === 0) {
    console.log("10. Uploading evidence (testfile.pdf)...");
    const buffer = readFileSync(EVIDENCE_FILE_PATH);
    const result = await uploadFileToIPFS(buffer, "testfile.pdf", "application/pdf");
    await saveEvidence({
      id: `E-SEED-${id}-${Date.now()}`,
      projectId: id,
      fileName: result.fileName,
      mimeType: "application/pdf",
      fileSizeBytes: result.fileSizeBytes,
      ipfsCid: result.cid,
      ipfsUrl: result.url,
      uploadedAt: new Date().toISOString(),
    });
    console.log(`    ✅ Evidence attached — CID: ${result.cid}`);
  } else {
    console.log("10. Evidence already attached — skipping upload.");
  }

  console.log(`\n✅ Slashed seed ready: DB project ${id} -> onChainId ${nextProjectId} (Slashed)`);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
