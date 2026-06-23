import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { generateCertificate } from "./certificateService.js";
import { prisma } from "./db.js";
import { uploadFileToIPFS } from "./ipfsService.js";
import { assessProject } from "./riskEngine.js";
import { getLeaderboard, getProject, listEvidence, listProjects, saveEvidence, saveProject, updateOnChainId } from "./store.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    cb(null, allowed.includes(file.mimetype));
  },
});

const projectSchema = z.object({
  sellerName: z.string().min(1),
  projectName: z.string().min(1),
  province: z.string().min(1),
  landAreaRai: z.number().positive(),
  projectType: z.enum(["forest", "solar", "biogas", "mangrove"]),
  requestedCredits: z.number().positive(),
  selfReportedReduction: z.number().positive(),
  vintageYear: z.number().int().min(2020).max(2100)
});

const walletSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address"),
});

export const api = Router();

api.get("/health", (_req, res) => {
  res.json({ ok: true });
});

api.get("/projects", async (_req, res) => {
  res.json(await listProjects());
});

api.get("/projects/:id", async (req, res) => {
  const project = await getProject(req.params.id);
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }
  res.json(project);
});

api.get("/leaderboard", async (_req, res) => {
  res.json(await getLeaderboard());
});

api.get("/verifier-access/:walletAddress", async (req, res) => {
  const parsed = walletSchema.safeParse({ walletAddress: req.params.walletAddress });
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid wallet address" });
  }

  const walletAddress = parsed.data.walletAddress.toLowerCase();
  const access = await prisma.verifierAccess.findUnique({
    where: { walletAddress },
  });

  if (!access) {
    return res.json({ walletAddress, status: "none", hasAccess: false });
  }

  res.json({
    walletAddress: access.walletAddress,
    status: access.status,
    hasAccess: access.status === "approved",
    requestedAt: access.requestedAt.toISOString(),
    approvedAt: access.approvedAt?.toISOString(),
    approvalMode: access.approvalMode,
  });
});

api.post("/verifier-access/request", async (req, res) => {
  const parsed = walletSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid wallet address",
      issues: parsed.error.flatten(),
    });
  }

  const walletAddress = parsed.data.walletAddress.toLowerCase();
  const now = new Date();
  const access = await prisma.verifierAccess.upsert({
    where: { walletAddress },
    create: {
      walletAddress,
      status: "approved",
      requestedAt: now,
      approvedAt: now,
      approvalMode: "demo_auto",
    },
    update: {
      status: "approved",
      approvedAt: now,
      approvalMode: "demo_auto",
    },
  });

  res.status(201).json({
    walletAddress: access.walletAddress,
    status: access.status,
    hasAccess: true,
    requestedAt: access.requestedAt.toISOString(),
    approvedAt: access.approvedAt?.toISOString(),
    approvalMode: access.approvalMode,
    message: "Auto-approved for demo",
  });
});

api.patch("/projects/:id/on-chain", async (req, res) => {
  const { id } = req.params as { id: string };
  const { onChainId } = req.body as { onChainId: number };
  if (!Number.isInteger(onChainId) || onChainId < 1) {
    return res.status(400).json({ message: "Invalid onChainId" });
  }
  const project = await getProject(id);
  if (!project) return res.status(404).json({ message: "Project not found" });
  await updateOnChainId(id, onChainId);
  res.json({ ok: true, onChainId });
});

api.get("/projects/:id/evidence", async (req, res) => {
  const { id } = req.params as { id: string };
  const project = await getProject(id);
  if (!project) return res.status(404).json({ message: "Project not found" });
  res.json(await listEvidence(id));
});

api.post(
  "/projects/:id/evidence",
  upload.single("file"),
  async (req, res) => {
    const { id } = req.params as { id: string };
    const project = getProject(id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (!req.file) return res.status(400).json({ message: "No file uploaded or file type not allowed (PDF, JPG, PNG, WEBP only)" });

    try {
      const result = await uploadFileToIPFS(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
      );
      const evidence = await saveEvidence({
        id: `E-${Date.now()}`,
        projectId: id,
        fileName: result.fileName,
        mimeType: req.file.mimetype,
        fileSizeBytes: result.fileSizeBytes,
        ipfsCid: result.cid,
        ipfsUrl: result.url,
        uploadedAt: new Date().toISOString(),
      });
      res.status(201).json(evidence);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      res.status(502).json({ message: msg });
    }
  },
);

const certSchema = z.object({
  buyerAddress: z.string().min(1),
  projectId: z.number().int().positive(),
  projectName: z.string().min(1),
  province: z.string().min(1),
  projectType: z.string().min(1),
  vintageYear: z.number().int(),
  creditsRetired: z.number().int().positive()
});

api.post("/retire/certificate", async (req, res) => {
  const parsed = certSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", issues: parsed.error.flatten() });
  }
  try {
    const result = await generateCertificate({
      ...parsed.data,
      issuedAt: new Date().toUTCString()
    });
    res.status(201).json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Certificate generation failed";
    res.status(502).json({ message: msg });
  }
});

api.get("/admin/stats", async (_req, res) => {
  const [totalProjects, totalEvidence, riskBuckets] = await Promise.all([
    prisma.carbonProject.count(),
    prisma.evidenceFile.count(),
    prisma.carbonProject.groupBy({
      by: ["riskScore"],
      _count: { riskScore: true },
    }),
  ]);
  const low = riskBuckets.filter(r => r.riskScore < 35).reduce((s, r) => s + r._count.riskScore, 0);
  const med = riskBuckets.filter(r => r.riskScore >= 35 && r.riskScore < 60).reduce((s, r) => s + r._count.riskScore, 0);
  const high = riskBuckets.filter(r => r.riskScore >= 60).reduce((s, r) => s + r._count.riskScore, 0);
  res.json({ totalProjects, totalEvidence, riskLow: low, riskMed: med, riskHigh: high });
});

api.post("/projects/assess", async (req, res) => {
  console.log("[assess] body keys:", Object.keys(req.body), "creatorAddress:", req.body.creatorAddress);
  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid project payload",
      issues: parsed.error.flatten()
    });
  }

  try {
    const assessment = await assessProject(parsed.data);
    const id = `P-${Date.now()}`;
    const creatorAddress = typeof req.body.creatorAddress === "string" ? req.body.creatorAddress : undefined;
    const storedProject = await saveProject({
      id,
      createdAt: new Date().toISOString(),
      input: parsed.data,
      assessment
    }, creatorAddress);
    res.status(201).json(storedProject);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Assessment failed";
    res.status(500).json({ message: msg });
  }
});

// ── Oracle: fetch real NASA POWER climatology data for a lat/lon ──────────────
// Used by frontend to simulate Chainlink oracle (Functions testnet sunset June 15, 2026)
api.get("/oracle/climate", async (req, res) => {
  const lat = req.query.lat as string;
  const lon = req.query.lon as string;
  if (!lat || !lon) return res.status(400).json({ message: "lat and lon required" });

  try {
    const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN,PRECTOTCORR&community=RE&longitude=${lon}&latitude=${lat}&format=JSON`;
    const nasaRes = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!nasaRes.ok) throw new Error(`NASA POWER HTTP ${nasaRes.status}`);

    const json = await nasaRes.json() as any;
    const params = json?.properties?.parameter;
    const solar = params?.ALLSKY_SFC_SW_DWN?.ANN as number;
    const precip = params?.PRECTOTCORR?.ANN as number;
    if (!solar || !precip) throw new Error("NASA POWER response missing ANN values");

    // Match oracle JS source encoding: × 100, integer
    const solarScaled  = Math.round(solar * 100);
    const precipScaled = Math.round(precip * 100);

    res.json({ solarScaled, precipScaled, solar, precip, lat, lon });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "NASA POWER fetch failed";
    res.status(502).json({ message: msg });
  }
});
