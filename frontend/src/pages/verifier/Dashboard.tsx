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

type ChallengeInfo = {
  challenger: string;
  fraudVotes: number;
  validVotes: number;
  deadline: number;   // unix timestamp
  finalized: boolean;
};

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

function fmtDeadline(deadline: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = deadline - now;
  if (diff <= 0) return "หมดเวลาแล้ว";
  const h = Math.floor(diff / 3600);
  const d = Math.floor(h / 24);
  if (d > 0) return `อีก ${d} วัน ${h % 24} ชั่วโมง`;
  return `อีก ${h} ชั่วโมง`;
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
  const [filter, setFilter] = useState<"all" | "pending" | "assessed" | "challenged">("all");
  const [evidenceMap, setEvidenceMap] = useState<Record<string, EvidenceFile[]>>({});
  const [pageLoading, setPageLoading] = useState(true);

  // Challenge system state
  const [isReviewer, setIsReviewer] = useState(false);
  const [reviewerBond, setReviewerBond] = useState(100);
  const [challengeData, setChallengeData] = useState<Record<number, ChallengeInfo>>({});
  const [hasVoted, setHasVoted] = useState<Record<number, boolean>>({});
  const [slashPct, setSlashPct] = useState(50);

  const isAssessor = wallet && config.assessorAddress
    ? wallet.account.toLowerCase() === config.assessorAddress.toLowerCase()
    : false;

  async function loadProjects() {
    const res = await fetch(`${apiBase}/projects`);
    if (!res.ok) return;
    const list: StoredProject[] = await res.json();
    setProjects(list);
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

  async function loadReviewerStatus(w: WalletState) {
    try {
      const { market } = await getContracts(w.provider);
      const reviewer = await market.reviewers(w.account);
      setIsReviewer(Boolean(reviewer.active));
      const bond = await market.reviewerBond();
      setReviewerBond(Number(formatUnits(bond, 18)));
    } catch {}
  }

  async function loadChallengeData(w: WalletState) {
    for (const onChainId of Object.values(projectMap)) {
      try {
        const { market } = await getContracts(w.provider);
        const ch = await market.challenges(onChainId);
        if (Number(ch.deadline) > 0) {
          const info: ChallengeInfo = {
            challenger: ch.challenger as string,
            fraudVotes: Number(ch.fraudVotes),
            validVotes: Number(ch.validVotes),
            deadline: Number(ch.deadline),
            finalized: Boolean(ch.finalized),
          };
          setChallengeData(prev => ({ ...prev, [onChainId]: info }));
          const voted = await market.hasVotedOnChallenge(onChainId, w.account);
          setHasVoted(prev => ({ ...prev, [onChainId]: Boolean(voted) }));
        }
      } catch {}
    }
  }

  useEffect(() => {
    Promise.all([loadProjects(), refreshWallet()]).finally(() => setPageLoading(false));
  }, []);

  useEffect(() => {
    if (wallet) {
      void loadOnChain(wallet);
      void loadReviewerStatus(wallet);
      void loadChallengeData(wallet);
    }
  }, [wallet, projectMap]);

  async function runAction(key: string, task: () => Promise<void>) {
    setActionKey(key);
    setTxMsg("");
    try {
      await task();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Transaction failed";
      setTxMsg(msg.includes("user rejected") || msg.includes("User denied") ? "❌ ยกเลิกใน MetaMask" : `❌ ${msg}`);
    } finally {
      setActionKey(null);
    }
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

  async function registerAsReviewer() {
    if (!wallet) throw new Error("Connect wallet first");
    const { market, utilityToken } = await getContracts(wallet.provider);
    const bond = await market.reviewerBond();
    setTxMsg("⏳ Step 1/2 — Approve TCUT spend...");
    const appTx = await utilityToken.approve(config.marketAddress, bond);
    await appTx.wait();
    setTxMsg("⏳ Step 2/2 — Registering as Reviewer...");
    const tx = await market.registerReviewer();
    await tx.wait();
    setIsReviewer(true);
    setTxMsg("✅ ลงทะเบียนเป็น Reviewer แล้ว — สามารถ Challenge โปรเจกต์ได้");
  }

  async function openChallenge(onChainId: number) {
    if (!wallet) throw new Error("Connect wallet first");
    const { market } = await getContracts(wallet.provider);
    const tx = await market.openChallenge(onChainId);
    await tx.wait();
    setTxMsg(`🔴 Challenge เปิดแล้วสำหรับโปรเจกต์ #${onChainId} — Reviewers สามารถ Vote ได้ภายใน 3 วัน`);
    if (wallet) { await loadOnChain(wallet); await loadChallengeData(wallet); }
  }

  async function voteOnChallenge(onChainId: number, fraudDetected: boolean) {
    if (!wallet) throw new Error("Connect wallet first");
    const { market } = await getContracts(wallet.provider);
    const tx = await market.voteOnChallenge(onChainId, fraudDetected);
    await tx.wait();
    setTxMsg(`✅ Vote บันทึกแล้ว — ${fraudDetected ? "🔴 Fraud" : "🟢 Valid"}`);
    if (wallet) await loadChallengeData(wallet);
  }

  async function finalizeChallenge(onChainId: number) {
    if (!wallet) throw new Error("Connect wallet first");
    const { market } = await getContracts(wallet.provider);
    const slashBps = slashPct * 100;
    const tx = await market.finalizeChallenge(onChainId, slashBps, 0, 20);
    await tx.wait();
    setTxMsg(`✅ Challenge สรุปแล้ว — Slash ${slashPct}% ของ Stake`);
    if (wallet) { await loadOnChain(wallet); await loadChallengeData(wallet); }
  }

  const displayed = projects.filter((p) => {
    const onChain = onChainData[p.id];
    if (filter === "pending") return !onChain || onChain.status === 0;
    if (filter === "assessed") return onChain && onChain.status >= 1 && onChain.status < 4;
    if (filter === "challenged") return onChain && onChain.status === 4;
    return true;
  });

  const challengedCount = projects.filter(p => onChainData[p.id]?.status === 4).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <WalletBar role="verifier" />

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🔍 Verifier Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">ตรวจสอบ Risk Score, อนุมัติโครงการ และ Challenge โปรเจกต์ที่น่าสงสัย</p>
          </div>

          {wallet && (
            <div className="flex flex-col items-end gap-2">
              {/* Assessor badge */}
              {isAssessor && (
                <span className="text-xs bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full font-semibold">⚡ Assessor Wallet</span>
              )}
              {/* Reviewer status */}
              {isReviewer ? (
                <span className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold">🔍 Registered Reviewer</span>
              ) : (
                <button
                  disabled={!!actionKey}
                  onClick={() => void runAction("register", registerAsReviewer)}
                  className="text-xs bg-amber-50 text-amber-700 border border-amber-300 px-3 py-1.5 rounded-full font-semibold hover:bg-amber-100 disabled:opacity-50 transition-colors">
                  {actionKey === "register" ? "⏳ Registering..." : `🔍 Register as Reviewer (stake ${reviewerBond} TCUT)`}
                </button>
              )}
            </div>
          )}
          {!isAssessor && wallet && !isReviewer && (
            <div className="w-full bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
              ⚠️ Wallet นี้ไม่ใช่ Assessor — ต้องลงทะเบียนเป็น Reviewer ก่อนจึงจะ Challenge ได้<br />
              <span className="font-mono">{config.assessorAddress ? `Assessor: ${config.assessorAddress.slice(0, 10)}...` : "VITE_ASSESSOR_ADDRESS not set"}</span>
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Projects", value: projects.length, color: "text-gray-900" },
            { label: "Awaiting Review", value: projects.filter(p => !onChainData[p.id] || onChainData[p.id].status === 0).length, color: "text-amber-600" },
            { label: "Approved", value: projects.filter(p => onChainData[p.id] && onChainData[p.id].status >= 1 && onChainData[p.id].status < 4).length, color: "text-emerald-600" },
            { label: "Challenged", value: challengedCount, color: "text-red-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-1 mb-4 bg-gray-200 rounded-lg p-1 w-fit">
          {(["all", "pending", "assessed", "challenged"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${filter === f ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
              {f}{f === "challenged" && challengedCount > 0 && <span className="ml-1 bg-red-100 text-red-600 text-[10px] px-1 rounded-full">{challengedCount}</span>}
            </button>
          ))}
        </div>

        {/* Challenge system explainer */}
        <details className="mb-4 group">
          <summary className="cursor-pointer text-xs text-blue-600 hover:text-blue-800 font-medium select-none list-none flex items-center gap-1">
            <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
            ระบบ Challenge คืออะไร? วิธีใช้งาน
          </summary>
          <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs text-gray-700 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white rounded-lg p-3 border border-blue-100">
                <p className="font-bold text-blue-800 mb-1">① Register Reviewer</p>
                <p className="text-gray-500 leading-5">stake {reviewerBond} TCUT เป็นหลักประกัน — ถ้า challenge โดยไม่มีเหตุผลจะเสีย reputation</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-100">
                <p className="font-bold text-blue-800 mb-1">② Open Challenge</p>
                <p className="text-gray-500 leading-5">กดบนโปรเจกต์ที่ Minted แล้วน่าสงสัย — ล็อกโปรเจกต์ 3 วัน Reviewers คนอื่น vote fraud/valid</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-100">
                <p className="font-bold text-blue-800 mb-1">③ Finalize</p>
                <p className="text-gray-500 leading-5">หลัง 3 วัน + quorum (2 votes) — ถ้า fraud ชนะ: slash stake ของ Developer, ครึ่งไปให้ Challenger</p>
              </div>
            </div>
          </div>
        </details>

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
            const ch = onChainId ? challengeData[onChainId] : undefined;
            const nowSec = Math.floor(Date.now() / 1000);
            const deadlinePassed = ch ? nowSec > ch.deadline : false;
            const totalVotes = ch ? ch.fraudVotes + ch.validVotes : 0;
            const quorumMet = totalVotes >= 2;
            const alreadyVoted = onChainId ? hasVoted[onChainId] : false;

            return (
              <div key={project.id}
                className={`bg-white rounded-2xl border shadow-sm p-5 cursor-pointer transition-all hover:shadow-md ${selected?.id === project.id ? "border-blue-400 ring-2 ring-blue-100" : onChain?.status === 4 ? "border-red-200" : "border-gray-200"}`}
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
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${riskBadge(project.assessment.riskScore)}`}>
                      Risk {project.assessment.riskScore} — {riskLabel(project.assessment.riskScore)}
                    </span>
                    {onChain
                      ? <span className={`text-xs px-2 py-1 rounded-full font-semibold ${onChain.status === 4 ? "bg-red-100 text-red-700" : onChain.status === 5 ? "bg-red-200 text-red-900" : "bg-emerald-100 text-emerald-700"}`}>{PROJECT_STATUS[onChain.status]}</span>
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

                      {/* Right: assessment + actions */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">📋 Assessment</h4>
                        <div className="space-y-2 text-sm mb-4">
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

                        {/* ── APPROVE section (Pending / not assessed yet) ── */}
                        {(!onChain || onChain.status === 0) && (
                          <div className="border border-gray-100 rounded-xl p-4">
                            <p className="text-xs font-semibold text-gray-600 mb-3">✅ Assessor Action</p>
                            <div className="mb-3">
                              <label className="text-xs font-medium text-gray-600">Comment (optional)</label>
                              <textarea className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-16 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                                value={comment} onChange={(e) => setComment(e.target.value)}
                                placeholder="ระบุเหตุผลหรือข้อสังเกต..." />
                            </div>
                            <button
                              disabled={!!actionKey || !wallet || !isReady || !isAssessor}
                              onClick={() => void runAction(`${project.id}:approve`, () => approveOnChain(project))}
                              className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 transition-colors">
                              {actionKey === `${project.id}:approve` ? "⏳ Approving..." : "✅ Approve On-Chain"}
                            </button>
                            {!isAssessor && wallet && (
                              <p className="text-xs text-amber-600 mt-2">Switch to Assessor wallet to approve on-chain</p>
                            )}
                            {!wallet && (
                              <p className="text-xs text-gray-400 mt-2">Connect wallet to approve on-chain</p>
                            )}
                          </div>
                        )}

                        {/* ── CHALLENGE section (Minted) ── */}
                        {onChain?.status === 3 && (
                          <div className="border border-orange-200 rounded-xl p-4 bg-orange-50">
                            <p className="text-xs font-semibold text-orange-700 mb-1">⚠️ Challenge โปรเจกต์นี้</p>
                            <p className="text-xs text-gray-500 mb-3 leading-5">ถ้าเห็นว่าข้อมูลโกหก เช่น ป่าไม่มีจริง หรือตัวเลขเกินจริง — กด Challenge เพื่อล็อกโปรเจกต์และเปิดให้ vote 3 วัน</p>
                            {isReviewer ? (
                              <button
                                disabled={!!actionKey}
                                onClick={() => void runAction(`${project.id}:challenge`, () => openChallenge(onChainId!))}
                                className="w-full bg-orange-500 text-white py-2 rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-40 transition-colors">
                                {actionKey === `${project.id}:challenge` ? "⏳ Opening..." : "🔴 Open Challenge"}
                              </button>
                            ) : (
                              <p className="text-xs text-amber-700 bg-amber-100 rounded-lg px-3 py-2">ต้องลงทะเบียนเป็น Reviewer ก่อน (stake {reviewerBond} TCUT)</p>
                            )}
                          </div>
                        )}

                        {/* ── CHALLENGED status panel ── */}
                        {onChain?.status === 4 && ch && (
                          <div className="border border-red-200 rounded-xl p-4 bg-red-50 space-y-4">
                            <div>
                              <p className="text-xs font-bold text-red-700 mb-2">🔴 Challenge กำลังดำเนินอยู่</p>
                              <div className="text-xs space-y-1 text-gray-700">
                                <div className="flex justify-between"><span>Challenger</span><span className="font-mono">{ch.challenger.slice(0, 8)}...{ch.challenger.slice(-4)}</span></div>
                                <div className="flex justify-between"><span>หมดเวลา</span><span className={deadlinePassed ? "text-red-600 font-semibold" : ""}>{fmtDeadline(ch.deadline)}</span></div>
                                <div className="flex justify-between"><span>Votes (Fraud / Valid)</span><span className="font-semibold">{ch.fraudVotes} / {ch.validVotes} <span className="text-gray-400">(quorum: 2)</span></span></div>
                              </div>
                              {/* Vote progress bar */}
                              {totalVotes > 0 && (
                                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div className="h-2 bg-red-400 rounded-full" style={{ width: `${(ch.fraudVotes / totalVotes) * 100}%` }} />
                                </div>
                              )}
                              {totalVotes > 0 && (
                                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                                  <span>🔴 Fraud {ch.fraudVotes}</span>
                                  <span>🟢 Valid {ch.validVotes}</span>
                                </div>
                              )}
                            </div>

                            {/* Vote buttons — before deadline, not voted yet, is reviewer */}
                            {!deadlinePassed && isReviewer && !alreadyVoted && (
                              <div>
                                <p className="text-xs font-semibold text-gray-700 mb-2">Vote ของคุณ:</p>
                                <div className="flex gap-2">
                                  <button
                                    disabled={!!actionKey}
                                    onClick={() => void runAction(`${project.id}:vote-fraud`, () => voteOnChallenge(onChainId!, true))}
                                    className="flex-1 bg-red-500 text-white py-2 rounded-lg text-xs font-semibold hover:bg-red-600 disabled:opacity-40 transition-colors">
                                    {actionKey === `${project.id}:vote-fraud` ? "⏳..." : "🔴 Fraud — โกหก"}
                                  </button>
                                  <button
                                    disabled={!!actionKey}
                                    onClick={() => void runAction(`${project.id}:vote-valid`, () => voteOnChallenge(onChainId!, false))}
                                    className="flex-1 bg-green-500 text-white py-2 rounded-lg text-xs font-semibold hover:bg-green-600 disabled:opacity-40 transition-colors">
                                    {actionKey === `${project.id}:vote-valid` ? "⏳..." : "🟢 Valid — ข้อมูลจริง"}
                                  </button>
                                </div>
                              </div>
                            )}
                            {alreadyVoted && <p className="text-xs text-gray-400 text-center">✓ คุณ Vote แล้ว</p>}
                            {!deadlinePassed && !isReviewer && (
                              <p className="text-xs text-amber-700 bg-amber-100 rounded-lg px-3 py-2">ต้องลงทะเบียนเป็น Reviewer ก่อนจึงจะ Vote ได้</p>
                            )}

                            {/* Finalize — after deadline + quorum met */}
                            {deadlinePassed && !ch.finalized && (
                              <div className="border-t border-red-200 pt-3">
                                <p className="text-xs font-semibold text-gray-700 mb-2">สรุปผล Challenge</p>
                                {quorumMet ? (
                                  <div className="space-y-3">
                                    <div>
                                      <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-600">Slash Stake (%)</span>
                                        <span className="font-bold text-red-600">{slashPct}%</span>
                                      </div>
                                      <input type="range" min={0} max={100} step={5} value={slashPct}
                                        onChange={(e) => setSlashPct(Number(e.target.value))}
                                        className="w-full accent-red-500" />
                                      <div className="flex justify-between text-[10px] text-gray-400">
                                        <span>0% (คืน Stake)</span>
                                        <span>100% (ยึดทั้งหมด)</span>
                                      </div>
                                      <p className="text-[10px] text-gray-400 mt-1">
                                        ถ้า Fraud ชนะ: Challenger ได้ {slashPct/2}% + Treasury ได้ {slashPct/2}%
                                      </p>
                                    </div>
                                    <button
                                      disabled={!!actionKey}
                                      onClick={() => void runAction(`${project.id}:finalize`, () => finalizeChallenge(onChainId!))}
                                      className="w-full bg-red-600 text-white py-2 rounded-lg text-xs font-semibold hover:bg-red-700 disabled:opacity-40 transition-colors">
                                      {actionKey === `${project.id}:finalize` ? "⏳ Finalizing..." : "⚖️ Finalize Challenge"}
                                    </button>
                                  </div>
                                ) : (
                                  <p className="text-xs text-amber-700 bg-amber-100 rounded-lg px-3 py-2">
                                    ⚠️ Quorum ยังไม่ครบ ({totalVotes}/2 votes) — ต้องมีอย่างน้อย 2 votes ก่อน Finalize ได้
                                  </p>
                                )}
                              </div>
                            )}
                            {ch.finalized && (
                              <p className="text-xs text-center text-gray-400">✓ Challenge สรุปแล้ว</p>
                            )}
                          </div>
                        )}

                        {/* Slashed */}
                        {onChain?.status === 5 && (
                          <div className="border border-red-300 rounded-xl p-4 bg-red-50 text-xs text-red-700">
                            <p className="font-bold mb-1">🔴 โปรเจกต์นี้ถูก Slashed</p>
                            <p className="text-gray-500">Stake ของ Developer ถูกยึดบางส่วน — โปรเจกต์ถูกล็อกถาวร</p>
                          </div>
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
