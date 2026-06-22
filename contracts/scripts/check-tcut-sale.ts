import { ethers } from "hardhat";

async function main() {
  const sale = await ethers.getContractAt("TCUTSale", "0xa6D7Dd575aF1DE2685328aE13ec982699E532dbD");
  const rate = await (sale as any).rate();
  const inv = await (sale as any).tokenBalance();
  const owner = await (sale as any).owner();
  console.log("rate:", rate.toString(), "TCUT/ETH");
  console.log("inventory:", ethers.formatEther(inv), "TCUT");
  console.log("owner:", owner);
}

main().catch(console.error);
