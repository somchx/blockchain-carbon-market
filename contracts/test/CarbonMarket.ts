import { expect } from "chai";
import { ethers } from "hardhat";

describe("CarbonMarket", function () {
  it("supports assess, stake, mint, buy, and reward flow", async function () {
    const [owner, seller, buyer, assessor, treasury] = await ethers.getSigners();

    const PlatformToken = await ethers.getContractFactory("PlatformToken");
    const token = await PlatformToken.deploy(owner.address);

    const CarbonCreditToken = await ethers.getContractFactory("CarbonCreditToken");
    const creditToken = await CarbonCreditToken.deploy(owner.address);

    const CarbonMarket = await ethers.getContractFactory("CarbonMarket");
    const market = await CarbonMarket.deploy(
      owner.address,
      assessor.address,
      treasury.address,
      token.getAddress(),
      creditToken.getAddress()
    );

    await creditToken.connect(owner).setMarket(await market.getAddress());
    await token.connect(owner).faucet(seller.address, ethers.parseEther("10000"));
    await token.connect(owner).faucet(buyer.address, ethers.parseEther("10000"));
    await token.connect(owner).transfer(await market.getAddress(), ethers.parseEther("1000"));

    await market.connect(seller).submitProject("ipfs://meta", "hash-1", 1_000, 2026);
    await market.connect(assessor).assessProject(1, 800, 30, 70, ethers.parseEther("500"));

    await token.connect(seller).approve(await market.getAddress(), ethers.parseEther("500"));
    await market.connect(seller).depositProjectStake(1, ethers.parseEther("500"));
    await market.connect(seller).mintAndListCredits(1, ethers.parseEther("2"), "ipfs://credit/1");

    await token.connect(buyer).approve(await market.getAddress(), ethers.parseEther("100"));
    await market.connect(buyer).buyCredits(1, 10);

    expect(await creditToken.balanceOf(buyer.address, 1)).to.equal(10n);

    await market.connect(assessor).rewardHonestProject(1, ethers.parseEther("50"), 3);

    const project = await market.projects(1);
    expect(project.availableCredits).to.equal(790n);
    expect(project.trustScore).to.equal(73n);
  });
});
