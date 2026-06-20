import type { ProjectInput } from "./types.js";

const provinceCarbonFactor: Record<string, number> = {
  ChiangMai: 0.84,
  Bangkok: 0.45,
  KhonKaen: 0.71,
  SuratThani: 0.78,
  Chonburi: 0.58,
  Phuket: 0.49
};

const projectTypeBase: Record<ProjectInput["projectType"], number> = {
  forest: 0.86,
  solar: 0.77,
  biogas: 0.72,
  mangrove: 0.91
};

export function collectSignals(input: ProjectInput) {
  const provinceFactor = provinceCarbonFactor[input.province] ?? 0.62;
  const typeFactor = projectTypeBase[input.projectType];
  const scaleFactor = Math.min(input.landAreaRai / 500, 1);

  const userInputConfidence = Math.max(
    35,
    Math.min(90, 55 + Math.round((input.selfReportedReduction / Math.max(input.requestedCredits, 1)) * 15))
  );

  const iotConfidence = Math.round((typeFactor * 55) + (scaleFactor * 25));
  const governmentConfidence = Math.round((provinceFactor * 60) + (typeFactor * 20));
  const historicalConfidence = Math.round((provinceFactor * 45) + (scaleFactor * 35));

  const anomalyScore = Math.max(
    5,
    Math.min(95, Math.round(((input.requestedCredits - input.selfReportedReduction) / Math.max(input.requestedCredits, 1)) * 100 + 35))
  );

  const additionalityScore = Math.round((typeFactor * 60) + (provinceFactor * 25) + (scaleFactor * 15));

  return {
    userInputConfidence,
    iotConfidence,
    governmentConfidence,
    historicalConfidence,
    anomalyScore,
    additionalityScore
  };
}
