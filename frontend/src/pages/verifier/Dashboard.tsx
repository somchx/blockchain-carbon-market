import { parseEther, formatUnits, MaxUint256 } from "ethers";
import { useEffect, useRef, useState } from "react";
import WalletBar from "../../components/WalletBar";
import { getConnectedWallet, getContracts, type WalletState } from "../../lib/web3";
import type { EvidenceFile, StoredProject, OnChainProject } from "../../types";
import { PROJECT_STATUS } from "../../types";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

type ChallengeData = {
  challenger: string;
  fraudVotes: number;
  validVotes: number;
  deadline: number;
  finalized: boolean;
};

type ReviewerProfile = {
  active: boolean;
  stakedAmount: string;
  reputation: number;
};

type VerifierAccessResponse = {
  walletAddress: string;
  status: "none" | "approved";
  hasAccess: boolean;
  requestedAt?: string;
  approvedAt?: string;
  approvalMode?: string;
  message?: string;
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

function formatDeadline(ts: number) {
  if (!ts) return "—";
  const d = new Date(ts * 1000);
  return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

function formatCountdown(deadline: number, now: number) {
  const remaining = deadline - now;
  if (remaining <= 0) return null;
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const mins = Math.floor((remaining % 3600) / 60);
  const secs = remaining % 60;
  if (days > 0) return `${days} วัน ${hours} ชม. ${mins} นาที`;
  if (hours > 0) return `${hours} ชม. ${mins} นาที ${secs} วิ`;
  return `${mins} นาที ${secs} วิ`;
}

export default function VerifierDashboard() {
  const [projects, setProjects] = useState<StoredProject[]>([]);
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [onChainData, setOnChainData] = useState<Record<string, OnChainProject>>({});
  const [selected, setSelected] = useState<StoredProject | null>(null);
  const [comment, setComment] = useState("");
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [txMsg, setTxMsg] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "assessed">("all");
  const [evidenceMap, setEvidenceMap] = useState<Record<string, EvidenceFile[]>>({});
  const [pageLoading, setPageLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const syncedRef = useRef(false);
  const [hasVerifierAccess, setHasVerifierAccess] = useState<boolean | null>(null);
  const [requestingAccess, setRequestingAccess] = useState(false);

  // Live clock for countdowns — ticks every second
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  // Challenge state
  const [reviewerProfile, setReviewerProfile] = useState<ReviewerProfile | null>(null);
  const [reviewerBondAmt, setReviewerBondAmt] = useState("100");
  const [challengeMap, setChallengeMap] = useState<Record<number, ChallengeData>>({});
  const [hasVotedMap, setHasVotedMap] = useState<Record<number, boolean>>({});
  const [demoOutcomeMap, setDemoOutcomeMap] = useState<Record<number, "upheld" | "rejected">>({});

  const canApproveOnChain = !!wallet && hasVerifierAccess === true;

  async function loadProjects(): Promise<StoredProject[]> {
    const res = await fetch(`${apiBase}/projects`);
    if (!res.ok) return [];
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
    return list;
  }

  async function refreshWallet() {
    const w = await getConnectedWallet();
    setWallet(w);
    return w;
  }

  async function fetchVerifierAccess(walletAddress: string): Promise<boolean> {
    const res = await fetch(`${apiBase}/verifier-access/${walletAddress}`);
    if (!res.ok) throw new Error("Failed to check verifier access");
    const data: VerifierAccessResponse = await res.json();
    const approved = data.hasAccess && data.status === "approved";
    setHasVerifierAccess(approved);
    return approved;
  }

  async function loadOnChain(w: WalletState, list: StoredProject[]) {
    const { market } = await getContracts(w.provider);
    for (const p of list) {
      if (!p.onChainId) continue;
      try {
        const raw = await market.projects(p.onChainId);
        setOnChainData((prev) => ({ ...prev, [p.id]: mapOnChainProject(raw) }));
      } catch {}
    }
  }

  async function syncOnChainIds(w: WalletState, list: StoredProject[], silent = false) {
    setSyncing(true);
    try {
      const { market } = await getContracts(w.provider);
      const nextId = Number(await market.nextProjectId());
      const hashToLocal: Record<string, StoredProject> = {};
      for (const p of list) {
        hashToLocal[p.assessment.sourceHash.toLowerCase()] = p;
      }
      for (let id = 1; id < nextId; id++) {
        try {
          const raw = await market.projects(id);
          const hash = (raw.sourceDataHash as string).toLowerCase();
          const localProject = hashToLocal[hash];
          if (localProject && !localProject.onChainId) {
            await fetch(`${apiBase}/projects/${localProject.id}/on-chain`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ onChainId: id }),
            });
          }
          if (localProject) {
            setOnChainData((prev) => ({ ...prev, [localProject.id]: mapOnChainProject(raw) }));
          }
        } catch {}
      }
      const updated = await loadProjects();
      await loadOnChain(w, updated);
      if (!silent) {
        setTxMsg("✅ Sync สำเร็จ — พบและอัปเดต on-chain ID แล้ว");
      }
      return updated;
    } finally {
      setSyncing(false);
    }
  }

  async function loadReviewerData(w: WalletState) {
    try {
      const { market } = await getContracts(w.provider);
      const [profile, bond] = await Promise.all([
        market.reviewers(w.account),
        market.reviewerBond(),
      ]);
      setReviewerProfile({
        active: profile.active,
        stakedAmount: formatUnits(profile.stakedAmount, 18),
        reputation: Number(profile.reputation),
      });
      setReviewerBondAmt(formatUnits(bond, 18));
    } catch {}
  }

  async function loadChallenges(w: WalletState, list: StoredProject[]) {
    try {
      const { market } = await getContracts(w.provider);
      for (const p of list) {
        if (!p.onChainId) continue;
        const id = p.onChainId;
        try {
          const ch = await market.challenges(id);
          if (Number(ch.deadline) > 0) {
            setChallengeMap((prev) => ({
              ...prev,
              [id]: {
                challenger: ch.challenger,
                fraudVotes: Number(ch.fraudVotes),
                validVotes: Number(ch.validVotes),
                deadline: Number(ch.deadline),
                finalized: ch.finalized,
              },
            }));
            const voted = await market.hasVotedOnChallenge(id, w.account);
            setHasVotedMap((prev) => ({ ...prev, [id]: voted }));
          }
        } catch {}
      }
    } catch {}
  }

  async function loadVerifierWorkspace(w: WalletState) {
    let list = await loadProjects();
    if (list.length > 0) {
      if (!syncedRef.current) {
        syncedRef.current = true;
        list = (await syncOnChainIds(w, list, true)) ?? list;
      } else {
        await loadOnChain(w, list);
      }
      await loadChallenges(w, list);
    } else {
      setOnChainData({});
      setChallengeMap({});
      setHasVotedMap({});
    }
    await loadReviewerData(w);
  }

  function resetVerifierWorkspace() {
    syncedRef.current = false;
    setProjects([]);
    setOnChainData({});
    setSelected(null);
    setEvidenceMap({});
    setReviewerProfile(null);
    setChallengeMap({});
    setHasVotedMap({});
    setDemoOutcomeMap({});
  }

  async function bootstrapVerifierPage() {
    setPageLoading(true);
    try {
      const w = await refreshWallet();
      if (!w) {
        setHasVerifierAccess(null);
        resetVerifierWorkspace();
        return;
      }
      const approved = await fetchVerifierAccess(w.account);
      if (!approved) {
        resetVerifierWorkspace();
        return;
      }
      await loadVerifierWorkspace(w);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load verifier dashboard";
      setTxMsg(`❌ ${msg}`);
    } finally {
      setPageLoading(false);
    }
  }

  useEffect(() => {
    void bootstrapVerifierPage();
    if (!window.ethereum?.on) return;
    const handler = () => void bootstrapVerifierPage();
    window.ethereum.on("accountsChanged", handler);
    window.ethereum.on("chainChanged", handler);
    return () => {
      window.ethereum?.removeListener?.("accountsChanged", handler);
      window.ethereum?.removeListener?.("chainChanged", handler);
    };
  }, []);

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

  async function handleRequestAccess() {
    if (!wallet) throw new Error("Connect wallet first");
    setRequestingAccess(true);
    try {
      const res = await fetch(`${apiBase}/verifier-access/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: wallet.account }),
      });
      if (!res.ok) throw new Error("Failed to request verifier access");
      const data: VerifierAccessResponse = await res.json();
      setHasVerifierAccess(true);
      setTxMsg(`✅ ${data.message ?? "Auto-approved for demo"}`);
      await loadVerifierWorkspace(wallet);
    } finally {
      setRequestingAccess(false);
    }
  }

  async function approveOnChain(project: StoredProject, ocId: number) {
    if (!wallet) throw new Error("Connect wallet first");
    const { market } = await getContracts(wallet.provider);
    const tx = await market.assessProject(
      ocId,
      project.assessment.approvedCredits,
      project.assessment.riskScore,
      project.assessment.trustScore,
      parseEther(String(project.assessment.requiredStake)),
    );
    await tx.wait();
    setTxMsg(`✅ Approved Project #${ocId} on-chain`);
    setSelected(null);
    const list = await loadProjects();
    if (wallet) await loadOnChain(wallet, list);
  }

  async function rejectOnChain(_project: StoredProject, ocId: number, slashBps: number) {
    if (!wallet) throw new Error("Connect wallet first");
    const { market } = await getContracts(wallet.provider);
    const tx = await market.rejectProject(ocId, slashBps);
    await tx.wait();
    setTxMsg(`❌ Rejected Project #${ocId} — Slashed ${slashBps / 100}% of stake`);
    setSelected(null);
    const list = await loadProjects();
    if (wallet) await loadOnChain(wallet, list);
  }

  async function handleRegisterReviewer() {
    if (!wallet) throw new Error("Connect wallet first");
    const { market, utilityToken } = await getContracts(wallet.provider);
    const bondWei = parseEther(reviewerBondAmt);
    const allowance = await utilityToken.allowance(wallet.account, await market.getAddress());
    if (allowance < bondWei) {
      const appTx = await utilityToken.approve(await market.getAddress(), MaxUint256);
      await appTx.wait();
    }
    const tx = await market.registerReviewer();
    await tx.wait();
    setTxMsg(`✅ Registered as Reviewer — Bond ${reviewerBondAmt} TCUT deposited`);
    await loadReviewerData(wallet);
  }

  async function handleOpenChallenge(onChainId: number) {
    if (!wallet) throw new Error("Connect wallet first");
    const { market } = await getContracts(wallet.provider);
    const tx = await market.openChallenge(onChainId);
    await tx.wait();
    setTxMsg(`⚠️ Challenge opened for Project #${onChainId}`);
    await loadOnChain(wallet, projects);
    await loadChallenges(wallet, projects);
  }

  async function handleVote(onChainId: number, fraudDetected: boolean) {
    if (!wallet) throw new Error("Connect wallet first");
    const { market } = await getContracts(wallet.provider);
    const tx = await market.voteOnChallenge(onChainId, fraudDetected);
    await tx.wait();
    setTxMsg(`✅ โหวตแล้ว: ${fraudDetected ? "เห็นควร Slash" : "ไม่เห็นควร Slash"}`);
    await loadOnChain(wallet, projects);
    await loadChallenges(wallet, projects);
  }

  async function handleDemoResolve(onChainId: number, outcome: "upheld" | "rejected") {
    if (!wallet) throw new Error("Connect wallet first");
    const { market } = await getContracts(wallet.provider);
    const tx = await market.demoResolveChallenge(onChainId, outcome === "upheld");
    await tx.wait();
    setTxMsg(outcome === "upheld"
      ? "✂️ Demo: Challenge upheld — slash stake ทั้งหมดให้ challenger และเพิ่มความน่าเชื่อถือแล้ว"
      : "✅ Demo: Challenge rejected — โครงการกลับไป Minted และ challenger ถูกหัก bond เล็กน้อยแล้ว");
    await loadOnChain(wallet, projects);
    await loadChallenges(wallet, projects);
    await loadReviewerData(wallet);
  }

  function isOwnProject(project: StoredProject): boolean {
    const myAddr = wallet?.account?.toLowerCase();
    if (!myAddr) return false;
    if (project.creatorAddress?.toLowerCase() === myAddr) return true;
    const seller = onChainData[project.id]?.seller?.toLowerCase();
    return seller === myAddr;
  }

  const reviewableProjects = projects.filter((p) => !isOwnProject(p));

  const displayed = reviewableProjects.filter((p) => {
    const onChain = onChainData[p.id];
    if (filter === "pending") return !onChain || onChain.status === 0;
    if (filter === "assessed") return onChain && onChain.status >= 1;
    return true;
  });

  const isRegistered = reviewerProfile?.active === true;

  return (
    <div className="min-h-screen bg-gray-50">
      <WalletBar role="verifier" />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🔍 Verifier Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">ตรวจสอบ Risk Score และอนุมัติโครงการบน Blockchain</p>
          </div>
          {wallet && (
            <button
              disabled={syncing}
              onClick={() => void syncOnChainIds(wallet, projects)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40 transition-colors"
            >
              {syncing ? "⏳ Reloading..." : "🔄 Reload"}
            </button>
          )}
        </div>

        {pageLoading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        )}

        {txMsg && (
          <div className={`mb-4 p-3 rounded-lg text-sm border ${txMsg.startsWith("✅") ? "bg-emerald-50 border-emerald-200 text-emerald-800" : txMsg.startsWith("❌") ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>{txMsg}</div>
        )}

        {!pageLoading && wallet && hasVerifierAccess === false && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
            <p className="text-5xl mb-4">🛡️</p>
            <h2 className="text-xl font-bold text-gray-900">Verifier Access Required</h2>
            <p className="text-sm text-gray-500 mt-2 max-w-xl mx-auto">
              บัญชีนี้ยังไม่มีสิทธิ์เข้าดูรายการตรวจสอบ กดปุ่มด้านล่างเพื่อส่งคำขอ และระบบจะ auto-approve ให้ทันทีสำหรับ demo
            </p>
            <button
              disabled={requestingAccess}
              onClick={() => void runAction("request-access", () => handleRequestAccess())}
              className="mt-6 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              {requestingAccess || actionKey === "request-access" ? "Requesting..." : "Request Verifier Access"}
            </button>
          </div>
        )}

        {!pageLoading && !wallet && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
            <p className="text-5xl mb-4">🔌</p>
            <h2 className="text-xl font-bold text-gray-900">Connect Wallet First</h2>
            <p className="text-sm text-gray-500 mt-2">
              เชื่อมต่อ MetaMask เพื่อให้ระบบตรวจสิทธิ์ verifier ของคุณจาก backend
            </p>
          </div>
        )}

        {!pageLoading && wallet && hasVerifierAccess && (<>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "โปรเจคที่ตรวจได้", value: reviewableProjects.length, color: "text-gray-900" },
            { label: "รอตรวจสอบ", value: reviewableProjects.filter(p => !onChainData[p.id] || onChainData[p.id].status === 0).length, color: "text-amber-600" },
            { label: "อนุมัติแล้ว", value: reviewableProjects.filter(p => onChainData[p.id] && [1,2,3].includes(onChainData[p.id].status)).length, color: "text-emerald-600" },
            { label: "⚠️ Challenge / Slashed", value: reviewableProjects.filter(p => onChainData[p.id]?.status === 4 || onChainData[p.id]?.status === 5).length, color: "text-orange-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Active challenge countdown banner */}
        {reviewableProjects.some(p => onChainData[p.id]?.status === 4) && (
          <div className="mb-6 space-y-2">
            {reviewableProjects.filter(p => onChainData[p.id]?.status === 4).map(p => {
              const ocId = p.onChainId ?? 0;
              const ch = challengeMap[ocId];
              if (!ch) return null;
              const countdown = formatCountdown(ch.deadline, now);
              return (
                <div key={p.id} className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-orange-500 text-lg">⚠️</span>
                    <div>
                      <p className="text-sm font-semibold text-orange-800">{p.input.projectName}</p>
                      <p className="text-xs text-orange-500">
                        {ch.fraudVotes} โหวตโกง &nbsp;·&nbsp; {ch.validVotes} โหวตโอเค &nbsp;·&nbsp; ปิดรับโหวต {formatDeadline(ch.deadline)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {countdown ? (
                      <>
                        <p className="text-xs text-orange-400">เหลือเวลา</p>
                        <p className="text-sm font-bold text-orange-600 font-mono">{countdown}</p>
                      </>
                    ) : (
                      <p className="text-sm font-bold text-gray-400">หมดเวลาแล้ว — รอ Finalize</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Reviewer Registration Panel */}
        {wallet && (
          <div className={`mb-6 rounded-xl border p-4 shadow-sm ${isRegistered ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200"}`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {isRegistered ? "✅ Registered Reviewer" : "🔐 Reviewer Registration"}
                </p>
                {isRegistered ? (
                  <>
                    <p className="text-xs text-gray-500 mt-0.5">
                      เงินมัดจำ: {reviewerProfile?.stakedAmount} TCUT &nbsp;•&nbsp; คะแนนความน่าเชื่อถือ: {reviewerProfile?.reputation}
                    </p>
                    <p className="text-xs text-blue-400 mt-1">
                      เงินมัดจำนี้จะถูกหักเล็กน้อยถ้า Challenge ไม่สำเร็จ — และได้รางวัลพร้อมคะแนนเพิ่มถ้า Challenge แล้วถูก
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 mt-0.5">
                      วางเงินมัดจำ {reviewerBondAmt} TCUT เพื่อได้สิทธิ์ Challenge และ Vote โปรเจค
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      เงินประกันความซื่อสัตย์ — แสดงว่าคุณรับผิดชอบต่อผลการตรวจสอบ
                    </p>
                  </>
                )}
              </div>
              {!isRegistered && (
                <button
                  disabled={!!actionKey}
                  onClick={() => void runAction("register", () => handleRegisterReviewer())}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors"
                >
                  {actionKey === "register" ? "Registering..." : `Register — Bond ${reviewerBondAmt} TCUT`}
                </button>
              )}
            </div>
          </div>
        )}

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
            const onChainId = project.onChainId ?? (onChain?.id && onChain.id > 0 ? onChain.id : undefined);
            const isReady = !!onChainId;
            const ocId = onChainId ?? 0;
            const challenge = challengeMap[ocId];
            const hasVoted = hasVotedMap[ocId] ?? false;
            const isMinted = onChain?.status === 3;
            const isChallenged = onChain?.status === 4;
            const isSlashed = onChain?.status === 5;
            const totalVotes = challenge ? challenge.fraudVotes + challenge.validVotes : 0;

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
                      ? <span className={`text-xs px-2 py-1 rounded-full font-medium ${isSlashed ? "bg-red-100 text-red-700" : isChallenged ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700"}`}>{PROJECT_STATUS[onChain.status]}</span>
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

                        {/* Comment + approve/reject buttons — hidden after Minted */}
                        {!isMinted && !isChallenged && !isSlashed && (
                          <>
                            <div className="mt-4">
                              <label className="text-xs font-medium text-gray-600">Comment (optional)</label>
                              <textarea className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-16 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                                value={comment} onChange={(e) => setComment(e.target.value)}
                                placeholder="ระบุเหตุผลหรือข้อสังเกต..." />
                            </div>
                            <div className="flex gap-2 mt-3">
                              <button
                                disabled={!!actionKey || !wallet || !isReady || !canApproveOnChain}
                                onClick={() => void runAction(`${project.id}:approve`, () => approveOnChain(project, ocId!))}
                                className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 transition-colors">
                                {actionKey === `${project.id}:approve` ? "Approving..." : "✅ Approve On-Chain"}
                              </button>
                              <button
                                disabled={!!actionKey || !wallet || !isReady}
                                onClick={() => void runAction(`${project.id}:reject`, () => rejectOnChain(project, ocId!, 5000))}
                                className="flex-1 bg-red-50 text-red-600 border border-red-200 py-2 rounded-lg text-sm font-semibold hover:bg-red-100 disabled:opacity-40 transition-colors">
                                {actionKey === `${project.id}:reject` ? "Rejecting..." : "❌ Reject On-Chain"}
                              </button>
                            </div>
                            {!wallet && (
                              <p className="text-xs text-gray-400 mt-2">Connect wallet to approve on-chain</p>
                            )}
                            {onChain?.status === 0 && (
                              <p className="text-xs text-gray-400 mt-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                                ℹ️ Reject ที่ status Pending ไม่มี slash — เพราะ Developer ยังไม่ได้วาง Stake ไว้ ไม่มีอะไรให้หัก
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* ── Challenge Section ── */}
                    {isReady && onChain && (isMinted || isChallenged) && (
                      <div className="mt-5 pt-5 border-t border-gray-100">
                        <div className="flex items-center gap-2 mb-3">
                          <h4 className="text-sm font-semibold text-gray-700">⚠️ Challenge Mechanism</h4>
                          <span className="text-xs bg-yellow-100 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full font-medium">🧪 Demo — ระบบจริงใช้ Optimistic + 30 วัน</span>
                        </div>

                        {/* Slashed */}
                        {isSlashed && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                            🔴 โครงการนี้ถูก Slash แล้ว — stake ทั้งหมดถูกโอนให้ challenger และ challenge ถูกยืนยันว่าเป็นจริง
                          </div>
                        )}

                        {/* Minted — can open challenge */}
                        {isMinted && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <p className="text-xs text-amber-700 mb-3">
                              พบข้อมูลไม่สอดคล้อง หรือสงสัยว่าโครงการรายงานข้อมูลเกินจริง? เปิด Challenge เพื่อให้ Reviewer ลงคะแนน
                            </p>
                            {isRegistered ? (
                              <button
                                disabled={!!actionKey}
                                onClick={() => void runAction(`${ocId}:challenge`, () => handleOpenChallenge(ocId))}
                                className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-40 transition-colors"
                              >
                                {actionKey === `${ocId}:challenge` ? "Opening..." : "⚠️ Open Challenge"}
                              </button>
                            ) : (
                              <p className="text-xs text-amber-600">ต้อง Register เป็น Reviewer ก่อนจึงจะ Challenge ได้</p>
                            )}
                          </div>
                        )}

                        {/* Challenged — votes + vote buttons + demo resolve */}
                        {isChallenged && challenge && (
                          <div className="space-y-3">
                            {/* Vote summary */}
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-semibold text-orange-700">🗳️ ผลการลงคะแนน</span>
                                <span className="text-xs font-mono text-gray-500">{totalVotes}/3 คะแนน</span>
                              </div>
                              <div className="flex gap-3">
                                <div className="flex-1 bg-red-100 rounded-lg p-3 text-center">
                                  <p className="text-2xl font-bold text-red-600">{challenge.fraudVotes}</p>
                                  <p className="text-xs text-red-600 mt-1">✂️ เห็นควร Slash</p>
                                </div>
                                <div className="flex-1 bg-green-100 rounded-lg p-3 text-center">
                                  <p className="text-2xl font-bold text-green-600">{challenge.validVotes}</p>
                                  <p className="text-xs text-green-600 mt-1">✅ ไม่เห็นควร Slash</p>
                                </div>
                              </div>
                              <p className="text-xs text-gray-400 mt-2">ระบบจะตัดสินอัตโนมัติเมื่อครบ 3 คะแนน</p>
                            </div>

                            {/* Vote buttons — anyone except seller */}
                            {!challenge.finalized && wallet && onChain.seller.toLowerCase() !== wallet.account.toLowerCase() && !hasVoted && (
                              <div className="flex gap-2">
                                <button
                                  disabled={!!actionKey}
                                  onClick={() => void runAction(`${ocId}:vote:fraud`, () => handleVote(ocId, true))}
                                  className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-semibold hover:bg-red-600 disabled:opacity-40 transition-colors"
                                >
                                  {actionKey === `${ocId}:vote:fraud` ? "Voting..." : "✂️ เห็นควร Slash"}
                                </button>
                                <button
                                  disabled={!!actionKey}
                                  onClick={() => void runAction(`${ocId}:vote:valid`, () => handleVote(ocId, false))}
                                  className="flex-1 bg-green-500 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-600 disabled:opacity-40 transition-colors"
                                >
                                  {actionKey === `${ocId}:vote:valid` ? "Voting..." : "✅ ไม่เห็นควร Slash"}
                                </button>
                              </div>
                            )}
                            {hasVoted && (
                              <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">✔ คุณได้ลงคะแนนแล้ว</p>
                            )}
                            {wallet && onChain.seller.toLowerCase() === wallet.account.toLowerCase() && (
                              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">⛔ เจ้าของโครงการไม่สามารถลงคะแนนได้</p>
                            )}

                            {/* Demo resolve */}
                            {!challenge.finalized && (
                              <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4 space-y-3">
                                <p className="text-xs font-semibold text-yellow-800">🧪 Demo — ตัดสินใจทันที (ไม่ต้องรอครบ 3 คะแนน)</p>
                                <p className="text-xs text-yellow-900 leading-5">
                                  มี 2 ผลลัพธ์เท่านั้น: ถ้า challenge ถูกต้อง ระบบจะ slash stake ของโครงการทั้งหมดให้ challenger แต่ถ้า challenge ไม่สำเร็จ โครงการจะกลับไป Minted และ challenger จะถูกหัก bond เล็กน้อยพร้อมลดคะแนนความน่าเชื่อถือ
                                </p>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <button
                                    disabled={!!actionKey}
                                    onClick={() => {
                                      setDemoOutcomeMap(prev => ({ ...prev, [ocId]: "upheld" }));
                                      void runAction(`${ocId}:demo-upheld`, () => handleDemoResolve(ocId, "upheld"));
                                    }}
                                    className="bg-red-500 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-red-600 disabled:opacity-40 transition-colors"
                                  >
                                    {actionKey === `${ocId}:demo-upheld` ? "Resolving..." : "✂️ Challenge Upheld — Slash Project"}
                                  </button>
                                  <button
                                    disabled={!!actionKey}
                                    onClick={() => {
                                      setDemoOutcomeMap(prev => ({ ...prev, [ocId]: "rejected" }));
                                      void runAction(`${ocId}:demo-rejected`, () => handleDemoResolve(ocId, "rejected"));
                                    }}
                                    className="bg-emerald-500 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-600 disabled:opacity-40 transition-colors"
                                  >
                                    {actionKey === `${ocId}:demo-rejected` ? "Resolving..." : "✅ Challenge Rejected — Return to Minted"}
                                  </button>
                                </div>
                                {demoOutcomeMap[ocId] && (
                                  <p className="text-[11px] text-yellow-800">
                                    เลือกผลลัพธ์ล่าสุด: {demoOutcomeMap[ocId] === "upheld"
                                      ? "Challenge ถูกยืนยัน — slash โครงการ 100% และให้รางวัล challenger"
                                      : "Challenge ไม่สำเร็จ — project กลับ Minted และ challenger ถูก penalize เล็กน้อย"}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

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
