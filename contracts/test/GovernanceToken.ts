import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("GovernanceToken", function () {

  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();

    const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
    const gov = await GovernanceToken.deploy(owner.address);

    const TOTAL_SUPPLY = 1_000_000n * 10n ** 18n;

    return { gov, owner, alice, bob, TOTAL_SUPPLY };
  }

  it("mints 1,000,000 CGOV to deployer on deploy", async function () {
    const { gov, owner, TOTAL_SUPPLY } = await loadFixture(deployFixture);

    expect(await gov.balanceOf(owner.address)).to.equal(TOTAL_SUPPLY);
    expect(await gov.totalSupply()).to.equal(TOTAL_SUPPLY);
    expect(await gov.name()).to.equal("Carbon Governance");
    expect(await gov.symbol()).to.equal("CGOV");
  });

  it("allows holder to delegate to self for voting power", async function () {
    const { gov, owner } = await loadFixture(deployFixture);

    // Before delegation, votes are 0
    expect(await gov.getVotes(owner.address)).to.equal(0n);

    // Delegate to self
    await gov.connect(owner).delegate(owner.address);

    expect(await gov.getVotes(owner.address)).to.equal(await gov.balanceOf(owner.address));
  });

  it("transferring reduces sender voting power after delegation", async function () {
    const { gov, owner, alice } = await loadFixture(deployFixture);

    // Both delegate to themselves
    await gov.connect(owner).delegate(owner.address);
    await gov.connect(alice).delegate(alice.address);

    const ownerVotesBefore = await gov.getVotes(owner.address);
    const transferAmount = ethers.parseEther("100000");

    await gov.connect(owner).transfer(alice.address, transferAmount);

    // Owner's voting power should decrease
    expect(await gov.getVotes(owner.address)).to.equal(ownerVotesBefore - transferAmount);
    // Alice's voting power should increase
    expect(await gov.getVotes(alice.address)).to.equal(transferAmount);
  });

  it("owner can transfer tokens", async function () {
    const { gov, owner, alice } = await loadFixture(deployFixture);

    const transferAmount = ethers.parseEther("5000");
    await gov.connect(owner).transfer(alice.address, transferAmount);

    expect(await gov.balanceOf(alice.address)).to.equal(transferAmount);
    expect(await gov.balanceOf(owner.address)).to.equal(
      1_000_000n * 10n ** 18n - transferAmount
    );
  });

  it("owner can mint additional tokens", async function () {
    const { gov, owner, alice, TOTAL_SUPPLY } = await loadFixture(deployFixture);

    const mintAmount = ethers.parseEther("1000");
    await gov.connect(owner).mint(alice.address, mintAmount);

    expect(await gov.balanceOf(alice.address)).to.equal(mintAmount);
    expect(await gov.totalSupply()).to.equal(TOTAL_SUPPLY + mintAmount);
  });

  it("non-owner cannot mint", async function () {
    const { gov, alice } = await loadFixture(deployFixture);

    await expect(gov.connect(alice).mint(alice.address, ethers.parseEther("1")))
      .to.be.revertedWithCustomError(gov, "OwnableUnauthorizedAccount");
  });

  it("supports ERC20Permit (nonces starts at 0)", async function () {
    const { gov, owner } = await loadFixture(deployFixture);
    expect(await gov.nonces(owner.address)).to.equal(0n);
  });

  it("delegation to another address gives them voting power", async function () {
    const { gov, owner, alice } = await loadFixture(deployFixture);

    // owner delegates to alice
    await gov.connect(owner).delegate(alice.address);

    expect(await gov.getVotes(alice.address)).to.equal(await gov.balanceOf(owner.address));
    expect(await gov.getVotes(owner.address)).to.equal(0n);
  });
});
