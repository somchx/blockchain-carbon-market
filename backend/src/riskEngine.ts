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

  // TGO Thailand carbon sequestration rate limits (tCO2/rai/year)
  const TGO_MAX_RATE: Record<string, number> = {
    forest:   3.5,
    mangrove: 6.0,
    solar:    8.0,
    biogas:   5.0,
  };

  const maxByTGO = Math.floor(input.landAreaRai * (TGO_MAX_RATE[input.projectType] ?? 3.5));
  let tgoWarning: string | undefined;
  if (input.requestedCredits > maxByTGO) {
    tgoWarning = `ขอ ${input.requestedCredits} credits แต่พื้นที่ ${input.landAreaRai} ไร่ absorb ได้สูงสุด ${maxByTGO} tCO₂/ปี ตามมาตรฐาน TGO (${TGO_MAX_RATE[input.projectType]} tCO₂/ไร่/ปี)`;
  }

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
    tgoWarning,
    signals
  };
}
