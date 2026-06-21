import { parseEther } from "ethers";
import { useEffect, useState } from "react";
import WalletBar from "../../components/WalletBar";
import { getConnectedWallet, getContractConfig, getContracts, type WalletState } from "../../lib/web3";
import type { EvidenceFile } from "../../types";
import { loadProjectMap } from "../../lib/storage";
import type { StoredProject, OnChainProject } from "../../types";
import { PROJECT_STATUS } from "../../types";
import { formatUnits } from "ethers";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";
const config = getContractConfig();

function mapOnChainProject(raw: {
  id: bigint; seller: string; requestedCredits: bigint; approvedCredits: bigint;
  riskScore: bigint; trustScore: bigint; requiredStake: bigint; stakedAmount: bigint;
  availableCredits: bigint; pricePerCredit: bigint; status: number;
}): OnChainProject {
  return {
    id: Number(raw.id), seller: raw.seller,
    requestedCredits: Number(raw.requestedCredits), approvedCredits: Number(raw.approvedCredits),
    riskScore: Number(raw.riskScore), trustScore: Number(raw.trustScore),
    requiredStakeFormatted: formatUnits(raw.requiredStake, 18),
    stakedAmountFormatted: formatUnits(raw.stakedAmount, 18),
    availableCredits: Number(raw.availableCredits),
    pricePerCreditFormatted: formatUnits(raw.pricePerCredit, 18),
    status: Number(raw.status),
  };
}

function riskBadge(score: number) {
  if (score < 35) return "bg-green-100 text-green-800";
  if (score < 60) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

function riskLabel(score: number) {
  if (score < 35) return "Low Risk";
  if (score < 60) return "Medium Risk";
  return "High Risk";
}

export default function VerifierDashboard() {
  const [projects, setProjects] = useState<StoredProject[]>([]);
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [projectMap] = useState(() => loadProjectMap());
  const [onChainData, setOnChainData] = useState<Record<string, OnChainProject>>({});
  const [selected, setSelected] = useState<StoredProject | null>(null);
  const [comment, setComment] = useState("");
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [txMsg, setTxMsg] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "assessed">("all");
  const [slashPct, setSlashPct] = useState<Record<string, number>>({});
  const [evidenceMap, setEvidenceMap] = useState<Record<string, EvidenceFile[]>>({});
  const [pageLoading, setPageLoading] = useState(true);

  const isAssessor = wallet && config.assessorAddress
    ? wallet.account.toLowerCase() === config.assessorAddress.toLowerCase()
    : false;

  async function loadProjects() {
    const res = await fetch(`${apiBase}/projects`);
    if (!res.ok) return;
    const list: StoredProject[] = await res.json();
    setProjects(list);
    // load evidence for every project in parallel
    const entries = await Promise.all(
      list.map(async (p) => {
        const r = await fetch(`${apiBase}/projects/${p.id}/evidence`);
        const ev: EvidenceFile[] = r.ok ? await r.json() : [];
        return [p.id, ev] as const;
      })
    );
    setEvidenceMap(Object.fromEntries(entries));
  }

  async function refreshWallet() {
    const w = await getConnectedWallet();
    setWallet(w);
  }

  async function loadOnChain(w: WalletState) {
    for (const [localId, onChainId] of Object.entries(projectMap)) {
      try {
        const { market } = await getContracts(w.provider);
        const raw = await market.projects(onChainId);
        setOnChainData((prev) => ({ ...prev, [localId]: mapOnChainProject(raw) }));
      } catch {}
    }
  }

  useEffect(() => {
    Promise.all([loadProjects(), refreshWallet()]).finally(() => setPageLoading(false));
  }, []);

  useEffect(() => {
    if (wallet) void loadOnChain(wallet);
  }, [wallet, projectMap]);

  async function runAction(key: string, task: () => Promise<void>) {
    setActionKey(key);
    setTxMsg("");
    try {
      await task();
    } catch (e) {
      setTxMsg(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setActionKey(null);
    }
  }

  async function rejectOnChain(project: StoredProject) {
    if (!wallet) throw new Error("Connect wallet first");
    const onChainId = projectMap[project.id];
    if (!onChainId) throw new Error("Project not submitted on-chain yet");
    const pct = slashPct[project.id] ?? 50;
    const bps = pct * 100;
    const { market } = await getContracts(wallet.provider);
    const tx = await market.rejectProject(onChainId, bps);
    await tx.wait();
    setTxMsg(`🔴 Rejected Project #${onChainId} — Slashed ${pct}% of stake`);
    setSelected(null);
    await loadProjects();
    if (wallet) await loadOnChain(wallet);
  }

  async function approveOnChain(project: StoredProject) {
    if (!wallet) throw new Error("Connect wallet first");
    const onChainId = projectMap[project.id];
    if (!onChainId) throw new Error("Project not submitted on-chain yet");
    const { market } = await getContracts(wallet.provider);
    const tx = await market.assessProject(
      onChainId,
      project.assessment.approvedCredits,
      project.assessment.riskScore,
      project.assessment.trustScore,
      parseEther(String(project.assessment.requiredStake)),
    );
    await tx.wait();
    setTxMsg(`✅ Approved Project #${onChainId} on-chain`);
    setSelected(null);
    await loadProjects();
    if (wallet) await loadOnChain(wallet);
  }

  const displayed = projects.filter((p) => {
    const onChain = onChainData[p.id];
    if (filter === "pending") return !onChain || onChain.status === 0;
    if (filter === "assessed") return onChain && onChain.status >= 1;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <WalletBar role="verifier" />

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🔍 Verifier Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">ตรวจสอบ Risk Score และอนุมัติโครงการบน Blockchain</p>
          </div>
          {!isAssessor && wallet && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 max-w-xs">
              ⚠️ Wallet นี้ไม่ใช่ Assessor — ไม่สามารถ Approve on-chain ได้<br />
              <span className="font-mono">{config.assessorAddress ? `Expected: ${config.assessorAddress.slice(0, 10)}...` : "VITE_ASSESSOR_ADDRESS not set"}</span>
            </div>
          )}
        </div>

        {pageLoading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        )}

        {txMsg && (
          <div className={`mb-4 p-3 rounded-lg text-sm border ${txMsg.startsWith("✅") ? "bg-emerald-50 border-emerald-200 text-emerald-800" : txMsg.startsWith("❌") ? "bg-red-50 border-red-200 text-red-700" : "bg-blue-50 border-blue-200 text-blue-700"}`}>{txMsg}</div>
        )}

        {!pageLoading && (<>
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: "Total Projects", value: projects.length, color: "text-gray-900" },
            { label: "Awaiting Review", value: projects.filter(p => !onChainData[p.id] || onChainData[p.id].status === 0).length, color: "text-amber-600" },
            { label: "Approved", value: projects.filter(p => onChainData[p.id] && onChainData[p.id].status >= 1).length, color: "text-emerald-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-1 mb-4 bg-gray-200 rounded-lg p-1 w-fit">
          {(["all", "pending", "assessed"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${filter === f ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
              {f}
            </button>
          ))}
        </div>

        {/* Project List */}
        <div className="space-y-3">
          {displayed.length === 0 && !pageLoading && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-lg font-medium">ไม่มีโครงการ</p>
              <p className="text-sm">รอ Developer ส่งโครงการเข้ามา</p>
            </div>
          )}
          {displayed.map((project) => {
            const onChain = onChainData[project.id];
            const onChainId = projectMap[project.id];
            const isReady = !!onChainId;
            return (
              <div key={project.id}
                className={`bg-white rounded-2xl border shadow-sm p-5 cursor-pointer transition-all hover:shadow-md ${selected?.id === project.id ? "border-blue-400 ring-2 ring-blue-100" : "border-gray-200"}`}
                onClick={() => setSelected(selected?.id === project.id ? null : project)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {project.input.projectType === "forest" ? "🌳" : project.input.projectType === "mangrove" ? "🌿" : project.input.projectType === "solar" ? "☀️" : "⚡"}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-900">{project.input.projectName}</p>
                      <p className="text-xs text-gray-500">{project.input.sellerName} • {project.input.province} • {project.input.landAreaRai} ไร่</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${riskBadge(project.assessment.riskScore)}`}>
                      Risk {project.assessment.riskScore} — {riskLabel(project.assessment.riskScore)}
                    </span>
                    {onChain
                      ? <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">{PROJECT_STATUS[onChain.status]}</span>
                      : <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">Not on-chain</span>
                    }
                    {!isReady && <span className="text-xs text-amber-500">⚠️ Not submitted</span>}
                  </div>
                </div>

                {/* Expanded review panel */}
                {selected?.id === project.id && (
                  <div className="mt-5 pt-5 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                    {/* Evidence files */}
                    {(() => {
                      const ev = evidenceMap[project.id] ?? [];
                      return ev.length > 0 ? (
                        <div className="mb-5">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">📎 หลักฐานที่แนบมา ({ev.length} ไฟล์)</h4>
                          <div className="flex flex-wrap gap-2">
                            {ev.map((f) => (
                              <a key={f.id} href={f.ipfsUrl} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-100 transition-colors">
                                <span>{f.mimeType === "application/pdf" ? "📄" : "🖼️"}</span>
                                <div>
                                  <p className="font-medium">{f.fileName}</p>
                                  <p className="text-emerald-500 font-mono">{f.ipfsCid.slice(0, 14)}...</p>
                                </div>
                                <span className="text-emerald-400">↗</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-700">
                          ⚠️ Developer ยังไม่ได้อัปโหลดหลักฐาน
                        </div>
                      );
                    })()}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Left: signals */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">📊 Risk Signals</h4>
                        <div className="space-y-2">
                          {Object.entries(project.assessment.signals).map(([k, v]) => {
                            const pct = Math.min(100, Math.max(0, Number(v)));
                            return (
                              <div key={k}>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-gray-500 capitalize">{k.replace(/([A-Z])/g, " $1").trim()}</span>
                                  <span className="font-semibold text-gray-700">{v}</span>
                                </div>
                                <div className="h-1.5 bg-gray-100 rounded-full">
                                  <div className={`h-1.5 rounded-full ${pct > 70 ? "bg-emerald-400" : pct > 40 ? "bg-yellow-400" : "bg-red-400"}`} style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right: assessment */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">📋 Assessment</h4>
                        <div className="space-y-2 text-sm">
                          {[
                            { label: "Requested Credits", value: project.input.requestedCredits },
                            { label: "Approved Credits", value: project.assessment.approvedCredits },
                            { label: "Approved Reduction", value: `${project.assessment.approvedReduction} tCO₂` },
                            { label: "Required Stake", value: `${project.assessment.requiredStake} TCUT` },
                            { label: "Trust Score", value: project.assessment.trustScore },
                          ].map((m) => (
                            <div key={m.label} className="flex justify-between py-1 border-b border-gray-50">
                              <span className="text-gray-500">{m.label}</span>
                              <span className="font-semibold text-gray-900">{m.value}</span>
                            </div>
                          ))}
                        </div>

                        {/* Comment + actions */}
                        <div className="mt-4">
                          <label className="text-xs font-medium text-gray-600">Comment (optional)</label>
                          <textarea className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-16 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                            value={comment} onChange={(e) => setComment(e.target.value)}
                            placeholder="ระบุเหตุผลหรือข้อสังเกต..." />
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            disabled={!!actionKey || !wallet || !isReady || !isAssessor}
                            onClick={() => void runAction(`${project.id}:approve`, () => approveOnChain(project))}
                            className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 transition-colors">
                            {actionKey === `${project.id}:approve` ? "⏳ Approving..." : "✅ Approve On-Chain"}
                          </button>
                        </div>

                        {/* Reject section */}
                        {isAssessor && isReady && (
                          <div className="mt-4 border border-red-200 rounded-xl p-4 bg-red-50">
                            <p className="text-xs font-semibold text-red-700 mb-3">🔴 Reject โปรเจกต์นี้</p>
                            <div className="mb-3">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-600">Slash Stake (%)</span>
                                <span className="font-bold text-red-600">{slashPct[project.id] ?? 50}%</span>
                              </div>
                              <input type="range" min={0} max={100} step={5}
                                value={slashPct[project.id] ?? 50}
                                onChange={(e) => setSlashPct(prev => ({ ...prev, [project.id]: Number(e.target.value) }))}
                                className="w-full accent-red-500" />
                              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                                <span>0% — คืน Stake ทั้งหมด</span>
                                <span>100% — ยึดทั้งหมด</span>
                              </div>
                              <p className="text-[10px] text-gray-500 mt-1.5 leading-4">
                                ถ้า project ยังไม่ได้ stake → slash = 0 อัตโนมัติ<br/>
                                Stake ที่ยึดได้จะโอนเข้า Treasury ทั้งหมด
                              </p>
                            </div>
                            <button
                              disabled={!!actionKey}
                              onClick={() => void runAction(`${project.id}:reject`, () => rejectOnChain(project))}
                              className="w-full bg-red-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-40 transition-colors">
                              {actionKey === `${project.id}:reject` ? "⏳ Rejecting..." : `🔴 Reject & Slash ${slashPct[project.id] ?? 50}%`}
                            </button>
                          </div>
                        )}

                        {!isAssessor && wallet && (
                          <p className="text-xs text-amber-600 mt-2">Switch to Assessor wallet to approve or reject on-chain</p>
                        )}
                        {!wallet && (
                          <p className="text-xs text-gray-400 mt-2">Connect wallet to approve or reject on-chain</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </>)}
      </div>
    </div>
  );
}
