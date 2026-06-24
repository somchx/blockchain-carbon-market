import { Contract, formatUnits, Interface, JsonRpcProvider } from "ethers";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import WalletBar from "../../components/WalletBar";
import { carbonMarketAbi } from "../../lib/contracts";
import { loadProjectMap } from "../../lib/storage";
import { getContractConfig } from "../../lib/web3";
import type { EvidenceFile, OnChainProject, StoredProject } from "../../types";
import { PROJECT_STATUS } from "../../types";

const config = getContractConfig();
const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";
const PAGE_SIZE = 8;

type ColorKey = "blue" | "green" | "purple" | "emerald" | "amber" | "orange" | "red" | "yellow" | "gray";

type TraceEvent = {
  name: string;
  label: string;
  icon: string;
  colorKey: ColorKey;
  blockNumber: number;
  txHash: string;
  timestamp: number | null;
  details: { key: string; value: string }[];
};

type ExplorerRow = {
  backendProject: StoredProject;
  onChainProject: OnChainProject | null;
};

type ExplorerDetail = {
  onChainProject: OnChainProject | null;
  backendProject: StoredProject;
  evidence: EvidenceFile[];
  events: TraceEvent[];
};

const COLOR_CLASSES: Record<ColorKey, { bg: string; border: string; text: string; dot: string }> = {
  blue:    { bg: "bg-blue-50",    border: "border-blue-300",    text: "text-blue-700",    dot: "bg-blue-400" },
  green:   { bg: "bg-green-50",   border: "border-green-300",   text: "text-green-700",   dot: "bg-green-400" },
  purple:  { bg: "bg-purple-50",  border: "border-purple-300",  text: "text-purple-700",  dot: "bg-purple-400" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-700", dot: "bg-emerald-400" },
  amber:   { bg: "bg-amber-50",   border: "border-amber-300",   text: "text-amber-700",   dot: "bg-amber-400" },
  orange:  { bg: "bg-orange-50",  border: "border-orange-300",  text: "text-orange-700",  dot: "bg-orange-400" },
  red:     { bg: "bg-red-50",     border: "border-red-300",     text: "text-red-700",     dot: "bg-red-400" },
  yellow:  { bg: "bg-yellow-50",  border: "border-yellow-300",  text: "text-yellow-700",  dot: "bg-yellow-400" },
  gray:    { bg: "bg-gray-50",    border: "border-gray-300",    text: "text-gray-700",    dot: "bg-gray-400" },
};

const EVENT_META: Record<string, { label: string; icon: string; color: ColorKey }> = {
  ProjectSubmitted:   { label: "Project Submitted",        icon: "📝", color: "blue" },
  ProjectAssessed:    { label: "Verifier Approved",        icon: "✅", color: "green" },
  StakeDeposited:     { label: "Stake Deposited",          icon: "🔒", color: "purple" },
  CreditsMinted:      { label: "Credits Minted & Listed",  icon: "🌱", color: "emerald" },
  CreditsPurchased:   { label: "Credits Purchased",        icon: "🛒", color: "amber" },
  ChallengeOpened:    { label: "Challenge Opened",         icon: "⚠️", color: "orange" },
  ChallengeFinalized: { label: "Challenge Finalized",      icon: "⚖️", color: "red" },
  RewardIssued:       { label: "Reward Issued",            icon: "🏆", color: "yellow" },
  CreditsRetired:     { label: "Credits Retired (Offset)", icon: "🔥", color: "gray" },
};

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function tcut(raw: bigint) {
  return `${Number(formatUnits(raw, 18)).toLocaleString()} TCUT`;
}

function parseDetails(name: string, args: readonly unknown[]): { key: string; value: string }[] {
  switch (name) {
    case "ProjectSubmitted":
      return [
        { key: "Seller", value: shortAddr(args[1] as string) },
        { key: "Requested Credits", value: `${Number(args[2] as bigint)} credits` },
      ];
    case "ProjectAssessed":
      return [
        { key: "Approved Credits", value: `${Number(args[1] as bigint)} credits` },
        { key: "Risk Score", value: String(Number(args[2] as bigint)) },
        { key: "Required Stake", value: tcut(args[3] as bigint) },
      ];
    case "StakeDeposited":
      return [
        { key: "Depositor", value: shortAddr(args[1] as string) },
        { key: "Amount", value: tcut(args[2] as bigint) },
      ];
    case "CreditsMinted":
      return [
        { key: "Credits Minted", value: `${Number(args[1] as bigint)} credits` },
        { key: "Price/Credit", value: tcut(args[2] as bigint) },
      ];
    case "CreditsPurchased":
      return [
        { key: "Buyer", value: shortAddr(args[1] as string) },
        { key: "Amount", value: `${Number(args[2] as bigint)} credits` },
        { key: "Total Cost", value: tcut(args[3] as bigint) },
      ];
    case "ChallengeOpened":
      return [
        { key: "Challenger", value: shortAddr(args[1] as string) },
        { key: "Deadline", value: new Date(Number(args[2] as bigint) * 1000).toLocaleString("th-TH") },
      ];
    case "ChallengeFinalized":
      return [
        { key: "Fraud Confirmed", value: args[1] ? "YES ⚠️" : "NO ✅" },
        { key: "Slashed Amount", value: tcut(args[2] as bigint) },
      ];
    case "RewardIssued":
      return [
        { key: "Reward Amount", value: tcut(args[1] as bigint) },
        { key: "Updated Trust Score", value: String(Number(args[2] as bigint)) },
      ];
    case "CreditsRetired":
      return [
        { key: "Retiree", value: shortAddr(args[1] as string) },
        { key: "Amount", value: `${Number(args[2] as bigint)} credits offset` },
        { key: "NFT Cert #", value: String(Number(args[3] as bigint)) },
      ];
    default:
      return [];
  }
}

function mapOnChainProject(raw: {
  id: bigint;
  seller: string;
  requestedCredits: bigint;
  approvedCredits: bigint;
  riskScore: bigint;
  trustScore: bigint;
  requiredStake: bigint;
  stakedAmount: bigint;
  availableCredits: bigint;
  pricePerCredit: bigint;
  status: number;
}): OnChainProject {
  return {
    id: Number(raw.id),
    seller: raw.seller,
    requestedCredits: Number(raw.requestedCredits),
    approvedCredits: Number(raw.approvedCredits),
    riskScore: Number(raw.riskScore),
    trustScore: Number(raw.trustScore),
    requiredStakeFormatted: formatUnits(raw.requiredStake, 18),
    stakedAmountFormatted: formatUnits(raw.stakedAmount, 18),
    availableCredits: Number(raw.availableCredits),
    pricePerCreditFormatted: formatUnits(raw.pricePerCredit, 18),
    status: Number(raw.status),
  };
}

function statusPill(status: number) {
  if (status >= 5) return "bg-red-100 text-red-700";
  if (status >= 3) return "bg-emerald-100 text-emerald-700";
  if (status >= 1) return "bg-blue-100 text-blue-700";
  return "bg-gray-100 text-gray-500";
}

function getRowStatusLabel(row: ExplorerRow) {
  if (row.onChainProject) {
    return PROJECT_STATUS[row.onChainProject.status] ?? "Unknown";
  }
  return "Pending";
}

function getRowStatusClass(row: ExplorerRow) {
  if (row.onChainProject) {
    return statusPill(row.onChainProject.status);
  }
  return "bg-gray-100 text-gray-500";
}

function matchRow(row: ExplorerRow, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    String(row.onChainProject?.id ?? ""),
    row.onChainProject?.seller.toLowerCase() ?? "",
    getRowStatusLabel(row),
    row.backendProject.input.projectName,
    row.backendProject.input.province,
    row.backendProject.input.projectType,
  ].some((value) => value.toLowerCase().includes(q));
}

export default function TraceabilityExplorer() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [rows, setRows] = useState<ExplorerRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detail, setDetail] = useState<ExplorerDetail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  async function loadRows() {
    setLoading(true);
    setError("");
    try {
      const rpcUrl = import.meta.env.VITE_CHAIN_RPC_URL ?? "https://sepolia.gateway.tenderly.co";
      const provider = new JsonRpcProvider(rpcUrl);
      if (!config.marketAddress) throw new Error("VITE_MARKET_ADDRESS not configured");
      const market = new Contract(config.marketAddress, carbonMarketAbi, provider);

      const apiRes = await fetch(`${apiBase}/projects`);
      if (!apiRes.ok) throw new Error("Failed to load backend projects");
      const backendProjects: StoredProject[] = await apiRes.json();

      const nextRows: ExplorerRow[] = await Promise.all(
        backendProjects.map(async (project) => {
          let onChainProject: OnChainProject | null = null;

          if (project.onChainId) {
            try {
              const raw = await market.projects(BigInt(project.onChainId));
              if (Number(raw.id) > 0) {
                onChainProject = mapOnChainProject(raw);
              }
            } catch {
              onChainProject = null;
            }
          }

          return {
            backendProject: project,
            onChainProject,
          };
        })
      );

      nextRows.sort((a, b) => {
        const aSort = a.onChainProject?.id ?? 0;
        const bSort = b.onChainProject?.id ?? 0;
        if (bSort !== aSort) return bSort - aSort;
        return b.backendProject.createdAt.localeCompare(a.backendProject.createdAt);
      });
      setRows(nextRows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load explorer data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRows();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [query]);

  async function openProjectDetail(row: ExplorerRow) {
    setShowDetailModal(true);
    setDetailLoading(true);
    setDetailError("");
    setDetail(null);

    try {
      let events: TraceEvent[] = [];
      const backendProject = row.backendProject;
      let evidence: EvidenceFile[] = [];

      if (row.onChainProject) {
        const pid = row.onChainProject.id;
        const rpcUrl = import.meta.env.VITE_CHAIN_RPC_URL ?? "https://sepolia.gateway.tenderly.co";
        const provider = new JsonRpcProvider(rpcUrl);
        if (!config.marketAddress) throw new Error("VITE_MARKET_ADDRESS not configured");
        const pidBig = BigInt(pid);
        const latestBlock = await provider.getBlockNumber();
        const chunkSize = 49_999;
        const lookback = 200_000;
        const fromBlock = Math.max(0, latestBlock - lookback);
        const iface = new Interface(carbonMarketAbi as unknown as string[]);

        const rawLogs: Awaited<ReturnType<typeof provider.getLogs>> = [];
        for (let start = fromBlock; start <= latestBlock; start += chunkSize) {
          const end = Math.min(start + chunkSize - 1, latestBlock);
          try {
            const chunk = await provider.getLogs({ address: config.marketAddress, fromBlock: start, toBlock: end });
            rawLogs.push(...chunk);
          } catch {
            // skip chunk
          }
        }

        const allLogs: Array<{ blockNumber: number; transactionHash: string; fragment: { name?: string }; args: unknown[] }> = [];
        for (const log of rawLogs) {
          try {
            const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
            if (!parsed) continue;
            if (BigInt(parsed.args[0]) !== pidBig) continue;
            allLogs.push({
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash,
              fragment: parsed.fragment,
              args: Array.from(parsed.args as Iterable<unknown>),
            });
          } catch {
            // skip
          }
        }

        allLogs.sort((a, b) => a.blockNumber - b.blockNumber);
        const uniqueBlocks = [...new Set(allLogs.map((log) => log.blockNumber))];
        const blockData = await Promise.all(uniqueBlocks.map((blockNumber) => provider.getBlock(blockNumber)));
        const tsMap: Record<number, number> = {};
        uniqueBlocks.forEach((blockNumber, index) => {
          if (blockData[index]) tsMap[blockNumber] = blockData[index]!.timestamp;
        });

        events = allLogs.map((log) => {
          const name = log.fragment?.name ?? "Unknown";
          const meta = EVENT_META[name] ?? { label: name, icon: "📋", color: "gray" as ColorKey };
          return {
            name,
            label: meta.label,
            icon: meta.icon,
            colorKey: meta.color,
            blockNumber: log.blockNumber,
            txHash: log.transactionHash,
            timestamp: tsMap[log.blockNumber] ?? null,
            details: parseDetails(name, log.args),
          };
        });
      }

      if (backendProject.id) {
        const evRes = await fetch(`${apiBase}/projects/${backendProject.id}/evidence`);
        if (evRes.ok) evidence = await evRes.json();
      }

      setDetail({
        onChainProject: row.onChainProject,
        backendProject,
        evidence,
        events,
      });
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "Failed to load project detail");
    } finally {
      setDetailLoading(false);
    }
  }

  const filteredRows = rows.filter((row) => matchRow(row, query));
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const explorerBase = config.explorerBaseUrl;

  return (
    <div className="min-h-screen bg-gray-50">
      <WalletBar role="buyer" />

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-2 flex items-center gap-2">
          <Link to="/" className="text-gray-400 hover:text-gray-600 text-sm">← Home</Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-500">Traceability Explorer</span>
        </div>
        <div className="mb-1 flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900">🔍 Traceability Explorer</h1>
          <button
            type="button"
            aria-label="Information about Traceability Explorer"
            onClick={() => setShowInfoModal(true)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-sm text-blue-700 transition-colors hover:bg-blue-100"
          >
            i
          </button>
        </div>
        <p className="text-gray-500 text-sm mb-4">
          รายการโครงการบน chain สำหรับตรวจสอบย้อนหลัง พร้อมเปิดดูรายละเอียด lifecycle, tx hash และหลักฐาน IPFS
        </p>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">ค้นหาในตาราง</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหา Project ID, ชื่อโครงการ, จังหวัด, ประเภท หรือสถานะ"
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="text-xs text-gray-400">
              ทั้งหมด <span className="font-semibold text-gray-600">{filteredRows.length}</span> โครงการ
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center text-gray-400">
            กำลังโหลดรายการโครงการ...
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center text-gray-400">
            <p className="text-3xl mb-2">📭</p>
            <p className="font-medium">ไม่พบโครงการที่ตรงกับคำค้นหา</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">On-chain ID</th>
                    <th className="px-4 py-3 text-left font-semibold">Project</th>
                    <th className="px-4 py-3 text-left font-semibold">Type / Province</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Approved</th>
                    <th className="px-4 py-3 text-left font-semibold">Price</th>
                    <th className="px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pagedRows.map((row) => (
                    <tr key={row.backendProject.id} className="hover:bg-gray-50/80">
                      <td className="px-4 py-3 font-mono text-gray-700">
                        {row.onChainProject ? `#${row.onChainProject.id}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800">
                          {row.backendProject.input.projectName}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {row.backendProject.input.sellerName}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <p className="capitalize">{row.backendProject.input.projectType}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{row.backendProject.input.province}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getRowStatusClass(row)}`}>
                          {getRowStatusLabel(row)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {row.onChainProject?.approvedCredits ?? row.backendProject.assessment.approvedCredits} credits
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {row.onChainProject && Number(row.onChainProject.pricePerCreditFormatted) > 0
                          ? `${Number(row.onChainProject.pricePerCreditFormatted).toLocaleString()} TCUT`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => void openProjectDetail(row)}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
                        >
                          ดูรายละเอียด
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-400">
                หน้า {safePage} / {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={safePage <= 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  ก่อนหน้า
                </button>
                <button
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  disabled={safePage >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {detail?.backendProject.input.projectName ?? (detail?.onChainProject ? `Project #${detail.onChainProject.id}` : "Project Detail")}
                </h2>
                <p className="mt-0.5 text-xs text-gray-400">Full traceability detail from blockchain and backend evidence</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDetailModal(false);
                  setDetail(null);
                  setDetailError("");
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[calc(90vh-72px)] overflow-y-auto px-5 py-5">
              {detailLoading && <div className="py-10 text-center text-gray-400">กำลังโหลดรายละเอียดโครงการ...</div>}

              {detailError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">
                  ⚠️ {detailError}
                </div>
              )}

              {!detailLoading && detail && (
                <>
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-bold text-gray-900">
                        {detail.onChainProject ? `Project #${detail.onChainProject.id}` : detail.backendProject.id}
                      </h3>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${detail.onChainProject ? statusPill(detail.onChainProject.status) : "bg-gray-100 text-gray-500"}`}>
                        {detail.onChainProject ? (PROJECT_STATUS[detail.onChainProject.status] ?? "Unknown") : "Pending"}
                      </span>
                    </div>

                    <div className="mb-3 pb-3 border-b border-gray-100">
                      <p className="font-semibold text-gray-800 text-sm">{detail.backendProject.input.projectName}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {detail.backendProject.input.sellerName} • {detail.backendProject.input.province} •{" "}
                        <span className="capitalize">{detail.backendProject.input.projectType}</span> •{" "}
                        {detail.backendProject.input.landAreaRai} ไร่ • Vintage {detail.backendProject.input.vintageYear}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                      {[
                        { label: "Seller", value: detail.onChainProject ? shortAddr(detail.onChainProject.seller) : (detail.backendProject.creatorAddress ? shortAddr(detail.backendProject.creatorAddress) : "—") },
                        { label: "Approved Credits", value: `${detail.onChainProject?.approvedCredits ?? detail.backendProject.assessment.approvedCredits}` },
                        { label: "Risk Score", value: `${detail.onChainProject?.riskScore ?? detail.backendProject.assessment.riskScore} / 100` },
                        { label: "Trust Score", value: `${detail.onChainProject?.trustScore ?? detail.backendProject.assessment.trustScore} / 100` },
                        { label: "Staked", value: detail.onChainProject ? `${Number(detail.onChainProject.stakedAmountFormatted).toLocaleString()} TCUT` : "—" },
                        { label: "Required Stake", value: detail.onChainProject ? `${Number(detail.onChainProject.requiredStakeFormatted).toLocaleString()} TCUT` : `${detail.backendProject.assessment.requiredStake.toLocaleString()} TCUT` },
                        { label: "Available", value: detail.onChainProject ? `${detail.onChainProject.availableCredits} credits` : "—" },
                        { label: "Price/Credit", value: detail.onChainProject ? `${Number(detail.onChainProject.pricePerCreditFormatted).toLocaleString()} TCUT` : "—" },
                      ].map((item) => (
                        <div key={item.label} className="bg-gray-50 rounded-xl p-2.5">
                          <p className="text-xs text-gray-400">{item.label}</p>
                          <p className="font-semibold text-gray-900 text-sm mt-0.5">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {detail.evidence.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        📎 หลักฐานบน IPFS
                        <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                          {detail.evidence.length} ไฟล์
                        </span>
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {detail.evidence.map((file) => (
                          <a
                            key={file.id}
                            href={file.ipfsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 text-xs text-emerald-700 hover:bg-emerald-100 transition-colors"
                          >
                            <span>{file.mimeType === "application/pdf" ? "📄" : "🖼️"}</span>
                            <div>
                              <p className="font-medium">{file.fileName}</p>
                              <p className="font-mono text-emerald-500">{file.ipfsCid.slice(0, 14)}...</p>
                            </div>
                            <span>↗</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {detail.events.length > 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                      <h3 className="text-sm font-semibold text-gray-700 mb-1">
                        ⛓️ Token Journey
                        <span className="ml-2 font-normal text-gray-400">{detail.events.length} events on-chain</span>
                      </h3>
                      <p className="text-xs text-gray-400 mb-5">เรียงตาม Block Number — เก่าสุดอยู่บน, ใหม่สุดอยู่ล่าง</p>

                      <div className="relative">
                        <div className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-gray-200" />
                        <div className="space-y-3">
                          {detail.events.map((event, index) => {
                            const cls = COLOR_CLASSES[event.colorKey];
                            return (
                              <div key={index} className="relative flex gap-3 pl-10">
                                <div className={`absolute left-2.5 top-3 w-3 h-3 rounded-full border-2 border-white shadow ${cls.dot}`} />
                                <div className={`flex-1 rounded-xl border p-3 ${cls.bg} ${cls.border}`}>
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-lg flex-shrink-0">{event.icon}</span>
                                      <div className="min-w-0">
                                        <p className={`text-sm font-bold ${cls.text}`}>{event.label}</p>
                                        {event.timestamp !== null && (
                                          <p className="text-xs text-gray-400 mt-0.5">
                                            {new Date(event.timestamp * 1000).toLocaleString("th-TH", {
                                              dateStyle: "medium",
                                              timeStyle: "short",
                                            })}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    <div className="text-right flex-shrink-0">
                                      <p className="text-xs text-gray-400">Block #{event.blockNumber}</p>
                                      {explorerBase ? (
                                        <a
                                          href={`${explorerBase}/tx/${event.txHash}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs font-mono text-blue-500 hover:underline"
                                        >
                                          {event.txHash.slice(0, 10)}...↗
                                        </a>
                                      ) : (
                                        <p className="text-xs font-mono text-gray-400" title={event.txHash}>
                                          {event.txHash.slice(0, 10)}...
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {event.details.length > 0 && (
                                    <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1">
                                      {event.details.map((item) => (
                                        <div key={item.key} className="text-xs">
                                          <span className="text-gray-400">{item.key}: </span>
                                          <span className="font-semibold text-gray-700">{item.value}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-9 bg-white rounded-2xl border border-gray-200 text-gray-400">
                      <p className="text-3xl mb-2">⏳</p>
                      <p className="font-medium">{detail.onChainProject ? "ยังไม่มี Events" : "โครงการนี้ยังไม่ขึ้น on-chain"}</p>
                      <p className="text-sm">
                        {detail.onChainProject
                          ? "Project ID ถูกต้องแต่ยังไม่มี Transaction บน Blockchain"
                          : "ตอนนี้มีข้อมูลผลประเมินในระบบแล้ว แต่ยังไม่มี transaction lifecycle บน blockchain"}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Traceability Explorer</h2>
                <p className="mt-0.5 text-xs text-gray-400">Audit and traceability view for carbon credit lifecycle</p>
              </div>
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div>
                <h3 className="mb-1.5 text-sm font-semibold text-gray-900">หน้านี้คืออะไร</h3>
                <p className="text-sm leading-6 text-gray-600">
                  นี่คือหน้า Traceability Explorer สำหรับตรวจสอบย้อนหลังเส้นทางของโครงการและคาร์บอนเครดิตบนบล็อกเชน
                  เหมาะกับผู้ตรวจสอบ, ผู้ซื้อ หรือผู้สังเกตการณ์ที่ต้องการดูว่าโครงการนี้ถูก submit,
                  approve, stake, mint, ซื้อขาย หรือ retire ไปแล้วจริงหรือไม่
                </p>
              </div>

              <div>
                <h3 className="mb-1.5 text-sm font-semibold text-gray-900">ใช้เพื่ออะไร</h3>
                <p className="text-sm leading-6 text-gray-600">
                  ใช้ยืนยันความโปร่งใสของระบบ, ตรวจสอบ tx hash และ event บน chain, เปิดดูหลักฐานจาก IPFS
                  และตามดู lifecycle ของเครดิตเพื่อช่วยลดความเสี่ยงเรื่องข้อมูลไม่ตรงหรือการนับเครดิตซ้ำ
                </p>
              </div>

              <div>
                <h3 className="mb-1.5 text-sm font-semibold text-gray-900">ใช้งานยังไง</h3>
                <p className="text-sm leading-6 text-gray-600">
                  ดูรายการโครงการในตารางด้านล่าง แล้วกดปุ่มดูรายละเอียด ระบบจะแสดงสถานะโครงการ, ข้อมูลหลัก,
                  หลักฐานที่อัปโหลดไว้ และลำดับเหตุการณ์ทั้งหมดบนบล็อกเชนของโครงการนั้น
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
