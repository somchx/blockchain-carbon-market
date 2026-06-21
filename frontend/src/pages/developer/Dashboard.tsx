import { formatUnits, parseEther } from "ethers";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EvidenceUpload from "../../components/EvidenceUpload";
import WalletBar from "../../components/WalletBar";
import { getConnectedWallet, getContractConfig, getContracts, type WalletState } from "../../lib/web3";
import { loadProjectMap, saveProjectMap, type OnChainProjectMap } from "../../lib/storage";
import type { StoredProject, ProjectForm, ProjectType, OnChainProject } from "../../types";
import { PROJECT_STATUS } from "../../types";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";
const config = getContractConfig();

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

const recommendationStyle = {
  approve: "bg-green-100 text-green-800",
  review: "bg-yellow-100 text-yellow-800",
  reject: "bg-red-100 text-red-800",
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
  const [projectMap, setProjectMap] = useState<OnChainProjectMap>(() => loadProjectMap());
  const [onChainData, setOnChainData] = useState<Record<string, OnChainProject>>({});
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [txMsg, setTxMsg] = useState("");
  const [cardMsg, setCardMsg] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"submit" | "projects">("submit");
  const [mintPriceMap, setMintPriceMap] = useState<Record<string, string>>({});
  const [pageLoading, setPageLoading] = useState(true);

  async function loadProjects() {
    const res = await fetch(`${apiBase}/projects`);
    if (res.ok) setProjects(await res.json());
  }

  async function refreshWallet() {
    const w = await getConnectedWallet();
    setWallet(w);
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
  }, []);

  useEffect(() => {
    if (!wallet) return;
    for (const [localId, onChainId] of Object.entries(projectMap)) {
      void refreshOnChain(localId, onChainId);
    }
  }, [wallet, projectMap]);

  async function assessProject(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/projects/assess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Assessment failed");
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
    setTxMsg(`✅ Submitted on-chain as Project #${onChainId}`);
    await refreshOnChain(project.id, onChainId);
  }

  async function approveStake(project: StoredProject) {
    if (!wallet) throw new Error("Connect wallet first");
    const { utilityToken } = await getContracts(wallet.provider);
    const tx = await utilityToken.approve(config.marketAddress, parseEther(String(project.assessment.requiredStake)));
    await tx.wait();
    const msg = `✅ Approve สำเร็จ! ตอนนี้กด "2b. Deposit Stake" ได้เลย`;
    setTxMsg(msg);
    setCardMsg(prev => ({ ...prev, [project.id]: msg }));
  }

  async function depositStake(project: StoredProject) {
    if (!wallet) throw new Error("Connect wallet first");
    const onChainId = projectMap[project.id];
    if (!onChainId) throw new Error("Submit on-chain first");
    const { market } = await getContracts(wallet.provider);
    const tx = await market.depositProjectStake(onChainId, parseEther(String(project.assessment.requiredStake)));
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
      <WalletBar role="developer" />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">🌱 Developer Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">ส่งโครงการลดคาร์บอน วาง Stake และติดตามสถานะ</p>
        </div>

        {pageLoading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        )}

        {txMsg && (
          <div className={`mb-4 p-3 rounded-lg text-sm border ${txMsg.startsWith("✅") || txMsg.startsWith("🌱") ? "bg-emerald-50 border-emerald-200 text-emerald-800" : txMsg.startsWith("❌") ? "bg-red-50 border-red-200 text-red-700" : "bg-blue-50 border-blue-200 text-blue-700"}`}>{txMsg}</div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-200 rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab("submit")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "submit" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            📋 Submit Project
          </button>
          <button
            onClick={() => setTab("projects")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "projects" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            📁 My Projects {projects.length > 0 && <span className="ml-1 bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0.5 rounded-full">{projects.length}</span>}
          </button>
        </div>

        {/* Submit Tab */}
        {!pageLoading && tab === "submit" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">ข้อมูลโครงการ</h2>
              <form onSubmit={assessProject} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-medium text-gray-600">ชื่อผู้พัฒนา</span>
                    <input className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      value={form.sellerName} onChange={(e) => setForm({ ...form, sellerName: e.target.value })} required />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-gray-600">ชื่อโครงการ</span>
                    <input className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} required />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-medium text-gray-600">จังหวัด</span>
                    <select className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })}>
                      {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-gray-600">ประเภทโครงการ</span>
                    <select className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      value={form.projectType} onChange={(e) => setForm({ ...form, projectType: e.target.value as ProjectType })}>
                      <option value="forest">🌳 Forest</option>
                      <option value="mangrove">🌿 Mangrove</option>
                      <option value="solar">☀️ Solar</option>
                      <option value="biogas">⚡ Biogas</option>
                    </select>
                  </label>
                </div>
                {/* Optional custom coordinates */}
                <details className="group">
                  <summary className="cursor-pointer text-xs text-blue-600 hover:text-blue-800 font-medium select-none list-none flex items-center gap-1">
                    <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                    ระบุพิกัด GPS พื้นที่โครงการจริง (optional — ถ้าไม่กรอก ใช้พิกัดตัวเมืองจังหวัด)
                  </summary>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs font-medium text-gray-600">Latitude</span>
                      <input type="number" step="0.0001" placeholder="เช่น 18.7904"
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        value={form.lat ?? ""} onChange={(e) => setForm({ ...form, lat: e.target.value ? Number(e.target.value) : undefined })} />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-gray-600">Longitude</span>
                      <input type="number" step="0.0001" placeholder="เช่น 98.9853"
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        value={form.lon ?? ""} onChange={(e) => setForm({ ...form, lon: e.target.value ? Number(e.target.value) : undefined })} />
                    </label>
                  </div>
                </details>
                <div className="grid grid-cols-3 gap-3">
                  <label className="block">
                    <span className="text-xs font-medium text-gray-600">พื้นที่ (ไร่)</span>
                    <input type="number" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      value={form.landAreaRai} onChange={(e) => setForm({ ...form, landAreaRai: Number(e.target.value) })} min={1} />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-gray-600">Credits ที่ขอ</span>
                    <input type="number" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      value={form.requestedCredits} onChange={(e) => setForm({ ...form, requestedCredits: Number(e.target.value) })} min={1} />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-gray-600">ปี Vintage</span>
                    <input type="number" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      value={form.vintageYear} onChange={(e) => setForm({ ...form, vintageYear: Number(e.target.value) })} min={2020} />
                  </label>
                </div>
                <label className="block">
                  <span className="text-xs font-medium text-gray-600">การลดคาร์บอน (ตัน CO₂) ที่รายงานเอง</span>
                  <input type="number" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    value={form.selfReportedReduction} onChange={(e) => setForm({ ...form, selfReportedReduction: Number(e.target.value) })} min={1} />
                </label>
                {tgoExceeded && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    ⚠️ Credits ที่ขอ ({form.requestedCredits}) เกินขีดจำกัด TGO: พื้นที่ {form.landAreaRai} ไร่ absorb ได้สูงสุด <strong>{tgoMaxCredits} tCO₂/ปี</strong> ({TGO_MAX_RATE[form.projectType]} tCO₂/ไร่/ปี) — ระบบจะปรับลดอัตโนมัติ
                  </p>
                )}
                <button type="submit" disabled={submitting}
                  className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                  {submitting ? "Assessing..." : "🔍 Assess Risk & Submit"}
                </button>
              </form>
            </div>

            {/* Info panel */}
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                <h3 className="font-semibold text-emerald-800 mb-2">📊 ขั้นตอนการส่งโครงการ</h3>
                <ol className="space-y-2 text-sm text-emerald-700">
                  {["กรอกข้อมูลโครงการ → ระบบคำนวณ Risk Score", "ดู Assessment Result + Required Stake", "Submit on-chain (MetaMask)", "Approve + Deposit Stake", "รอ Verifier ตรวจสอบและอนุมัติ", "Token ถูก Mint → ขึ้น Marketplace อัตโนมัติ"].map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <h3 className="font-semibold text-amber-800 mb-2">⚠️ กลไก Staking</h3>
                <p className="text-sm text-amber-700 leading-relaxed">
                  ยิ่ง Risk Score สูง → ต้อง Stake มากขึ้น<br />
                  ถ้าข้อมูลจริง → ได้ Stake คืน + Reward<br />
                  ถ้าข้อมูลปลอม → โดน <strong>Slash</strong> (ยึด Stake ทั้งหมด)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Projects Tab */}
        {!pageLoading && tab === "projects" && (
          <div className="space-y-4">
            {projects.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-lg font-medium">ยังไม่มีโครงการ</p>
                <p className="text-sm">กลับไปที่ Submit Project เพื่อเริ่มต้น</p>
              </div>
            )}
            {projects.map((project) => {
              const onChainId = projectMap[project.id];
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
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${recommendationStyle[project.assessment.recommendation]}`}>
                        {project.assessment.recommendation.toUpperCase()}
                      </span>
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

                  {/* Evidence Upload */}
                  <div className="border border-gray-100 rounded-xl p-4 mb-2">
                    <EvidenceUpload
                      projectId={project.id}
                      projectName={project.input.projectName}
                    />
                  </div>

                  {/* Status-aware actions */}
                  <div className="border-t border-gray-100 pt-4">
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
                    {onChainId && onChain && onChain.status === 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                          <span className="text-lg">⏳</span>
                          <div>
                            <p className="text-sm font-semibold text-amber-700">Waiting for Verifier</p>
                            <p className="text-xs text-amber-600">On-chain #{onChainId} — รอ Verifier ตรวจสอบและ Approve</p>
                          </div>
                        </div>
                        <div className="flex gap-2 opacity-40 pointer-events-none">
                          <button disabled className="flex-1 text-xs bg-blue-600 text-white py-2 rounded-lg">Approve Stake (รอ Verifier ก่อน)</button>
                          <button disabled className="flex-1 text-xs bg-emerald-600 text-white py-2 rounded-lg">Deposit Stake</button>
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
                        <div className="flex gap-2">
                          <button
                            disabled={!!actionKey || !wallet}
                            onClick={() => void runAction(`${project.id}:approveStake`, () => approveStake(project), project.id)}
                            className="flex-1 text-xs bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-40 font-semibold transition-colors"
                          >
                            {actionKey === `${project.id}:approveStake` ? "⏳ Approving..." : "2a. Approve Token"}
                          </button>
                          <button
                            disabled={!!actionKey || !wallet}
                            onClick={() => void runAction(`${project.id}:stake`, () => depositStake(project), project.id)}
                            className="flex-1 text-xs bg-emerald-600 text-white py-2.5 rounded-lg hover:bg-emerald-700 disabled:opacity-40 font-semibold transition-colors"
                          >
                            {actionKey === `${project.id}:stake` ? "⏳ Staking..." : "2b. Deposit Stake →"}
                          </button>
                        </div>
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
                              {onChain.approvedCredits} credits พร้อม Mint — ตั้งราคาและ Mint ขึ้น Marketplace
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 items-center">
                          <div className="flex-1">
                            <label className="text-xs text-gray-500 block mb-1">ราคาต่อ 1 Credit (TCUT)</label>
                            <input
                              type="number"
                              min="1"
                              placeholder="100"
                              value={mintPriceMap[project.id] ?? "100"}
                              onChange={e => setMintPriceMap(p => ({ ...p, [project.id]: e.target.value }))}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            />
                          </div>
                          <button
                            disabled={!!actionKey || !wallet}
                            onClick={() => void runAction(`${project.id}:mint`, () => mintAndList(project, mintPriceMap[project.id] ?? "100"))}
                            className="flex-shrink-0 bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 transition-colors mt-4"
                          >
                            {actionKey === `${project.id}:mint` ? "Minting..." : "🌱 Mint & List"}
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
            })}
          </div>
        )}
      </div>
    </div>
  );
}
