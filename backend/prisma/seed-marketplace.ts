import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { Contract, JsonRpcProvider, MaxUint256, Wallet, ethers } from "ethers";
import { assessProject } from "../src/riskEngine.js";
import { prisma } from "../src/db.js";
import { DEMO_CREATOR_ADDRESS, DEMO_MARKETPLACE_PROJECT } from "./demoProjects.js";

const marketAbi = [
  "function nextProjectId() view returns (uint256)",
  "function submitProject(string metadataUri, string sourceDataHash, uint256 requestedCredits, uint256 vintageYear) returns (uint256)",
  "function assessProject(uint256 projectId, uint256 approvedCredits, uint256 riskScore, uint256 trustScore, uint256 requiredStake)",
  "function depositProjectStake(uint256 projectId, uint256 amount)",
  "function mintAndListCredits(uint256 projectId, uint256 pricePerCredit, string tokenUri)",
];

const erc20Abi = [
  "function approve(address spender, uint256 amount) returns (bool)",
];

loadEnv({ path: join(process.cwd(), ".env") });
loadEnv({ path: join(process.cwd(), "..", "contracts", ".env"), override: true });

async function main() {
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

  const input = DEMO_MARKETPLACE_PROJECT.input;
  console.log(`🛒 Preparing marketplace-ready seed: "${input.projectName}"`);
  console.log(`👤 creatorAddress in DB: ${DEMO_CREATOR_ADDRESS}`);
  console.log(`⛓️ seller on-chain via script wallet: ${signer.address}`);

  const assessment = await assessProject(input);
  const requiredStakeWei = ethers.parseEther(String(assessment.requiredStake));
  const pricePerCreditWei = ethers.parseEther("1");

  const existing = await prisma.carbonProject.findUnique({ where: { id: DEMO_MARKETPLACE_PROJECT.id } });
  if (!existing) {
    throw new Error(`Project ${DEMO_MARKETPLACE_PROJECT.id} not found in DB. Run the normal seed first.`);
  }

  const nextProjectId = Number(await market.nextProjectId());

  console.log("1. Approving TCUT allowance...");
  await (await utilityToken.approve(deployment.market, MaxUint256)).wait();

  console.log(`2. Submitting project on-chain as project #${nextProjectId}...`);
  await (
    await market.submitProject(
      `ipfs://seed-project/${DEMO_MARKETPLACE_PROJECT.id}`,
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

  console.log("4. Depositing full stake...");
  await (await market.depositProjectStake(nextProjectId, requiredStakeWei)).wait();

  console.log("5. Minting and listing credits...");
  await (
    await market.mintAndListCredits(
      nextProjectId,
      pricePerCreditWei,
      `ipfs://seed-credit/${DEMO_MARKETPLACE_PROJECT.id}`,
    )
  ).wait();

  await prisma.carbonProject.update({
    where: { id: DEMO_MARKETPLACE_PROJECT.id },
    data: {
      onChainId: nextProjectId,
      creatorAddress: DEMO_CREATOR_ADDRESS.toLowerCase(),
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

  console.log(`✅ Marketplace seed ready: DB project ${DEMO_MARKETPLACE_PROJECT.id} -> onChainId ${nextProjectId}`);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
