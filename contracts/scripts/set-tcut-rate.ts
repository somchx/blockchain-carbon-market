import { ethers } from "hardhat";

async function main() {
  const sale = await ethers.getContractAt("TCUTSale", "0xa6D7Dd575aF1DE2685328aE13ec982699E532dbD");
  const NEW_RATE = 10_000_000n; // 0.001 ETH → 10,000 TCUT
  const tx = await (sale as any).setRate(NEW_RATE);
  await tx.wait();
  const rate = await (sale as any).rate();
  console.log("Rate updated:", rate.toString(), "TCUT/ETH");
  console.log("0.001 ETH →", (0.001 * Number(rate)).toLocaleString(), "TCUT");
}

main().catch(console.error);
