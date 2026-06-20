import { createHash } from "node:crypto";
import { collectSignals } from "./dataAggregator.js";
import type { ProjectInput, RiskAssessment } from "./types.js";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export async function assessProject(input: ProjectInput): Promise<RiskAssessment> {
  const signals = await collectSignals(input);

  const confidenceBlend = (
    (signals.userInputConfidence * 0.15) +
    (signals.iotConfidence * 0.3) +
    (signals.governmentConfidence * 0.3) +
    (signals.historicalConfidence * 0.25)
  );

  const riskScore = Math.round(
    clamp(
      100 - confidenceBlend + (signals.anomalyScore * 0.45) - (signals.additionalityScore * 0.2),
      5,
      95
    )
  );

  const trustScore = Math.round(clamp(100 - riskScore + 8, 10, 95));
  const approvedReduction = Math.max(
    0,
    Math.round(input.selfReportedReduction * (confidenceBlend / 100) * ((100 - riskScore) / 100))
  );
  const approvedCredits = Math.min(input.requestedCredits, approvedReduction);
  const stakeMultiplier = 0.4 + (riskScore / 100) * 1.8;
  const requiredStake = Math.round(Math.max(100, approvedCredits * stakeMultiplier));

  let recommendation: RiskAssessment["recommendation"] = "approve";
  if (riskScore >= 70 || approvedCredits < input.requestedCredits * 0.35) {
    recommendation = "reject";
  } else if (riskScore >= 45) {
    recommendation = "review";
  }

  const sourceHash = createHash("sha256")
    .update(JSON.stringify({ input, signals, approvedCredits, riskScore }))
    .digest("hex");

  return {
    approvedReduction,
    approvedCredits,
    riskScore,
    trustScore,
    requiredStake,
    recommendation,
    sourceHash,
    signals
  };
}
