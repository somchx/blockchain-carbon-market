export type ProjectType = "forest" | "solar" | "biogas" | "mangrove";
export type Role = "developer" | "verifier" | "buyer";

export type ProjectForm = {
  sellerName: string;
  projectName: string;
  province: string;
  landAreaRai: number;
  projectType: ProjectType;
  requestedCredits: number;
  selfReportedReduction: number;
  vintageYear: number;
};

export type Assessment = {
  approvedCredits: number;
  approvedReduction: number;
  requiredStake: number;
  riskScore: number;
  trustScore: number;
  recommendation: "approve" | "review" | "reject";
  sourceHash: string;
  signals: Record<string, number>;
};

export type StoredProject = {
  id: string;
  createdAt: string;
  input: ProjectForm;
  assessment: Assessment;
};

export type OnChainProject = {
  id: number;
  seller: string;
  requestedCredits: number;
  approvedCredits: number;
  riskScore: number;
  trustScore: number;
  requiredStakeFormatted: string;
  stakedAmountFormatted: string;
  availableCredits: number;
  pricePerCreditFormatted: string;
  status: number;
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

export const PROJECT_STATUS: Record<number, string> = {
  0: "Pending",
  1: "Assessed",
  2: "Staked",
  3: "Minted",
  4: "Challenged",
  5: "Slashed",
  6: "Closed",
};
