import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

// RiskOracleConsumer inherits FunctionsClient which calls the router in sendRequest.
// For pure unit testing we deploy with address(1) as router — the constructor just
// stores it. ownerFulfill and getOracleData are fully testable without a real router.
// requestOracleData (which calls _sendRequest) requires a live Chainlink router and
// is NOT tested here — that is an integration / forked-network concern.

describe("RiskOracleConsumer", function () {

  // address(1) — a non-zero dummy router that satisfies FunctionsClient constructor
  const DUMMY_ROUTER = "0x0000000000000000000000000000000000000001";
  const DUMMY_DON_ID = ethers.zeroPadBytes(ethers.toUtf8Bytes("fun-test"), 32);
  const DUMMY_SOURCE = "return Functions.encodeUint256(BigInt(args[0]) * 100000n + BigInt(args[1]));";

  async function deployFixture() {
    const [owner, other] = await ethers.getSigners();

    const RiskOracleConsumer = await ethers.getContractFactory("RiskOracleConsumer");
    const oracle = await RiskOracleConsumer.deploy(
      DUMMY_ROUTER,
      DUMMY_DON_ID,
      1n, // subscriptionId
      DUMMY_SOURCE
    );

    return { oracle, owner, other };
  }

  it("deploys with owner and stores oracleSource", async function () {
    const { oracle, owner } = await loadFixture(deployFixture);

    expect(await oracle.oracleSource()).to.equal(DUMMY_SOURCE);
    expect(await oracle.donId()).to.equal(DUMMY_DON_ID);
    expect(await oracle.subscriptionId()).to.equal(1n);
    expect(await oracle.gasLimit()).to.equal(300_000n);
    // ConfirmedOwner sets owner at construction via msg.sender
    expect(await oracle.owner()).to.equal(owner.address);
  });

  it("ownerFulfill stores solar and precip scaled values", async function () {
    const { oracle, owner } = await loadFixture(deployFixture);

    const projectId = 42n;
    const solarScaled = 483n;  // 4.83 kWh/m²/day
    const precipScaled = 351n; // 3.51 mm/day

    await oracle.connect(owner).ownerFulfill(projectId, solarScaled, precipScaled);

    const data = await oracle.projectOracleData(projectId);
    expect(data.solarScaled).to.equal(solarScaled);
    expect(data.precipScaled).to.equal(precipScaled);
    expect(data.fulfilled).to.equal(true);
    expect(data.fulfilledAt).to.be.gt(0n);
  });

  it("ownerFulfill emits OracleFulfilled event", async function () {
    const { oracle, owner } = await loadFixture(deployFixture);

    const projectId = 7n;
    const solarScaled = 600n;
    const precipScaled = 200n;

    await expect(oracle.connect(owner).ownerFulfill(projectId, solarScaled, precipScaled))
      .to.emit(oracle, "OracleFulfilled")
      .withArgs(projectId, solarScaled, precipScaled);
  });

  it("getOracleData returns fulfilled=false before any data", async function () {
    const { oracle } = await loadFixture(deployFixture);

    const [solar, precip, ts, ok] = await oracle.getOracleData(999n);
    expect(ok).to.equal(false);
    expect(solar).to.equal(0n);
    expect(precip).to.equal(0n);
    expect(ts).to.equal(0n);
  });

  it("getOracleData returns correct values after ownerFulfill", async function () {
    const { oracle, owner } = await loadFixture(deployFixture);

    const projectId = 1n;
    const solarScaled = 520n;
    const precipScaled = 410n;

    await oracle.connect(owner).ownerFulfill(projectId, solarScaled, precipScaled);

    const [solar, precip, ts, ok] = await oracle.getOracleData(projectId);
    expect(ok).to.equal(true);
    expect(solar).to.equal(solarScaled);
    expect(precip).to.equal(precipScaled);
    expect(ts).to.be.gt(0n);
  });

  it("non-owner cannot call ownerFulfill", async function () {
    const { oracle, other } = await loadFixture(deployFixture);

    await expect(oracle.connect(other).ownerFulfill(1n, 500n, 300n))
      .to.be.revertedWith("Only callable by owner");
  });

  it("updateConfig changes donId and subscriptionId", async function () {
    const { oracle, owner } = await loadFixture(deployFixture);

    const newDonId = ethers.zeroPadBytes(ethers.toUtf8Bytes("fun-new"), 32);
    const newSubId = 99n;
    const newGasLimit = 500_000n;

    await oracle.connect(owner).updateConfig(newDonId, newSubId, newGasLimit);

    expect(await oracle.donId()).to.equal(newDonId);
    expect(await oracle.subscriptionId()).to.equal(newSubId);
    expect(await oracle.gasLimit()).to.equal(newGasLimit);
  });

  it("non-owner cannot updateConfig", async function () {
    const { oracle, other } = await loadFixture(deployFixture);

    const newDonId = ethers.zeroPadBytes(ethers.toUtf8Bytes("fun-new"), 32);

    await expect(oracle.connect(other).updateConfig(newDonId, 5n, 300_000n))
      .to.be.revertedWith("Only callable by owner");
  });

  it("multiple projects can each store independent oracle data", async function () {
    const { oracle, owner } = await loadFixture(deployFixture);

    await oracle.connect(owner).ownerFulfill(1n, 100n, 200n);
    await oracle.connect(owner).ownerFulfill(2n, 300n, 400n);
    await oracle.connect(owner).ownerFulfill(3n, 500n, 600n);

    const [s1, p1, , ok1] = await oracle.getOracleData(1n);
    const [s2, p2, , ok2] = await oracle.getOracleData(2n);
    const [s3, p3, , ok3] = await oracle.getOracleData(3n);

    expect(ok1).to.equal(true);
    expect(s1).to.equal(100n);
    expect(p1).to.equal(200n);

    expect(ok2).to.equal(true);
    expect(s2).to.equal(300n);
    expect(p2).to.equal(400n);

    expect(ok3).to.equal(true);
    expect(s3).to.equal(500n);
    expect(p3).to.equal(600n);
  });

  it("ownerFulfill overwrites previous data for same projectId", async function () {
    const { oracle, owner } = await loadFixture(deployFixture);

    await oracle.connect(owner).ownerFulfill(1n, 100n, 200n);
    await oracle.connect(owner).ownerFulfill(1n, 999n, 888n);

    const [solar, precip, , ok] = await oracle.getOracleData(1n);
    expect(ok).to.equal(true);
    expect(solar).to.equal(999n);
    expect(precip).to.equal(888n);
  });
});
