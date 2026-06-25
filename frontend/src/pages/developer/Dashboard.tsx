import { formatUnits, parseEther } from "ethers";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EvidenceUpload from "../../components/EvidenceUpload";
import WalletBar from "../../components/WalletBar";
import { getConnectedWallet, getContracts, readWalletBalances, type WalletState } from "../../lib/web3";
import { loadProjectMap, saveProjectMap, type OnChainProjectMap } from "../../lib/storage";
import type { StoredProject, ProjectForm, ProjectType, OnChainProject } from "../../types";
import { PROJECT_STATUS } from "../../types";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

const initialForm: ProjectForm = {
  sellerName: "",
  projectName: "",
  province: "ChiangMai",
  lat: undefined,
  lon: undefined,
  landAreaRai: 100,
  projectType: "forest",
  requestedCredits: 500,
  selfReportedReduction: 450,
  vintageYear: 2026,
};

const provinces = [
  // ภาคเหนือ
  "ChiangMai", "ChiangRai", "Lamphun", "Lampang", "Phrae", "Nan", "Phayao",
  "MaeHongSon", "Tak", "Sukhothai", "Uttaradit", "Phitsanulok", "Phichit",
  "Phetchabun", "KamphaengPhet",
  // ภาคกลาง
  "Bangkok", "Nonthaburi", "PathumThani", "SamutPrakan", "SamutSakhon",
  "SamutSongkhram", "NakhonPathom", "SuphanBuri", "SingBuri", "AngThong",
  "LopBuri", "Saraburi", "NakhonNayok", "PrachinBuri", "SaKaeo", "Ayutthaya",
  "ChaiNat", "NakhonSawan", "UthaithThani", "Kanchanaburi", "Ratchaburi",
  "Phetchaburi", "PrachuapKhiriKhan",
  // ภาคตะวันออก
  "Chonburi", "Rayong", "Chanthaburi", "Trat", "Chachoengsao",
  // ภาคตะวันออกเฉียงเหนือ
  "KhonKaen", "UdonThani", "NongKhai", "Loei", "NongBuaLamphu", "SakonNakhon",
  "NakhonPhanom", "Mukdahan", "Kalasin", "RoiEt", "Yasothon", "AmnatCharoen",
  "UbonRatchathani", "SiSaKet", "Surin", "Buriram", "NakhonRatchasima",
  "Chaiyaphum", "MahaSarakham", "BuengKan",
  // ภาคใต้
  "SuratThani", "Phuket", "NakhonSiThammarat", "Krabi", "PhangNga", "Ranong",
  "Chumphon", "Songkhla", "Satun", "Trang", "Phatthalung", "Pattani", "Yala",
  "Narathiwat",
];

function shorten(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

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

const RISK_LEVEL: Record<string, { label: string; style: string; icon: string; range: string; meaning: string }> = {
  approve: {
    label: "Low Risk",
    style: "bg-green-100 text-green-800 border border-green-200",
    icon: "🟢",
    range: "Risk Score < 45",
    meaning: "ข้อมูลน่าเชื่อถือ — NASA + ดาวเทียมยืนยันตรงกับที่รายงาน ผ่านเกณฑ์อนุมัติได้",
  },
  review: {
    label: "Med Risk",
    style: "bg-yellow-100 text-yellow-800 border border-yellow-200",
    icon: "🟡",
    range: "Risk Score 45–69",
    meaning: "มีความไม่สอดคล้องบางส่วน — Verifier ควรตรวจ evidence เพิ่มก่อนตัดสินใจ",
  },
  reject: {
    label: "High Risk",
    style: "bg-red-100 text-red-800 border border-red-200",
    icon: "🔴",
    range: "Risk Score ≥ 70 หรือ credits < 35% ของที่ขอ",
    meaning: "ข้อมูลไม่ผ่านเกณฑ์ — ดาวเทียม/NASA ขัดแย้งกับที่รายงาน หรือ credits ที่คำนวณได้ต่ำเกินไป",
  },
};

const statusStyle: Record<number, string> = {
  0: "bg-gray-100 text-gray-600",
  1: "bg-yellow-100 text-yellow-700",
  2: "bg-blue-100 text-blue-700",
  3: "bg-emerald-100 text-emerald-700",
  4: "bg-orange-100 text-orange-700",
  5: "bg-red-100 text-red-700",
  6: "bg-gray-100 text-gray-500",
};

const TGO_MAX_RATE: Record<string, number> = { forest: 3.5, mangrove: 6.0, solar: 8.0, biogas: 5.0 };

export default function DeveloperDashboard() {
  const [form, setForm] = useState<ProjectForm>(initialForm);
  const tgoMaxCredits = Math.floor(form.landAreaRai * (TGO_MAX_RATE[form.projectType] ?? 3.5));
  const tgoExceeded = form.requestedCredits > tgoMaxCredits;
  const [projects, setProjects] = useState<StoredProject[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const requestedGap = Math.max(0, form.requestedCredits - tgoMaxCredits);
  const [projectMap, setProjectMap] = useState<OnChainProjectMap>(() => loadProjectMap());
  const [onChainData, setOnChainData] = useState<Record<string, OnChainProject>>({});
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [txMsg, setTxMsg] = useState("");
  const [cardMsg, setCardMsg] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"submit" | "projects">("submit");
  const [pageLoading, setPageLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [tcutBalance, setTcutBalance] = useState<string | null>(null);

  function getResolvedOnChainId(project: StoredProject): number | undefined {
    return projectMap[project.id] ?? project.onChainId;
  }

  function getDisplayedProjects(): StoredProject[] {
    if (demoMode) return projects;
    const myAddr = wallet?.account?.toLowerCase();
    if (!myAddr) return [];
    const myIds = getMyProjectIds();
    return projects.filter((project) =>
      project.creatorAddress?.toLowerCase() === myAddr ||
      myIds.has(project.id) ||
      onChainData[project.id]?.seller?.toLowerCase() === myAddr
    );
  }

  async function loadProjects() {
    const res = await fetch(`${apiBase}/projects`);
    if (!res.ok) return;
    const nextProjects: StoredProject[] = await res.json();
    setProjects(nextProjects);
    setProjectMap((prev) => {
      const merged = { ...prev };
      let changed = false;
      for (const project of nextProjects) {
        if (project.onChainId != null && merged[project.id] !== project.onChainId) {
          merged[project.id] = project.onChainId;
          changed = true;
        }
      }
      if (changed) {
        saveProjectMap(merged);
        return merged;
      }
      return prev;
    });
  }

  async function refreshWallet() {
    const w = await getConnectedWallet();
    setWallet(w);
    if (w) {
      try {
        const b = await readWalletBalances(w.provider, w.account);
        setTcutBalance(b.tokenBalance);
      } catch {
        setTcutBalance(null);
      }
    }
  }

  async function refreshOnChain(localId: string, onChainId: number) {
    if (!wallet) return;
    try {
      const { market } = await getContracts(wallet.provider);
      const raw = await market.projects(onChainId);
      setOnChainData((prev) => ({ ...prev, [localId]: mapOnChainProject(raw) }));
    } catch {}
  }

  useEffect(() => {
    Promise.all([loadProjects(), refreshWallet()]).finally(() => setPageLoading(false));
    if (!window.ethereum?.on) return;
    const handler = () => void refreshWallet();
    window.ethereum.on("accountsChanged", handler);
    window.ethereum.on("chainChanged", handler);
    return () => {
      window.ethereum?.removeListener?.("accountsChanged", handler);
      window.ethereum?.removeListener?.("chainChanged", handler);
    };
  }, []);

  useEffect(() => {
    if (!wallet) return;
    for (const [localId, onChainId] of Object.entries(projectMap)) {
      void refreshOnChain(localId, onChainId);
    }
  }, [wallet, projectMap]);

  function getMyProjectIds(): Set<string> {
    const addr = wallet?.account?.toLowerCase() ?? "anon";
    try { return new Set(JSON.parse(localStorage.getItem(`myProjectIds_${addr}`) ?? "[]")); }
    catch { return new Set(); }
  }

  async function saveMyProjectId(id: string) {
    let addr = wallet?.account?.toLowerCase();
    if (!addr) {
      try {
        const accs: string[] = await (window as any).ethereum?.request({ method: "eth_accounts" });
        addr = accs?.[0]?.toLowerCase();
      } catch { /* ignore */ }
    }
    const key = `myProjectIds_${addr ?? "anon"}`;
    try {
      const ids: string[] = JSON.parse(localStorage.getItem(key) ?? "[]");
      if (!ids.includes(id)) ids.push(id);
      localStorage.setItem(key, JSON.stringify(ids));
    } catch { /* ignore */ }
  }

  async function assessProject(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/projects/assess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          creatorAddress: wallet?.account?.toLowerCase(),
        }),
      });
      if (!res.ok) throw new Error("Assessment failed");
      const created = await res.json();
      await saveMyProjectId(created.id);
      await loadProjects();
      setTab("projects");
      setTxMsg("Risk assessment complete! Review below then submit on-chain.");
    } finally {
      setSubmitting(false);
    }
  }

  async function runAction(key: string, task: () => Promise<void>, projectId?: string) {
    setActionKey(key);
    const pending = "⏳ กรุณาตรวจสอบ MetaMask popup และกด Confirm...";
    setTxMsg(pending);
    if (projectId) setCardMsg(prev => ({ ...prev, [projectId]: pending }));
    try {
      await task();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Transaction failed";
      const clean = msg.includes("user rejected") || msg.includes("User denied")
        ? "❌ ยกเลิกใน MetaMask"
        : `❌ ${msg.slice(0, 200)}`;
      setTxMsg(clean);
      if (projectId) setCardMsg(prev => ({ ...prev, [projectId]: clean }));
    } finally {
      setActionKey(null);
      await refreshWallet();
    }
  }

  async function submitOnChain(project: StoredProject) {
    if (!wallet) throw new Error("Connect wallet first");
    const { market } = await getContracts(wallet.provider);
    const tx = await market.submitProject(
      `ipfs://thai-carbon-market/${project.id}`,
      project.assessment.sourceHash,
      project.input.requestedCredits,
      project.input.vintageYear,
    );
    const receipt = await tx.wait();
    const event = receipt.logs.map((log: { topics: readonly string[]; data: string }) => {
      try { return market.interface.parseLog(log); } catch { return null; }
    }).find((p: { name: string } | null) => p?.name === "ProjectSubmitted");
    if (!event) throw new Error("ProjectSubmitted event not found");
    const onChainId = Number(event.args.projectId);
    const next = { ...projectMap, [project.id]: onChainId };
    setProjectMap(next);
    saveProjectMap(next);
    await fetch(`${apiBase}/projects/${project.id}/on-chain`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onChainId }),
    });
    setTxMsg(`✅ Submitted on-chain as Project #${onChainId}`);
    await refreshOnChain(project.id, onChainId);
  }

  async function depositStake(project: StoredProject) {
    if (!wallet) throw new Error("Connect wallet first");
    const onChainId = projectMap[project.id];
    if (!onChainId) throw new Error("Submit on-chain first");
    const stakeWei = parseEther(String(project.assessment.requiredStake));
    const { market, utilityToken } = await getContracts(wallet.provider);
    const marketAddr = await market.getAddress();
    const allowance = await utilityToken.allowance(wallet.account, marketAddr);
    if (allowance < stakeWei) {
      const appTx = await utilityToken.approve(marketAddr, stakeWei);
      await appTx.wait();
    }
    const tx = await market.depositProjectStake(onChainId, stakeWei);
    await tx.wait();
    const msg = `✅ Stake สำเร็จ! Project #${onChainId} พร้อม Mint แล้ว`;
    setTxMsg(msg);
    setCardMsg(prev => ({ ...prev, [project.id]: msg }));
    await refreshOnChain(project.id, onChainId);
  }

  async function mintAndList(project: StoredProject, priceStr: string) {
    if (!wallet) throw new Error("Connect wallet first");
    const onChainId = projectMap[project.id];
    if (!onChainId) throw new Error("Submit on-chain first");
    const price = parseFloat(priceStr);
    if (!price || price <= 0) throw new Error("ใส่ราคาต่อ Credit ที่ถูกต้อง");
    const { market } = await getContracts(wallet.provider);
    const tokenUri = `ipfs://thai-carbon-market/${project.id}/metadata.json`;
    const tx = await market.mintAndListCredits(onChainId, parseEther(String(price)), tokenUri);
    await tx.wait();
    const onChain = onChainData[project.id];
    setTxMsg(`🌱 Minted ${onChain?.approvedCredits ?? ""} Carbon Credits @ ${price} TCUT each — ขึ้น Marketplace แล้ว!`);
    await refreshOnChain(project.id, onChainId);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <WalletBar role="developer" hideBalance />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-2 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              🌱 Developer Dashboard
              {tcutBalance && (
                <span className="text-sm font-normal text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  {tcutBalance}
                </span>
              )}
            </h1>
            <p className="text-gray-500 text-sm mt-1">ส่งโครงการลดคาร์บอน วาง Stake และติดตามสถานะ</p>
          </div>
          <button
            onClick={() => setDemoMode(m => !m)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              demoMode
                ? "bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200"
                : "bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <span className={`w-7 h-4 rounded-full relative transition-colors ${demoMode ? "bg-yellow-400" : "bg-gray-300"}`}>
              <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${demoMode ? "left-3.5" : "left-0.5"}`} />
            </span>
            {demoMode ? "🧪 Demo" : "👤 My Projects"}
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setTab("submit")}
            className={`px-5 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              tab === "submit"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            📋 Submit Project
          </button>
          <button
            onClick={() => setTab("projects")}
            className={`px-5 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              tab === "projects"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            📁 Project List{(() => {
              const myAddr = wallet?.account?.toLowerCase();
              const myIds = getMyProjectIds();
              const count = demoMode
                ? projects.length
                : projects.filter((p) =>
                    p.creatorAddress?.toLowerCase() === myAddr ||
                    myIds.has(p.id) ||
                    (myAddr && onChainData[p.id]?.seller?.toLowerCase() === myAddr)
                  ).length;
              return count > 0 ? ` (${count})` : "";
            })()}
          </button>
        </div>

        {pageLoading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        )}

        {txMsg && (
          <div className={`mb-4 p-3 rounded-lg text-sm border ${txMsg.startsWith("✅") || txMsg.startsWith("🌱") ? "bg-emerald-50 border-emerald-200 text-emerald-800" : txMsg.startsWith("❌") ? "bg-red-50 border-red-200 text-red-700" : "bg-blue-50 border-blue-200 text-blue-700"}`}>{txMsg}</div>
        )}

        {/* Submit Tab */}
        {tab === "submit" && (
          <div className="grid gap-6 md:grid-cols-[1fr_300px]">
            {/* Left: Form */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-5">ข้อมูลโครงการ</h2>
              <form onSubmit={assessProject} className="space-y-5">

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อผู้พัฒนา</label>
                    <input
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="เช่น สมชาย รักษ์โลก"
                      value={form.sellerName}
                      onChange={(e) => setForm({ ...form, sellerName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อโครงการ</label>
                    <input
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="เช่น ป่าชุมชนดอยสุเทพ"
                      value={form.projectName}
                      onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">จังหวัด</label>
                    <select
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      value={form.province}
                      onChange={(e) => setForm({ ...form, province: e.target.value })}
                    >
                      {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทโครงการ</label>
                    <select
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      value={form.projectType}
                      onChange={(e) => setForm({ ...form, projectType: e.target.value as ProjectType })}
                    >
                      <option value="forest">🌳 Forest (3.5 tCO2/ไร่/ปี)</option>
                      <option value="mangrove">🌿 Mangrove (6.0 tCO2/ไร่/ปี)</option>
                      <option value="solar">☀️ Solar (8.0 tCO2/ไร่/ปี)</option>
                      <option value="biogas">⚡ Biogas (5.0 tCO2/ไร่/ปี)</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-400">อัตราอ้างอิงจาก Thailand Greenhouse Gas Management Organization (TGO)</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">พื้นที่ (ไร่)</label>
                    <input
                      type="number" min={1}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      value={form.landAreaRai}
                      onChange={(e) => setForm({ ...form, landAreaRai: Number(e.target.value) })}
                    />
                    <p className="mt-1 text-xs text-gray-400">ใช้คำนวณเพดานเครดิตตามอัตราอ้างอิงของประเภทโครงการ</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Credits ที่ขอ</label>
                    <input
                      type="number" min={1}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      value={form.requestedCredits}
                      onChange={(e) => setForm({ ...form, requestedCredits: Number(e.target.value) })}
                    />
                    <p className="mt-1 text-xs text-gray-400">จำนวนเครดิตที่ต้องการขอรับก่อนระบบปรับลดตามความเสี่ยงและขนาดพื้นที่</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ปี Vintage</label>
                    <input
                      type="number" min={2020}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      value={form.vintageYear}
                      onChange={(e) => setForm({ ...form, vintageYear: Number(e.target.value) })}
                    />
                    <p className="mt-1 text-xs text-gray-400">ปีที่คาร์บอนเครดิตชุดนี้อ้างอิงการลดหรือกักเก็บคาร์บอน</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">การลดคาร์บอน (ตัน CO₂) ที่รายงานเอง</label>
                  <input
                    type="number" min={1}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={form.selfReportedReduction}
                    onChange={(e) => setForm({ ...form, selfReportedReduction: Number(e.target.value) })}
                  />
                  <p className="mt-1 text-xs text-gray-400">ระบบจะนำไปเทียบกับ climate signals และใช้คำนวณ approved credits เบื้องต้น</p>
                </div>

                <details className="rounded-lg border border-dashed border-gray-200 px-4 py-3">
                  <summary className="cursor-pointer text-sm text-gray-500 list-none flex items-center justify-between">
                    <span>พิกัด GPS <span className="text-xs text-gray-400">(Optional)</span></span>
                    <span className="text-gray-400">›</span>
                  </summary>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                      <input
                        type="number" step="0.0001" placeholder="เช่น 18.7883"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        value={form.lat ?? ""}
                        onChange={(e) => setForm({ ...form, lat: e.target.value ? Number(e.target.value) : undefined })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                      <input
                        type="number" step="0.0001" placeholder="เช่น 98.9853"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        value={form.lon ?? ""}
                        onChange={(e) => setForm({ ...form, lon: e.target.value ? Number(e.target.value) : undefined })}
                      />
                    </div>
                  </div>
                </details>

                {tgoExceeded && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    <span className="font-medium">เกินเพดานอ้างอิง {requestedGap} tCO2</span>
                    {" "}— เพดานสำหรับโครงการนี้คือ <strong>{tgoMaxCredits} tCO2/ปี</strong> ({TGO_MAX_RATE[form.projectType]} tCO2/ไร่/ปี)
                  </div>
                )}

                <div className="flex items-center justify-end pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? "กำลังประเมิน..." : "Assess Risk →"}
                  </button>
                </div>

              </form>
            </div>

            {/* Right: Info panels */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">ขั้นตอนการส่งโครงการ</h3>
                <ol className="space-y-3">
                  {[
                    { n: "1", label: "กรอกข้อมูลโครงการ", desc: "ชื่อ พื้นที่ ประเภท credits ที่ขอ" },
                    { n: "2", label: "Assess Risk", desc: "ระบบดึง satellite + NASA + OWM ประเมิน risk score" },
                    { n: "3", label: "Submit On-Chain", desc: "บันทึกข้อมูลลง smart contract บน Sepolia" },
                    { n: "4", label: "รอ Verifier", desc: "Verifier ตรวจสอบและ approve credits" },
                    { n: "5", label: "Deposit Stake", desc: "วาง TCUT เพื่อค้ำประกันความน่าเชื่อถือ" },
                    { n: "6", label: "Mint & List", desc: "สร้าง Carbon Credits ขึ้น Marketplace" },
                  ].map((s) => (
                    <li key={s.n} className="flex gap-3 items-start">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">{s.n}</span>
                      <div>
                        <p className="text-xs font-semibold text-gray-700">{s.label}</p>
                        <p className="text-xs text-gray-400">{s.desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-blue-800 mb-2">📍 ทำไมต้องระบุพิกัด GPS?</h3>
                <p className="text-xs text-blue-700 leading-5">
                  การระบุ Latitude / Longitude มีผลโดยตรงต่อ <strong>Confidence Score</strong> และ <strong>Risk Score</strong> ของโครงการ เพราะระบบจะใช้พิกัดนี้ดึงข้อมูลจากแหล่งภายนอก 3 แหล่ง:
                </p>
                <ul className="mt-2.5 space-y-2">
                  <li className="flex gap-2 items-start text-xs text-blue-700">
                    <span className="shrink-0">🛰️</span>
                    <span><strong>ภาพถ่ายดาวเทียม</strong> — NASA MODIS ตรวจสอบประเภทพืชพรรณ (NDVI) และการใช้ที่ดินจริงว่าตรงกับที่ระบุหรือไม่</span>
                  </li>
                  <li className="flex gap-2 items-start text-xs text-blue-700">
                    <span className="shrink-0">🌡️</span>
                    <span><strong>ข้อมูลภูมิอากาศย้อนหลัง</strong> — NASA POWER API ให้ค่าแสงอาทิตย์และปริมาณฝนเฉลี่ยของพื้นที่</span>
                  </li>
                  <li className="flex gap-2 items-start text-xs text-blue-700">
                    <span className="shrink-0">🌤️</span>
                    <span><strong>สภาพอากาศ ณ วันที่ยื่น</strong> — OpenWeatherMap ดึงอุณหภูมิ ความชื้น และเมฆปกคลุมแบบ real-time</span>
                  </li>
                </ul>
                <p className="mt-2.5 text-xs text-blue-600 leading-5">
                  หากไม่ระบุพิกัด ระบบจะใช้ค่าตำแหน่งกลางของจังหวัดแทน ซึ่งอาจทำให้ผลการประเมินคลาดเคลื่อนได้
                </p>
              </div>
            </div>
          </div>
        )}

        {/* My Projects Tab */}
        {!pageLoading && tab === "projects" && (
          <div className="space-y-4">
            {demoMode ? (
              <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-700">
                🧪 <span><strong>Demo mode</strong> — แสดงทุกโปรเจคที่ถูกสร้างไว้ในระบบ ไม่ใช่เฉพาะของคุณ</span>
              </div>
            ) : !wallet ? (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                🔌 Connect wallet เพื่อดูโปรเจคของคุณ
              </div>
            ) : null}
            {(() => {
              const displayed = getDisplayedProjects();
              if (displayed.length === 0) return (
                <div className="text-center py-16 text-gray-400">
                  <p className="text-4xl mb-3">📋</p>
                  <p className="text-lg font-medium">{demoMode ? "ยังไม่มีโครงการ" : "ไม่พบโปรเจคของคุณ"}</p>
                  <p className="text-sm">{demoMode ? "ไปที่แท็บ \"Submit Project\" เพื่อเริ่มต้น" : "ลอง Submit โปรเจคแรกของคุณ หรือเปิด Demo mode เพื่อดูทั้งหมด"}</p>
                </div>
              );
              return displayed.map((project) => {
              const onChainId = getResolvedOnChainId(project);
              const onChain = onChainData[project.id];
              return (
                <div key={project.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-medium">
                        {project.input.projectType} • {project.input.province}
                      </p>
                      <h3 className="text-lg font-bold text-gray-900">{project.input.projectName}</h3>
                      <p className="text-sm text-gray-500">{project.input.sellerName}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {(() => {
                        const rl = RISK_LEVEL[project.assessment.recommendation];
                        return (
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${rl.style}`}>
                              {rl.icon} {rl.label}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">{rl.range}</span>
                          </div>
                        );
                      })()}
                      {onChain && (
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusStyle[onChain.status]}`}>
                          {PROJECT_STATUS[onChain.status]}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: "Approved Credits", value: project.assessment.approvedCredits },
                      { label: "Required Stake", value: `${project.assessment.requiredStake} TCUT` },
                      { label: "Risk Score", value: project.assessment.riskScore },
                      { label: "Trust Score", value: project.assessment.trustScore },
                    ].map((m) => (
                      <div key={m.label} className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-400">{m.label}</p>
                        <p className="font-bold text-gray-900">{m.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Risk level explanation */}
                  {(() => {
                    const rl = RISK_LEVEL[project.assessment.recommendation];
                    const rs = project.assessment.riskScore;
                    const sig = project.assessment.signals;
                    const blend = Math.round(
                      sig.iotConfidence * 0.3 + sig.governmentConfidence * 0.3 +
                      sig.historicalConfidence * 0.25 + sig.userInputConfidence * 0.15
                    );
                    const drivers: string[] = [];
                    if (sig.iotConfidence < 50) drivers.push(`NDVI ต่ำ (${sig.iotConfidence}) — พืชพรรณในพื้นที่ไม่สอดคล้อง`);
                    if (sig.governmentConfidence < 50) drivers.push(`Land Cover ต่ำ (${sig.governmentConfidence}) — ดาวเทียมเห็นประเภทที่ดินต่างจากที่ claim`);
                    if (sig.historicalConfidence < 50) drivers.push(`NASA ต่ำ (${sig.historicalConfidence}) — สภาพอากาศ/แสงไม่เหมาะกับโครงการประเภทนี้`);
                    if (sig.anomalyScore > 30) drivers.push(`Anomaly สูง (${sig.anomalyScore}) — ตัวเลขที่รายงานเองผิดปกติเมื่อเทียบกับ signal`);
                    return (
                      <div className={`mb-4 rounded-xl p-3.5 text-xs border ${
                        project.assessment.recommendation === "approve" ? "bg-green-50 border-green-200" :
                        project.assessment.recommendation === "review"  ? "bg-yellow-50 border-yellow-200" :
                        "bg-red-50 border-red-200"
                      }`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 mb-0.5">{rl.icon} {rl.label} — Risk Score {rs}/100</p>
                            <p className="text-gray-600 leading-5">{rl.meaning}</p>
                            {drivers.length > 0 && (
                              <div className="mt-2 space-y-0.5">
                                <p className="font-medium text-gray-700">ปัจจัยที่กดคะแนน:</p>
                                {drivers.map(d => <p key={d} className="text-gray-500">• {d}</p>)}
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-gray-400">Blend</p>
                            <p className="font-bold text-gray-800 text-base">{blend}</p>
                            <p className="text-gray-400 mt-1">Risk</p>
                            <p className="font-bold text-gray-800 text-base">{rs}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Signals */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {Object.entries(project.assessment.signals).map(([k, v]) => {
                      const SOURCE_BADGE: Record<string, { label: string; color: string }> = {
                        nasa_solarIrradiance: { label: "NASA", color: "text-blue-500" },
                        nasa_precipitation:   { label: "NASA", color: "text-blue-500" },
                        weather_temperature:  { label: "OWM",  color: "text-sky-500" },
                        weather_humidity:     { label: "OWM",  color: "text-sky-500" },
                        weather_cloudCover:   { label: "OWM",  color: "text-sky-500" },
                        ndvi:                { label: "🛰️",   color: "text-emerald-600" },
                        landCoverType:       { label: "🛰️",   color: "text-emerald-600" },
                        iotConfidence:       { label: "🛰️ NDVI", color: "text-emerald-600" },
                        governmentConfidence:{ label: "🛰️ LC", color: "text-emerald-600" },
                        historicalConfidence:{ label: "NASA",  color: "text-blue-500" },
                        userInputConfidence: { label: "input", color: "text-gray-400" },
                        anomalyScore:        { label: "input", color: "text-gray-400" },
                        additionalityScore:  { label: "calc",  color: "text-purple-400" },
                        dataSource:          { label: "",      color: "" },
                      };
                      const badge = SOURCE_BADGE[k];
                      return (
                        <div key={k} className="flex justify-between items-center text-xs bg-gray-50 rounded px-2 py-1 gap-1">
                          <span className="text-gray-500 capitalize truncate">{k.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {badge?.label && <span className={`text-[9px] font-bold ${badge.color}`}>{badge.label}</span>}
                            <span className="font-semibold text-gray-700">{String(v)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* How it's calculated — collapsible */}
                  <details className="mb-4 group">
                    <summary className="cursor-pointer text-xs text-blue-600 hover:text-blue-800 font-medium select-none list-none flex items-center gap-1">
                      <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                      ดูวิธีคำนวณ Risk Score และ Approved Credits
                    </summary>
                    <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs space-y-3 text-gray-700">
                      <div>
                        <p className="font-bold text-gray-900 mb-2">📡 แหล่งข้อมูลแต่ละ Signal</p>
                        <div className="space-y-1.5">
                          {[
                            { badge: "🛰️ NDVI", color: "bg-emerald-100 text-emerald-700", label: "iotConfidence", desc: "NASA MODIS ถ่ายภาพดาวเทียม 250m ทุก 16 วัน — วัดความเขียวพืช (NDVI) ที่ lat/lon จังหวัดจริง" },
                            { badge: "🛰️ LC",   color: "bg-emerald-100 text-emerald-700", label: "governmentConfidence", desc: "MODIS Land Cover — ดาวเทียมบอกว่าพื้นที่นั้นเป็น forest/urban/cropland จริงไหม ถ้า claim forest แต่ดาวเทียมเห็น urban → ค่าต่ำ" },
                            { badge: "NASA",   color: "bg-blue-100 text-blue-700",    label: "historicalConfidence", desc: "NASA POWER API — ข้อมูลแสงอาทิตย์ (W/m²) และปริมาณฝน (mm/day) เฉลี่ยปี 2023 ที่พิกัดจังหวัด" },
                            { badge: "OWM",    color: "bg-sky-100 text-sky-700",      label: "weather_*", desc: "OpenWeatherMap — อุณหภูมิ, ความชื้น, เมฆปกคลุม ณ วันที่ submit จริง" },
                            { badge: "input",  color: "bg-gray-100 text-gray-600",    label: "userInputConfidence / anomalyScore", desc: "คำนวณจากตัวเลขที่กรอก — ถ้า requestedCredits กับ selfReportedReduction ห่างกันมาก anomaly สูง" },
                          ].map(row => (
                            <div key={row.label} className="flex gap-2 items-start">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${row.color}`}>{row.badge}</span>
                              <div><span className="font-semibold text-gray-800">{row.label}</span> — {row.desc}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-blue-200 pt-3">
                        <p className="font-bold text-gray-900 mb-1.5">🔢 สูตร Risk Score</p>
                        <div className="font-mono bg-white rounded p-2 text-[10px] leading-5 text-gray-700">
                          <p>blend = iot×30% + government×30% + historical×25% + userInput×15%</p>
                          <p>riskScore = 100 − blend + (anomaly × 0.45) − (additionality × 0.2)</p>
                          <p className="text-gray-400 mt-1">ยิ่ง confidence ต่ำ + anomaly สูง → risk สูง</p>
                        </div>
                      </div>

                      <div className="border-t border-blue-200 pt-3">
                        <p className="font-bold text-gray-900 mb-1.5">🌿 สูตร Approved Credits</p>
                        <div className="font-mono bg-white rounded p-2 text-[10px] leading-5 text-gray-700">
                          <p>reduction = selfReported × (blend/100) × ((100−risk)/100)</p>
                          <p>approvedCredits = min(requested, reduction)</p>
                          <p className="text-gray-400 mt-1">risk สูง = ได้ credits น้อยลง, ต้อง stake มากขึ้น</p>
                        </div>
                      </div>

                      <div className="border-t border-blue-200 pt-3">
                        <p className="font-bold text-gray-900 mb-1.5">🔒 สูตร Required Stake</p>
                        <div className="font-mono bg-white rounded p-2 text-[10px] leading-5 text-gray-700">
                          <p>multiplier = 0.4 + (riskScore/100) × 1.8</p>
                          <p>requiredStake = max(100, approvedCredits × multiplier) TCUT</p>
                          <p className="text-gray-400 mt-1">risk 60 → multiplier 1.48 → stake สูงขึ้น</p>
                        </div>
                      </div>
                    </div>
                  </details>

                  {/* On-chain info */}
                  {onChain && (
                    <div className="bg-slate-50 rounded-lg p-3 mb-4 text-xs text-gray-600 space-y-1">
                      <p>🔗 On-chain ID: <strong>#{onChain.id}</strong> | Seller: <code>{shorten(onChain.seller)}</code></p>
                      <p>Stake: <strong>{onChain.stakedAmountFormatted}</strong> / {onChain.requiredStakeFormatted} TCUT | Credits left: <strong>{onChain.availableCredits}</strong></p>
                    </div>
                  )}

                  {/* Evidence Upload — ซ่อนระหว่างรอ Verifier; read-only เมื่อ Minted หรือ Slashed */}
                  {!(onChainId && onChain?.status === 0) && (
                    <div className="border border-gray-100 rounded-xl p-4 mb-2">
                      <EvidenceUpload
                        projectId={project.id}
                        projectName={project.input.projectName}
                        readOnly={onChain?.status === 3 || onChain?.status === 5}
                      />
                    </div>
                  )}

                  {/* Status-aware actions */}
                  <div className="border-t border-gray-100 pt-4">
                    {/* Stale — localStorage has entry but contract shows zero seller (old contract) */}
                    {onChainId && onChain?.seller === "0x0000000000000000000000000000000000000000" && (
                      <div className="space-y-2 mb-3">
                        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                          ⚠️ ข้อมูล on-chain เก่าค้างอยู่ (contract ถูก redeploy) — กด Re-submit เพื่อ submit ใหม่กับ contract ปัจจุบัน
                        </div>
                        <button
                          disabled={!!actionKey || !wallet}
                          onClick={() => {
                            const next = { ...projectMap };
                            delete next[project.id];
                            setProjectMap(next);
                            saveProjectMap(next);
                            setOnChainData(prev => { const n = { ...prev }; delete n[project.id]; return n; });
                            void runAction(`${project.id}:submit`, () => submitOnChain(project), project.id);
                          }}
                          className="w-full text-sm bg-red-600 text-white py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-40 font-semibold transition-colors"
                        >
                          {actionKey === `${project.id}:submit` ? "⏳ Re-submitting..." : "🔄 Re-submit On-Chain"}
                        </button>
                      </div>
                    )}
                    {/* Step 1 — not submitted yet */}
                    {!onChainId && (
                      <div className="space-y-2">
                        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-500">
                          📝 Step 1: Submit project on-chain to start the verification process
                        </div>
                        {!wallet ? (
                          <div className="w-full text-sm bg-amber-50 border border-amber-200 text-amber-700 py-2.5 px-4 rounded-lg text-center font-medium">
                            🔌 Connect MetaMask ก่อน (กดปุ่ม Connect ด้านบน)
                          </div>
                        ) : (
                          <>
                            <button
                              disabled={!!actionKey}
                              onClick={() => void runAction(`${project.id}:submit`, () => submitOnChain(project), project.id)}
                              className="w-full text-sm bg-gray-800 text-white py-2.5 rounded-lg hover:bg-gray-900 disabled:opacity-40 font-semibold transition-colors"
                            >
                              {actionKey === `${project.id}:submit` ? "⏳ Submitting..." : "📝 Submit On-Chain"}
                            </button>
                            {cardMsg[project.id] && (
                              <p className={`text-xs mt-1 px-1 ${cardMsg[project.id].startsWith("✅") ? "text-emerald-700" : cardMsg[project.id].startsWith("❌") ? "text-red-600" : "text-blue-600"}`}>
                                {cardMsg[project.id]}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Step 2 — submitted, awaiting verifier */}
                    {onChainId && onChain && onChain.status === 0 && onChain.seller !== "0x0000000000000000000000000000000000000000" && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                          <span className="text-lg">⏳</span>
                          <div>
                            <p className="text-sm font-semibold text-amber-700">Waiting for Verifier</p>
                            <p className="text-xs text-amber-600">On-chain #{onChainId} — รอ Verifier ตรวจสอบและ Approve</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 3 — assessed (verifier approved), need to stake */}
                    {onChainId && onChain && onChain.status === 1 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
                          <span className="text-lg">✅</span>
                          <div>
                            <p className="text-sm font-semibold text-green-700">Verifier Approved!</p>
                            <p className="text-xs text-green-600">
                              Approved {onChain.approvedCredits} credits — ต้อง Stake {Number(onChain.requiredStakeFormatted).toLocaleString()} TCUT เพื่อดำเนินการต่อ
                            </p>
                          </div>
                        </div>
                        <button
                          disabled={!!actionKey || !wallet}
                          onClick={() => void runAction(`${project.id}:stake`, () => depositStake(project), project.id)}
                          className="w-full text-sm bg-emerald-600 text-white py-2.5 rounded-lg hover:bg-emerald-700 disabled:opacity-40 font-semibold transition-colors"
                        >
                          {actionKey === `${project.id}:stake` ? "⏳ กำลัง Stake..." : "🔒 Deposit Stake →"}
                        </button>
                        {cardMsg[project.id] && (
                          <p className={`text-xs mt-1 px-1 ${cardMsg[project.id].startsWith("✅") ? "text-emerald-700" : cardMsg[project.id].startsWith("❌") ? "text-red-600" : "text-blue-600"}`}>
                            {cardMsg[project.id]}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Step 4 — staked, ready to mint */}
                    {onChainId && onChain && onChain.status === 2 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
                          <span className="text-lg">🔒</span>
                          <div>
                            <p className="text-sm font-semibold text-blue-700">Stake Complete — Ready to Mint!</p>
                            <p className="text-xs text-blue-600">
                              {onChain.approvedCredits} credits พร้อม Mint — ราคา 100 TCUT ต่อ Credit
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button
                            disabled={!!actionKey || !wallet}
                            onClick={() => void runAction(`${project.id}:mint`, () => mintAndList(project, "100"))}
                            className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                          >
                            {actionKey === `${project.id}:mint` ? "Minting..." : "🌱 Mint"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Minted — live on marketplace */}
                    {onChainId && onChain && onChain.status === 3 && (
                      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-emerald-700">🌱 Live on Marketplace!</p>
                          <p className="text-xs text-emerald-600">
                            {onChain.availableCredits} credits @ {Number(onChain.pricePerCreditFormatted).toLocaleString()} TCUT each
                          </p>
                        </div>
                        <Link
                          to="/buyer"
                          className="text-xs bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
                        >
                          View Marketplace →
                        </Link>
                      </div>
                    )}

                    {/* Challenged */}
                    {onChainId && onChain && onChain.status === 4 && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
                        <p className="text-sm font-semibold text-orange-700">⚠️ Under Challenge</p>
                        <p className="text-xs text-orange-600">โครงการถูก Challenge — รอผลการโหวต</p>
                      </div>
                    )}

                    {/* Slashed */}
                    {onChainId && onChain && onChain.status === 5 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                        <p className="text-sm font-semibold text-red-700">❌ Slashed</p>
                        <p className="text-xs text-red-600">Stake ถูกยึด — โครงการถูกพิจารณาว่ามีการทุจริต</p>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-gray-300 mt-2 font-mono">Hash: {project.assessment.sourceHash.slice(0, 32)}...</p>
                </div>
              );
            });
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
