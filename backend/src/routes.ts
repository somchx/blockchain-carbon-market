import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { uploadFileToIPFS } from "./ipfsService.js";
import { assessProject } from "./riskEngine.js";
import { getLeaderboard, getProject, listEvidence, listProjects, saveEvidence, saveProject } from "./store.js";

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

api.post("/projects/assess", async (req, res) => {
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
    const storedProject = await saveProject({
      id,
      createdAt: new Date().toISOString(),
      input: parsed.data,
      assessment
    });
    res.status(201).json(storedProject);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Assessment failed";
    res.status(500).json({ message: msg });
  }
});
