import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("CarbonMarket", function () {
  // ─── Shared Fixture ────────────────────────────────────────────────────────

  async function deployFixture() {
    const [owner, seller, buyer, assessorSigner, treasury, reviewer1, reviewer2, reviewer3, other] =
      await ethers.getSigners();

    // Deploy tokens
    const PlatformToken = await ethers.getContractFactory("PlatformToken");
    const token = await PlatformToken.deploy(owner.address);

    const CarbonCreditToken = await ethers.getContractFactory("CarbonCreditToken");
    const creditToken = await CarbonCreditToken.deploy(owner.address);

    // Deploy market
    const CarbonMarket = await ethers.getContractFactory("CarbonMarket");
    const market = await CarbonMarket.deploy(
      owner.address,
      assessorSigner.address,
      treasury.address,
      await token.getAddress(),
      await creditToken.getAddress()
    );

    // Deploy RetireCertificate and wire it up
    const RetireCertificate = await ethers.getContractFactory("RetireCertificate");
    const retireCert = await RetireCertificate.deploy(owner.address);
    await retireCert.connect(owner).setMarket(await market.getAddress());
    await market.connect(owner).setRetireCertificate(await retireCert.getAddress());

    // Wire CarbonCreditToken to market
    await creditToken.connect(owner).setMarket(await market.getAddress());

    // Fund wallets
    const FUND = ethers.parseEther("10000");
    await token.connect(owner).faucet(seller.address, FUND);
    await token.connect(owner).faucet(buyer.address, FUND);
    await token.connect(owner).faucet(reviewer1.address, FUND);
    await token.connect(owner).faucet(reviewer2.address, FUND);
    await token.connect(owner).faucet(reviewer3.address, FUND);

    // Seed market treasury so it can transfer rewards
    await token.connect(owner).transfer(await market.getAddress(), ethers.parseEther("5000"));

    const marketAddr = await market.getAddress();
    const REQUIRED_STAKE = ethers.parseEther("500");
    const PRICE_PER_CREDIT = ethers.parseEther("2");
    const REVIEWER_BOND = await market.reviewerBond(); // 100 ether

    return {
      owner, seller, buyer, assessorSigner, treasury,
      reviewer1, reviewer2, reviewer3, other,
      token, creditToken, market, retireCert,
      marketAddr, REQUIRED_STAKE, PRICE_PER_CREDIT, REVIEWER_BOND,
    };
  }

  // Helper: submit → assess → stake → mint a project (returns projectId = 1)
  async function mintedProjectFixture() {
    const base = await deployFixture();
    const { market, seller, assessorSigner, token, marketAddr, REQUIRED_STAKE, PRICE_PER_CREDIT } = base;

    await market.connect(seller).submitProject("ipfs://meta", "hash-1", 1_000, 2026);
    await market.connect(assessorSigner).assessProject(1, 800, 30, 70, REQUIRED_STAKE);
    await token.connect(seller).approve(marketAddr, REQUIRED_STAKE);
    await market.connect(seller).depositProjectStake(1, REQUIRED_STAKE);
    await market.connect(seller).mintAndListCredits(1, PRICE_PER_CREDIT, "ipfs://credit/1");

    return { ...base, projectId: 1n };
  }

  // Helper: full minted project + registered reviewers
  async function challengeFixture() {
    const base = await mintedProjectFixture();
    const { market, token, marketAddr, reviewer1, reviewer2, reviewer3, REVIEWER_BOND } = base;

    for (const r of [reviewer1, reviewer2, reviewer3]) {
      await token.connect(r).approve(marketAddr, REVIEWER_BOND);
      await market.connect(r).registerReviewer();
    }

    return base;
  }

  // ─── Project Lifecycle ─────────────────────────────────────────────────────

  describe("Project Lifecycle", function () {

    it("submit → assess → stake → mint → buy → retire (happy path)", async function () {
      const { market, seller, buyer, assessorSigner, token, creditToken, retireCert, marketAddr, REQUIRED_STAKE, PRICE_PER_CREDIT } =
        await loadFixture(deployFixture);

      // submit
      await market.connect(seller).submitProject("ipfs://meta", "hash-1", 1_000, 2026);
      let project = await market.projects(1);
      expect(project.status).to.equal(0n); // Pending

      // assess
      await market.connect(assessorSigner).assessProject(1, 800, 30, 70, REQUIRED_STAKE);
      project = await market.projects(1);
      expect(project.status).to.equal(1n); // Assessed
      expect(project.approvedCredits).to.equal(800n);

      // stake
      await token.connect(seller).approve(marketAddr, REQUIRED_STAKE);
      await market.connect(seller).depositProjectStake(1, REQUIRED_STAKE);
      project = await market.projects(1);
      expect(project.status).to.equal(2n); // Staked

      // mint
      await market.connect(seller).mintAndListCredits(1, PRICE_PER_CREDIT, "ipfs://credit/1");
      project = await market.projects(1);
      expect(project.status).to.equal(3n); // Minted
      expect(project.availableCredits).to.equal(800n);

      // buy 10 credits
      const totalCost = PRICE_PER_CREDIT * 10n;
      await token.connect(buyer).approve(marketAddr, totalCost);
      await market.connect(buyer).buyCredits(1, 10);
      expect(await creditToken.balanceOf(buyer.address, 1)).to.equal(10n);

      project = await market.projects(1);
      expect(project.availableCredits).to.equal(790n);

      // retire 5 credits
      await creditToken.connect(buyer).setApprovalForAll(marketAddr, true);
      await market.connect(buyer).retireCredits(1, 5, "ipfs://cert/1");
      expect(await creditToken.balanceOf(buyer.address, 1)).to.equal(5n);
      expect(await retireCert.balanceOf(buyer.address)).to.equal(1n);
    });

    it("emits all events in the happy path", async function () {
      const { market, seller, buyer, assessorSigner, token, marketAddr, REQUIRED_STAKE, PRICE_PER_CREDIT } =
        await loadFixture(deployFixture);

      await expect(market.connect(seller).submitProject("ipfs://meta", "hash-1", 1_000, 2026))
        .to.emit(market, "ProjectSubmitted")
        .withArgs(1n, seller.address, 1000n);

      await expect(market.connect(assessorSigner).assessProject(1, 800, 30, 70, REQUIRED_STAKE))
        .to.emit(market, "ProjectAssessed")
        .withArgs(1n, 800n, 30n, REQUIRED_STAKE);

      await token.connect(seller).approve(marketAddr, REQUIRED_STAKE);
      await expect(market.connect(seller).depositProjectStake(1, REQUIRED_STAKE))
        .to.emit(market, "StakeDeposited")
        .withArgs(1n, seller.address, REQUIRED_STAKE);

      await expect(market.connect(seller).mintAndListCredits(1, PRICE_PER_CREDIT, "ipfs://credit/1"))
        .to.emit(market, "CreditsMinted")
        .withArgs(1n, 800n, PRICE_PER_CREDIT);

      const totalCost = PRICE_PER_CREDIT * 10n;
      await token.connect(buyer).approve(marketAddr, totalCost);
      await expect(market.connect(buyer).buyCredits(1, 10))
        .to.emit(market, "CreditsPurchased")
        .withArgs(1n, buyer.address, 10n, totalCost);
    });

    it("emits CreditsRetired with correct args", async function () {
      const { market, buyer, token, creditToken, marketAddr, PRICE_PER_CREDIT } =
        await loadFixture(mintedProjectFixture);

      const totalCost = PRICE_PER_CREDIT * 10n;
      await token.connect(buyer).approve(marketAddr, totalCost);
      await market.connect(buyer).buyCredits(1, 10);
      await creditToken.connect(buyer).setApprovalForAll(marketAddr, true);

      await expect(market.connect(buyer).retireCredits(1, 5, "ipfs://cert/1"))
        .to.emit(market, "CreditsRetired")
        .withArgs(1n, buyer.address, 5n, 1n);
    });

    it("allows non-assessor to call assessProject in open verifier demo flow", async function () {
      const { market, seller, other } = await loadFixture(deployFixture);
      await market.connect(seller).submitProject("ipfs://meta", "hash-1", 1_000, 2026);

      await expect(
        market.connect(other).assessProject(1, 800, 30, 70, ethers.parseEther("500"))
      ).to.emit(market, "ProjectAssessed").withArgs(1n, 800n, 30n, ethers.parseEther("500"));

      const project = await market.projects(1);
      expect(project.status).to.equal(1n);
    });

    it("reverts if buyer tries to buy before minting", async function () {
      const { market, seller, buyer, assessorSigner, token, marketAddr, REQUIRED_STAKE } =
        await loadFixture(deployFixture);

      await market.connect(seller).submitProject("ipfs://meta", "hash-1", 1_000, 2026);
      await market.connect(assessorSigner).assessProject(1, 800, 30, 70, REQUIRED_STAKE);
      await token.connect(seller).approve(marketAddr, REQUIRED_STAKE);
      await market.connect(seller).depositProjectStake(1, REQUIRED_STAKE);
      // project is Staked but NOT Minted yet

      await token.connect(buyer).approve(marketAddr, ethers.parseEther("100"));
      await expect(market.connect(buyer).buyCredits(1, 1))
        .to.be.revertedWithCustomError(market, "InvalidState");
    });

    it("reverts if stake is insufficient before mint", async function () {
      const { market, seller, assessorSigner, token, marketAddr } =
        await loadFixture(deployFixture);

      const requiredStake = ethers.parseEther("500");
      const partialStake = ethers.parseEther("100");

      await market.connect(seller).submitProject("ipfs://meta", "hash-1", 1_000, 2026);
      await market.connect(assessorSigner).assessProject(1, 800, 30, 70, requiredStake);
      await token.connect(seller).approve(marketAddr, partialStake);
      await market.connect(seller).depositProjectStake(1, partialStake);

      // Status is still Assessed (not Staked) because partial stake < required
      await expect(market.connect(seller).mintAndListCredits(1, ethers.parseEther("2"), "ipfs://credit/1"))
        .to.be.revertedWithCustomError(market, "InvalidState");
    });

    it("partial stake accumulates, full stake changes status to Staked", async function () {
      const { market, seller, assessorSigner, token, marketAddr } =
        await loadFixture(deployFixture);

      const requiredStake = ethers.parseEther("500");
      const half = ethers.parseEther("250");

      await market.connect(seller).submitProject("ipfs://meta", "hash-1", 1_000, 2026);
      await market.connect(assessorSigner).assessProject(1, 800, 30, 70, requiredStake);

      // First half — status stays Assessed
      await token.connect(seller).approve(marketAddr, half);
      await market.connect(seller).depositProjectStake(1, half);
      let project = await market.projects(1);
      expect(project.status).to.equal(1n); // Assessed
      expect(project.stakedAmount).to.equal(half);

      // Second half — crosses threshold → Staked
      await token.connect(seller).approve(marketAddr, half);
      await market.connect(seller).depositProjectStake(1, half);
      project = await market.projects(1);
      expect(project.status).to.equal(2n); // Staked
      expect(project.stakedAmount).to.equal(requiredStake);
    });

    it("reverts if non-seller calls mintAndListCredits", async function () {
      const { market, seller, other, assessorSigner, token, marketAddr, REQUIRED_STAKE } =
        await loadFixture(deployFixture);

      await market.connect(seller).submitProject("ipfs://meta", "hash-1", 1_000, 2026);
      await market.connect(assessorSigner).assessProject(1, 800, 30, 70, REQUIRED_STAKE);
      await token.connect(seller).approve(marketAddr, REQUIRED_STAKE);
      await market.connect(seller).depositProjectStake(1, REQUIRED_STAKE);

      await expect(
        market.connect(other).mintAndListCredits(1, ethers.parseEther("2"), "ipfs://credit/1")
      ).to.be.revertedWithCustomError(market, "Unauthorized");
    });

    it("reverts if buyer tries to buy more than available", async function () {
      const { market, buyer, token, marketAddr, PRICE_PER_CREDIT } =
        await loadFixture(mintedProjectFixture);

      // Available credits = 800, try to buy 801
      const totalCost = PRICE_PER_CREDIT * 801n;
      await token.connect(buyer).approve(marketAddr, totalCost);
      await expect(market.connect(buyer).buyCredits(1, 801))
        .to.be.revertedWithCustomError(market, "InsufficientInventory");
    });

    it("retireCredits burns tokens and emits CreditsRetired", async function () {
      const { market, buyer, token, creditToken, marketAddr, PRICE_PER_CREDIT } =
        await loadFixture(mintedProjectFixture);

      const totalCost = PRICE_PER_CREDIT * 10n;
      await token.connect(buyer).approve(marketAddr, totalCost);
      await market.connect(buyer).buyCredits(1, 10);

      await creditToken.connect(buyer).setApprovalForAll(marketAddr, true);
      const tx = await market.connect(buyer).retireCredits(1, 10, "ipfs://cert/1");

      await expect(tx).to.emit(market, "CreditsRetired");
      expect(await creditToken.balanceOf(buyer.address, 1)).to.equal(0n);
    });

    it("retireCredits reverts without RetireCertificate set", async function () {
      const { owner, seller, buyer, assessorSigner, token, creditToken } =
        await loadFixture(deployFixture);

      // Deploy a fresh market WITHOUT setting RetireCertificate
      const CarbonCreditToken = await ethers.getContractFactory("CarbonCreditToken");
      const freshCredit = await CarbonCreditToken.deploy(owner.address);

      const CarbonMarket = await ethers.getContractFactory("CarbonMarket");
      const freshMarket = await CarbonMarket.deploy(
        owner.address,
        assessorSigner.address,
        owner.address,
        await token.getAddress(),
        await freshCredit.getAddress()
      );
      await freshCredit.connect(owner).setMarket(await freshMarket.getAddress());

      const REQUIRED_STAKE = ethers.parseEther("500");
      const freshAddr = await freshMarket.getAddress();

      await token.connect(owner).faucet(seller.address, ethers.parseEther("1000"));
      await token.connect(owner).faucet(buyer.address, ethers.parseEther("1000"));

      await freshMarket.connect(seller).submitProject("ipfs://meta", "hash-1", 100, 2026);
      await freshMarket.connect(assessorSigner).assessProject(1, 80, 30, 70, REQUIRED_STAKE);
      await token.connect(seller).approve(freshAddr, REQUIRED_STAKE);
      await freshMarket.connect(seller).depositProjectStake(1, REQUIRED_STAKE);
      await freshMarket.connect(seller).mintAndListCredits(1, ethers.parseEther("1"), "ipfs://credit/1");

      const cost = ethers.parseEther("10");
      await token.connect(buyer).approve(freshAddr, cost);
      await freshMarket.connect(buyer).buyCredits(1, 10);
      await freshCredit.connect(buyer).setApprovalForAll(freshAddr, true);

      await expect(freshMarket.connect(buyer).retireCredits(1, 5, "ipfs://cert/1"))
        .to.be.revertedWithCustomError(freshMarket, "InvalidState");
    });

    it("buyCredits distributes fee to treasury and remainder to seller", async function () {
      const { market, buyer, token, marketAddr, treasury, seller, PRICE_PER_CREDIT } =
        await loadFixture(mintedProjectFixture);

      const amount = 10n;
      const totalCost = PRICE_PER_CREDIT * amount;
      const feeBps = 200n;
      const fee = (totalCost * feeBps) / 10_000n;
      const sellerAmount = totalCost - fee;

      await token.connect(buyer).approve(marketAddr, totalCost);

      const treasuryBefore = await token.balanceOf(treasury.address);
      const sellerBefore = await token.balanceOf(seller.address);

      await market.connect(buyer).buyCredits(1, Number(amount));

      expect(await token.balanceOf(treasury.address)).to.equal(treasuryBefore + fee);
      expect(await token.balanceOf(seller.address)).to.equal(sellerBefore + sellerAmount);
    });
  });

  // ─── Admin Functions ───────────────────────────────────────────────────────

  describe("Admin Functions", function () {

    it("owner can setAssessor", async function () {
      const { market, owner, other } = await loadFixture(deployFixture);
      await market.connect(owner).setAssessor(other.address);
      expect(await market.assessor()).to.equal(other.address);
    });

    it("owner can setTreasury", async function () {
      const { market, owner, other } = await loadFixture(deployFixture);
      await market.connect(owner).setTreasury(other.address);
      expect(await market.treasury()).to.equal(other.address);
    });

    it("owner can setReviewerBond", async function () {
      const { market, owner } = await loadFixture(deployFixture);
      const newBond = ethers.parseEther("200");
      await market.connect(owner).setReviewerBond(newBond);
      expect(await market.reviewerBond()).to.equal(newBond);
    });

    it("non-owner cannot setAssessor", async function () {
      const { market, other } = await loadFixture(deployFixture);
      await expect(market.connect(other).setAssessor(other.address))
        .to.be.revertedWithCustomError(market, "OwnableUnauthorizedAccount");
    });

    it("non-owner cannot setTreasury", async function () {
      const { market, other } = await loadFixture(deployFixture);
      await expect(market.connect(other).setTreasury(other.address))
        .to.be.revertedWithCustomError(market, "OwnableUnauthorizedAccount");
    });

    it("non-owner cannot setReviewerBond", async function () {
      const { market, other } = await loadFixture(deployFixture);
      await expect(market.connect(other).setReviewerBond(ethers.parseEther("999")))
        .to.be.revertedWithCustomError(market, "OwnableUnauthorizedAccount");
    });
  });

  // ─── Challenge / Slash Flow ────────────────────────────────────────────────

  describe("Challenge / Slash Flow", function () {

    it("reviewer can register by paying bond", async function () {
      const { market, token, reviewer1, marketAddr, REVIEWER_BOND } =
        await loadFixture(deployFixture);

      await token.connect(reviewer1).approve(marketAddr, REVIEWER_BOND);
      await expect(market.connect(reviewer1).registerReviewer())
        .to.emit(market, "ReviewerRegistered")
        .withArgs(reviewer1.address, REVIEWER_BOND);

      const profile = await market.reviewers(reviewer1.address);
      expect(profile.active).to.equal(true);
      expect(profile.stakedAmount).to.equal(REVIEWER_BOND);
      expect(profile.reputation).to.equal(50n);
    });

    it("reviewer can open challenge on minted project", async function () {
      const { market, token, reviewer1, marketAddr, REVIEWER_BOND } =
        await loadFixture(mintedProjectFixture);

      await token.connect(reviewer1).approve(marketAddr, REVIEWER_BOND);
      await market.connect(reviewer1).registerReviewer();

      await expect(market.connect(reviewer1).openChallenge(1))
        .to.emit(market, "ChallengeOpened");

      // Verify challenge state on-chain
      const challenge = await market.challenges(1);
      expect(challenge.challenger).to.equal(reviewer1.address);
      expect(challenge.finalized).to.equal(false);
      expect(challenge.deadline).to.be.gt(0n);

      // status → Challenged
      const project = await market.projects(1);
      expect(project.status).to.equal(4n); // Challenged
    });

    it("non-registered address cannot open challenge", async function () {
      const { market, other } = await loadFixture(mintedProjectFixture);
      await expect(market.connect(other).openChallenge(1))
        .to.be.revertedWithCustomError(market, "Unauthorized");
    });

    it("reviewer can vote on challenge", async function () {
      const { market, token, reviewer1, reviewer2, marketAddr, REVIEWER_BOND } =
        await loadFixture(mintedProjectFixture);

      for (const r of [reviewer1, reviewer2]) {
        await token.connect(r).approve(marketAddr, REVIEWER_BOND);
        await market.connect(r).registerReviewer();
      }

      await market.connect(reviewer1).openChallenge(1);

      await expect(market.connect(reviewer2).voteOnChallenge(1, true))
        .to.emit(market, "ChallengeVoted")
        .withArgs(1n, reviewer2.address, true);

      const challenge = await market.challenges(1);
      expect(challenge.fraudVotes).to.equal(1n);
    });

    it("finalizeChallenge slashes full stake and rewards challenger when fraud confirmed", async function () {
      const { market, token, reviewer1, reviewer2, reviewer3 } =
        await loadFixture(challengeFixture);

      // Open challenge as reviewer1
      await market.connect(reviewer1).openChallenge(1);

      // reviewer2 and reviewer3 vote fraud (meets quorum of 2)
      await market.connect(reviewer2).voteOnChallenge(1, true);
      await market.connect(reviewer3).voteOnChallenge(1, true);

      // Advance time past challenge deadline (3 days)
      await time.increase(3 * 24 * 60 * 60 + 1);

      const stakedBefore = (await market.projects(1)).stakedAmount;
      const challengerBefore = await token.balanceOf(reviewer1.address);
      const profileBefore = await market.reviewers(reviewer1.address);

      await expect(market.finalizeChallenge(1, 5000, 0, 10))
        .to.emit(market, "ChallengeFinalized")
        .withArgs(1n, true, stakedBefore);

      const project = await market.projects(1);
      expect(project.status).to.equal(5n); // Slashed
      expect(project.stakedAmount).to.equal(0n);
      expect(await token.balanceOf(reviewer1.address)).to.equal(challengerBefore + stakedBefore);

      const profileAfter = await market.reviewers(reviewer1.address);
      expect(profileAfter.reputation).to.equal(profileBefore.reputation + 10n);
    });

    it("finalizeChallenge restores Minted status when valid (no fraud)", async function () {
      const { market, reviewer1, reviewer2, reviewer3 } =
        await loadFixture(challengeFixture);

      await market.connect(reviewer1).openChallenge(1);

      // reviewer2 and reviewer3 vote valid (no fraud) — quorum met
      await market.connect(reviewer2).voteOnChallenge(1, false);
      await market.connect(reviewer3).voteOnChallenge(1, false);

      await time.increase(3 * 24 * 60 * 60 + 1);

      await expect(market.finalizeChallenge(1, 5000, 0, 0))
        .to.emit(market, "ChallengeFinalized")
        .withArgs(1n, false, 0n);

      const project = await market.projects(1);
      expect(project.status).to.equal(3n); // Minted
    });

    it("reverts on double vote", async function () {
      const { market, reviewer1, reviewer2 } =
        await loadFixture(challengeFixture);

      await market.connect(reviewer1).openChallenge(1);
      await market.connect(reviewer2).voteOnChallenge(1, true);

      await expect(market.connect(reviewer2).voteOnChallenge(1, true))
        .to.be.revertedWithCustomError(market, "AlreadyVoted");
    });

    it("reverts finalize before deadline", async function () {
      const { market, reviewer1, reviewer2, reviewer3 } =
        await loadFixture(challengeFixture);

      await market.connect(reviewer1).openChallenge(1);
      await market.connect(reviewer2).voteOnChallenge(1, true);
      await market.connect(reviewer3).voteOnChallenge(1, true);

      // Do NOT advance time
      await expect(market.finalizeChallenge(1, 5000, 0, 0))
        .to.be.revertedWithCustomError(market, "ChallengeNotClosed");
    });

    it("reverts finalize without quorum", async function () {
      const { market, reviewer1 } =
        await loadFixture(challengeFixture);

      await market.connect(reviewer1).openChallenge(1);
      // No votes cast — quorum is 2

      await time.increase(3 * 24 * 60 * 60 + 1);

      await expect(market.finalizeChallenge(1, 5000, 0, 0))
        .to.be.revertedWithCustomError(market, "QuorumNotReached");
    });

    it("challenger reputation is penalized when fraud is not confirmed", async function () {
      const { market, reviewer1, reviewer2, reviewer3 } =
        await loadFixture(challengeFixture);

      const profileBefore = await market.reviewers(reviewer1.address);

      await market.connect(reviewer1).openChallenge(1);
      await market.connect(reviewer2).voteOnChallenge(1, false);
      await market.connect(reviewer3).voteOnChallenge(1, false);

      await time.increase(3 * 24 * 60 * 60 + 1);
      await market.finalizeChallenge(1, 5000, 0, 0);

      const profileAfter = await market.reviewers(reviewer1.address);
      expect(profileAfter.reputation).to.equal(profileBefore.reputation - 5n);
    });

    it("demoResolveChallenge upholds challenge and slashes full stake to challenger", async function () {
      const { market, token, reviewer1 } = await loadFixture(challengeFixture);

      await market.connect(reviewer1).openChallenge(1);

      const stakedBefore = (await market.projects(1)).stakedAmount;
      const challengerBefore = await token.balanceOf(reviewer1.address);
      const profileBefore = await market.reviewers(reviewer1.address);

      await expect(market.connect(reviewer1).demoResolveChallenge(1, true))
        .to.emit(market, "ChallengeFinalized")
        .withArgs(1n, true, stakedBefore);

      const projectAfter = await market.projects(1);
      expect(projectAfter.status).to.equal(5n);
      expect(projectAfter.stakedAmount).to.equal(0n);
      expect(await token.balanceOf(reviewer1.address)).to.equal(challengerBefore + stakedBefore);

      const profileAfter = await market.reviewers(reviewer1.address);
      expect(profileAfter.reputation).to.equal(profileBefore.reputation + 10n);
    });

    it("demoResolveChallenge rejects challenge and returns project to Minted", async function () {
      const { market, reviewer1, treasury, token, REVIEWER_BOND } = await loadFixture(challengeFixture);

      await market.connect(reviewer1).openChallenge(1);

      const treasuryBefore = await token.balanceOf(treasury.address);
      const profileBefore = await market.reviewers(reviewer1.address);
      const expectedPenalty = (REVIEWER_BOND * 1000n) / 10_000n;

      await expect(market.connect(reviewer1).demoResolveChallenge(1, false))
        .to.emit(market, "ChallengeFinalized")
        .withArgs(1n, false, expectedPenalty);

      const projectAfter = await market.projects(1);
      expect(projectAfter.status).to.equal(3n);

      const profileAfter = await market.reviewers(reviewer1.address);
      expect(profileAfter.stakedAmount).to.equal(profileBefore.stakedAmount - expectedPenalty);
      expect(profileAfter.reputation).to.equal(profileBefore.reputation - 5n);
      expect(await token.balanceOf(treasury.address)).to.equal(treasuryBefore + expectedPenalty);
    });

    it("burns carbon credits when burnAmount > 0 on fraud confirmed", async function () {
      const { market, creditToken, reviewer1, reviewer2, reviewer3, marketAddr } =
        await loadFixture(challengeFixture);

      await market.connect(reviewer1).openChallenge(1);
      await market.connect(reviewer2).voteOnChallenge(1, true);
      await market.connect(reviewer3).voteOnChallenge(1, true);

      await time.increase(3 * 24 * 60 * 60 + 1);

      const creditsBefore = await creditToken.balanceOf(marketAddr, 1);
      const burnAmount = 100n;

      await market.finalizeChallenge(1, 5000, Number(burnAmount), 10);

      const creditsAfter = await creditToken.balanceOf(marketAddr, 1);
      expect(creditsAfter).to.equal(creditsBefore - burnAmount);
    });
  });

  // ─── Reward Flow ───────────────────────────────────────────────────────────

  describe("Reward Flow", function () {

    it("assessor can reward honest project and boost trust score", async function () {
      const { market, assessorSigner, seller } = await loadFixture(mintedProjectFixture);

      const projectBefore = await market.projects(1);
      const rewardAmount = ethers.parseEther("50");
      const trustBoost = 3n;

      await expect(market.connect(assessorSigner).rewardHonestProject(1, rewardAmount, trustBoost))
        .to.emit(market, "RewardIssued")
        .withArgs(1n, rewardAmount, projectBefore.trustScore + trustBoost);

      const projectAfter = await market.projects(1);
      expect(projectAfter.trustScore).to.equal(projectBefore.trustScore + trustBoost);
    });

    it("reward transfers utility tokens to seller", async function () {
      const { market, assessorSigner, token, seller } = await loadFixture(mintedProjectFixture);

      const sellerBefore = await token.balanceOf(seller.address);
      const rewardAmount = ethers.parseEther("50");

      await market.connect(assessorSigner).rewardHonestProject(1, rewardAmount, 0);

      expect(await token.balanceOf(seller.address)).to.equal(sellerBefore + rewardAmount);
    });

    it("non-assessor cannot reward", async function () {
      const { market, other } = await loadFixture(mintedProjectFixture);
      await expect(
        market.connect(other).rewardHonestProject(1, ethers.parseEther("50"), 3)
      ).to.be.revertedWithCustomError(market, "Unauthorized");
    });

    it("rewardHonestProject reverts if project is not Minted", async function () {
      const { market, seller, buyer, assessorSigner, token, marketAddr } =
        await loadFixture(deployFixture);

      // Project is in Assessed state (not Minted)
      await market.connect(seller).submitProject("ipfs://meta", "hash-1", 1_000, 2026);
      await market.connect(assessorSigner).assessProject(1, 800, 30, 70, ethers.parseEther("500"));

      await expect(
        market.connect(assessorSigner).rewardHonestProject(1, ethers.parseEther("50"), 3)
      ).to.be.revertedWithCustomError(market, "InvalidState");
    });
  });
});
