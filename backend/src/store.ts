import { prisma } from "./db.js";
import type { EvidenceFile, StoredProject } from "./types.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function toStoredProject(row: {
  id: string; createdAt: Date;
  sellerName: string; projectName: string; province: string;
  landAreaRai: number; projectType: string; requestedCredits: number;
  selfReportedReduction: number; vintageYear: number;
  approvedCredits: number; approvedReduction: number; requiredStake: number;
  riskScore: number; trustScore: number; recommendation: string;
  sourceHash: string; signals: unknown; onChainId?: number | null;
  creatorAddress?: string | null;
}): StoredProject {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    ...(row.onChainId != null ? { onChainId: row.onChainId } : {}),
    ...(row.creatorAddress ? { creatorAddress: row.creatorAddress } : {}),
    input: {
      sellerName: row.sellerName,
      projectName: row.projectName,
      province: row.province,
      landAreaRai: row.landAreaRai,
      projectType: row.projectType as StoredProject["input"]["projectType"],
      requestedCredits: row.requestedCredits,
      selfReportedReduction: row.selfReportedReduction,
      vintageYear: row.vintageYear,
    },
    assessment: {
      approvedCredits: row.approvedCredits,
      approvedReduction: row.approvedReduction,
      requiredStake: row.requiredStake,
      riskScore: row.riskScore,
      trustScore: row.trustScore,
      recommendation: row.recommendation as StoredProject["assessment"]["recommendation"],
      sourceHash: row.sourceHash,
      signals: row.signals as StoredProject["assessment"]["signals"],
    },
  };
}

function toEvidenceFile(row: {
  id: string; projectId: string; fileName: string; mimeType: string;
  fileSizeBytes: number; ipfsCid: string; ipfsUrl: string; uploadedAt: Date;
}): EvidenceFile {
  return {
    id: row.id,
    projectId: row.projectId,
    fileName: row.fileName,
    mimeType: row.mimeType,
    fileSizeBytes: row.fileSizeBytes,
    ipfsCid: row.ipfsCid,
    ipfsUrl: row.ipfsUrl,
    uploadedAt: row.uploadedAt.toISOString(),
  };
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function saveProject(project: StoredProject, creatorAddress?: string): Promise<StoredProject> {
  const row = await prisma.carbonProject.upsert({
    where: { id: project.id },
    create: {
      id: project.id,
      createdAt: new Date(project.createdAt),
      sellerName: project.input.sellerName,
      projectName: project.input.projectName,
      province: project.input.province,
      landAreaRai: project.input.landAreaRai,
      projectType: project.input.projectType,
      requestedCredits: project.input.requestedCredits,
      selfReportedReduction: project.input.selfReportedReduction,
      vintageYear: project.input.vintageYear,
      approvedCredits: project.assessment.approvedCredits,
      approvedReduction: project.assessment.approvedReduction,
      requiredStake: project.assessment.requiredStake,
      riskScore: project.assessment.riskScore,
      trustScore: project.assessment.trustScore,
      recommendation: project.assessment.recommendation,
      sourceHash: project.assessment.sourceHash,
      signals: project.assessment.signals as object,
      ...(creatorAddress ? { creatorAddress: creatorAddress.toLowerCase() } : {}),
    },
    update: {},
  });
  return toStoredProject(row);
}

export async function listProjects(): Promise<StoredProject[]> {
  const rows = await prisma.carbonProject.findMany({
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toStoredProject);
}

export async function getProject(id: string): Promise<StoredProject | null> {
  const row = await prisma.carbonProject.findUnique({ where: { id } });
  return row ? toStoredProject(row) : null;
}

export async function updateOnChainId(id: string, onChainId: number): Promise<void> {
  await prisma.carbonProject.update({ where: { id }, data: { onChainId } });
}

// ── Evidence ──────────────────────────────────────────────────────────────────

export async function saveEvidence(file: EvidenceFile): Promise<EvidenceFile> {
  const row = await prisma.evidenceFile.create({
    data: {
      id: file.id,
      projectId: file.projectId,
      fileName: file.fileName,
      mimeType: file.mimeType,
      fileSizeBytes: file.fileSizeBytes,
      ipfsCid: file.ipfsCid,
      ipfsUrl: file.ipfsUrl,
      uploadedAt: new Date(file.uploadedAt),
    },
  });
  return toEvidenceFile(row);
}

export async function listEvidence(projectId: string): Promise<EvidenceFile[]> {
  const rows = await prisma.evidenceFile.findMany({
    where: { projectId },
    orderBy: { uploadedAt: "asc" },
  });
  return rows.map(toEvidenceFile);
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export async function getLeaderboard() {
  const rows = await prisma.carbonProject.findMany({
    orderBy: { trustScore: "desc" },
    select: {
      id: true,
      sellerName: true,
      projectName: true,
      trustScore: true,
      riskScore: true,
      approvedCredits: true,
    },
  });
  return rows.map((row, index) => ({
    rank: index + 1,
    id: row.id,
    sellerName: row.sellerName,
    projectName: row.projectName,
    trustScore: row.trustScore,
    riskScore: row.riskScore,
    approvedCredits: row.approvedCredits,
  }));
}
