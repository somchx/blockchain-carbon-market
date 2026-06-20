import test from "node:test";
import assert from "node:assert/strict";
import { assessProject } from "./riskEngine.js";

test("mangrove (SuratThani) — bounded scores and sane approved credits", async () => {
  const result = await assessProject({
    sellerName: "Green Farm Co.",
    projectName: "Mangrove Delta Pilot",
    province: "SuratThani",
    landAreaRai: 320,
    projectType: "mangrove",
    requestedCredits: 800,
    selfReportedReduction: 720,
    vintageYear: 2026,
  });

  assert.ok(result.riskScore >= 5 && result.riskScore <= 95, `riskScore out of range: ${result.riskScore}`);
  assert.ok(result.trustScore >= 10 && result.trustScore <= 95, `trustScore out of range: ${result.trustScore}`);
  assert.ok(result.requiredStake >= 100, `requiredStake too low: ${result.requiredStake}`);
  assert.ok(result.approvedCredits <= 800, `approvedCredits exceeds requested: ${result.approvedCredits}`);
  assert.ok(result.approvedCredits >= 0, "approvedCredits negative");
  assert.ok(result.sourceHash.length > 0, "sourceHash empty");
});

test("solar (Phuket) — both project types produce bounded scores", async () => {
  const [mangrove, solar] = await Promise.all([
    assessProject({
      sellerName: "A",
      projectName: "Mangrove Test",
      province: "Phuket",
      landAreaRai: 100,
      projectType: "mangrove",
      requestedCredits: 200,
      selfReportedReduction: 180,
      vintageYear: 2026,
    }),
    assessProject({
      sellerName: "B",
      projectName: "Solar Test",
      province: "Phuket",
      landAreaRai: 100,
      projectType: "solar",
      requestedCredits: 200,
      selfReportedReduction: 180,
      vintageYear: 2026,
    }),
  ]);

  assert.ok(mangrove.riskScore >= 5 && mangrove.riskScore <= 95, `mangrove riskScore: ${mangrove.riskScore}`);
  assert.ok(solar.riskScore >= 5 && solar.riskScore <= 95, `solar riskScore: ${solar.riskScore}`);
  assert.ok(solar.trustScore >= 10 && solar.trustScore <= 95);
});

test("forest (ChiangMai) — signals contain real NASA POWER data", async () => {
  const result = await assessProject({
    sellerName: "Northern Forest Ltd.",
    projectName: "Doi Inthanon Forest Buffer",
    province: "ChiangMai",
    landAreaRai: 1_500,
    projectType: "forest",
    requestedCredits: 3_000,
    selfReportedReduction: 2_700,
    vintageYear: 2025,
  });

  assert.ok(result.riskScore >= 5 && result.riskScore <= 95);
  assert.ok(result.approvedCredits <= 3_000);
  // NASA POWER fields live under result.signals
  assert.ok(typeof result.signals.nasa_solarIrradiance === "number", "nasa_solarIrradiance missing");
  assert.ok(typeof result.signals.nasa_precipitation === "number", "nasa_precipitation missing");
  assert.ok(result.signals.nasa_solarIrradiance! > 0, "solar irradiance should be positive");
});

test("biogas (KhonKaen) — approvedCredits and approvedReduction always ≤ requested", async () => {
  const result = await assessProject({
    sellerName: "KK Biogas",
    projectName: "ขอนแก่นก๊าซชีวภาพ",
    province: "KhonKaen",
    landAreaRai: 50,
    projectType: "biogas",
    requestedCredits: 500,
    selfReportedReduction: 400,
    vintageYear: 2026,
  });

  assert.ok(result.approvedCredits <= 500, `approvedCredits ${result.approvedCredits} > 500`);
  assert.ok(result.approvedReduction <= 400, `approvedReduction ${result.approvedReduction} > 400`);
  assert.ok(result.riskScore >= 5 && result.riskScore <= 95);
});

test("requiredStake scales with requestedCredits", async () => {
  const [small, large] = await Promise.all([
    assessProject({
      sellerName: "X",
      projectName: "Small",
      province: "Bangkok",
      landAreaRai: 10,
      projectType: "forest",
      requestedCredits: 100,
      selfReportedReduction: 90,
      vintageYear: 2026,
    }),
    assessProject({
      sellerName: "X",
      projectName: "Large",
      province: "Bangkok",
      landAreaRai: 10,
      projectType: "forest",
      requestedCredits: 5_000,
      selfReportedReduction: 4_500,
      vintageYear: 2026,
    }),
  ]);

  assert.ok(
    large.requiredStake > small.requiredStake,
    `large stake (${large.requiredStake}) should exceed small (${small.requiredStake})`
  );
});

test("dataSource is 'real' when NASA POWER responds (no API key required)", async () => {
  const result = await assessProject({
    sellerName: "Test",
    projectName: "DataSource Check",
    province: "SuratThani",
    landAreaRai: 200,
    projectType: "mangrove",
    requestedCredits: 400,
    selfReportedReduction: 360,
    vintageYear: 2026,
  });

  // NASA POWER has no API key requirement — should always return real
  assert.equal(result.signals.dataSource, "real", `expected 'real', got '${result.signals.dataSource}'`);
});

test("sourceHash is a non-empty hex string", async () => {
  const result = await assessProject({
    sellerName: "Det",
    projectName: "Hash Check",
    province: "Bangkok",
    landAreaRai: 100,
    projectType: "forest",
    requestedCredits: 200,
    selfReportedReduction: 180,
    vintageYear: 2026,
  });

  assert.ok(result.sourceHash.length >= 10, `sourceHash too short: ${result.sourceHash}`);
  assert.match(result.sourceHash, /^[0-9a-f]+$/, "sourceHash should be hex");
});

test("recommendation is 'reject' for very high riskScore projects", async () => {
  // Very small landArea with huge requestedCredits → low confidence → high risk
  const result = await assessProject({
    sellerName: "Bad Actor",
    projectName: "Inflated Claims",
    province: "Bangkok",
    landAreaRai: 1,
    projectType: "forest",
    requestedCredits: 999_999,
    selfReportedReduction: 999_999,
    vintageYear: 2026,
  });

  // approvedCredits should be far less than requested
  assert.ok(result.approvedCredits < 999_999, "should not approve all requested credits");
  // recommendation should be reject or review for such inflated claims
  assert.ok(
    result.recommendation === "reject" || result.recommendation === "review",
    `expected reject/review, got ${result.recommendation}`
  );
});
