import { useEffect, useRef, useState } from "react";
import type { EvidenceFile } from "../types";

type Props = {
  projectId: string;
  projectName: string;
};

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const ALLOWED_LABEL = "PDF, JPG, PNG, WEBP (สูงสุด 10 MB)";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mimeType: string) {
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.startsWith("image/")) return "🖼️";
  return "📎";
}

export default function EvidenceUpload({ projectId, projectName }: Props) {
  const [files, setFiles] = useState<EvidenceFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function loadEvidence() {
    const res = await fetch(`${apiBase}/projects/${projectId}/evidence`);
    if (res.ok) setFiles(await res.json());
  }

  useEffect(() => { void loadEvidence(); }, [projectId]);

  async function uploadFile(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(`ไฟล์ประเภท "${file.type}" ไม่รองรับ — ใช้ ${ALLOWED_LABEL}`);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("ไฟล์ใหญ่เกิน 10 MB");
      return;
    }

    setError("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch(`${apiBase}/projects/${projectId}/evidence`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        throw new Error(data.message ?? "Upload failed");
      }

      await loadEvidence();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          📎 หลักฐานโครงการ
          {files.length > 0 && (
            <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
              {files.length} ไฟล์
            </span>
          )}
        </h3>
        <span className="text-xs text-gray-400">{ALLOWED_LABEL}</span>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
          ${dragOver ? "border-emerald-400 bg-emerald-50" : "border-gray-300 hover:border-emerald-400 hover:bg-gray-50"}
          ${uploading ? "pointer-events-none opacity-60" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={onFileInput}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-emerald-600">
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">กำลังอัปโหลดไป IPFS...</p>
          </div>
        ) : (
          <>
            <p className="text-3xl mb-2">📤</p>
            <p className="text-sm font-medium text-gray-700">ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือก</p>
            <p className="text-xs text-gray-400 mt-1">{ALLOWED_LABEL}</p>
            <p className="text-xs text-emerald-600 mt-1 font-medium">ไฟล์จะถูกอัปโหลดไป IPFS ผ่าน Pinata</p>
          </>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f) => (
            <div key={f.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xl flex-shrink-0">{fileIcon(f.mimeType)}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{f.fileName}</p>
                  <p className="text-xs text-gray-400">
                    {formatBytes(f.fileSizeBytes)} •{" "}
                    {new Date(f.uploadedAt).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                <span className="hidden sm:block text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                  {f.ipfsCid.slice(0, 12)}...
                </span>
                <a
                  href={f.ipfsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 font-medium transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  เปิด IPFS ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {files.length === 0 && !uploading && (
        <p className="text-xs text-gray-400 text-center">
          ยังไม่มีหลักฐาน — อัปโหลดเอกสารโครงการ, รูปภาพ หรือใบรับรอง
        </p>
      )}
    </div>
  );
}
