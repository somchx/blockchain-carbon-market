export type ProjectInput = {
  sellerName: string;
  projectName: string;
  province: string;
  lat?: number;
  lon?: number;
  landAreaRai: number;
  projectType: "forest" | "solar" | "biogas" | "mangrove";
  requestedCredits: number;
  selfReportedReduction: number;
  vintageYear: number;
};

export type DataSignals = {
  userInputConfidence: number;
  iotConfidence: number;
  governmentConfidence: number;
  historicalConfidence: number;
  anomalyScore: number;
  additionalityScore: number;
  // Real API fields — present when dataSource = "real"
  weather_temperature?: number;
  weather_humidity?: number;
  weather_cloudCover?: number;
  nasa_solarIrradiance?: number;
  nasa_precipitation?: number;
  ndvi?: number | null;
  landCoverType?: number | null;
  dataSource?: "real" | "fallback";
};

export type RiskAssessment = {
  approvedReduction: number;
  approvedCredits: number;
  riskScore: number;
  trustScore: number;
  requiredStake: number;
  recommendation: "approve" | "review" | "reject";
  sourceHash: string;
  tgoWarning?: string;
  signals: DataSignals;
};

export type StoredProject = {
  id: string;
  createdAt: string;
  input: ProjectInput;
  assessment: RiskAssessment;
};

export type EvidenceFile = {
  id: string;
  projectId: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  ipfsCid: string;
  ipfsUrl: string;
  uploadedAt: string;
};
