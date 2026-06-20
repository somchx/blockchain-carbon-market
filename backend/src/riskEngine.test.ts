import test from "node:test";
import assert from "node:assert/strict";
import { assessProject } from "./riskEngine.js";

test("assessProject produces bounded risk and trust scores", async () => {
  const result = await assessProject({
    sellerName: "Green Farm Co.",
    projectName: "Mangrove Delta Pilot",
    province: "SuratThani",
    landAreaRai: 320,
    projectType: "mangrove",
    requestedCredits: 800,
    selfReportedReduction: 720,
    vintageYear: 2026
  });

  assert.ok(result.riskScore >= 5 && result.riskScore <= 95);
  assert.ok(result.trustScore >= 10 && result.trustScore <= 95);
  assert.ok(result.requiredStake >= 100);
  assert.ok(result.approvedCredits <= 800);
});
