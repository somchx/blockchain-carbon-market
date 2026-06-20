import { Contract, formatUnits, JsonRpcProvider } from "ethers";
import { useState } from "react";
import { Link } from "react-router-dom";
import WalletBar from "../../components/WalletBar";
import { carbonMarketAbi } from "../../lib/contracts";
import { loadProjectMap } from "../../lib/storage";
import { getContractConfig } from "../../lib/web3";
import type { EvidenceFile, OnChainProject, StoredProject } from "../../types";
import { PROJECT_STATUS } from "../../types";

const config = getContractConfig();
const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

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
  ProjectSubmitted:   { label: "Project Submitted",       icon: "📝", color: "blue" },
  ProjectAssessed:    { label: "Verifier Approved",        icon: "✅", color: "green" },
  StakeDeposited:     { label: "Stake Deposited",          icon: "🔒", color: "purple" },
  CreditsMinted:      { label: "Credits Minted & Listed", icon: "🌱", color: "emerald" },
  CreditsPurchased:   { label: "Credits Purchased",        icon: "🛒", color: "amber" },
  ChallengeOpened:    { label: "Challenge Opened",         icon: "⚠️", color: "orange" },
  ChallengeFinalized: { label: "Challenge Finalized",      icon: "⚖️", color: "red" },
  RewardIssued:       { label: "Reward Issued",            icon: "🏆", color: "yellow" },
  CreditsRetired:     { label: "Credits Retired (Offset)", icon: "🔥", color: "gray" },
};

const EVENT_NAMES = [
  "ProjectSubmitted",
  "ProjectAssessed",
  "StakeDeposited",
  "CreditsMinted",
  "CreditsPurchased",
  "ChallengeOpened",
  "ChallengeFinalized",
  "RewardIssued",
  "CreditsRetired",
] as const;

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
        { key: "Seller",            value: shortAddr(args[1] as string) },
        { key: "Requested Credits", value: `${Number(args[2] as bigint)} credits` },
      ];
    case "ProjectAssessed":
      return [
        { key: "Approved Credits", value: `${Number(args[1] as bigint)} credits` },
        { key: "Risk Score",       value: String(Number(args[2] as bigint)) },
        { key: "Required Stake",   value: tcut(args[3] as bigint) },
      ];
    case "StakeDeposited":
      return [
        { key: "Depositor", value: shortAddr(args[1] as string) },
        { key: "Amount",    value: tcut(args[2] as bigint) },
      ];
    case "CreditsMinted":
      return [
        { key: "Credits Minted", value: `${Number(args[1] as bigint)} credits` },
        { key: "Price/Credit",   value: tcut(args[2] as bigint) },
      ];
    case "CreditsPurchased":
      return [
        { key: "Buyer",      value: shortAddr(args[1] as string) },
        { key: "Amount",     value: `${Number(args[2] as bigint)} credits` },
        { key: "Total Cost", value: tcut(args[3] as bigint) },
      ];
    case "ChallengeOpened":
      return [
        { key: "Challenger", value: shortAddr(args[1] as string) },
        { key: "Deadline",   value: new Date(Number(args[2] as bigint) * 1000).toLocaleString("th-TH") },
      ];
    case "ChallengeFinalized":
      return [
        { key: "Fraud Confirmed", value: args[1] ? "YES ⚠️" : "NO ✅" },
        { key: "Slashed Amount",  value: tcut(args[2] as bigint) },
      ];
    case "RewardIssued":
      return [
        { key: "Reward Amount",       value: tcut(args[1] as bigint) },
        { key: "Updated Trust Score", value: String(Number(args[2] as bigint)) },
      ];
    case "CreditsRetired":
      return [
        { key: "Retiree",    value: shortAddr(args[1] as string) },
        { key: "Amount",     value: `${Number(args[2] as bigint)} credits offset` },
        { key: "NFT Cert #", value: String(Number(args[3] as bigint)) },
      ];
    default:
      return [];
  }
}

export default function TraceabilityExplorer() {
  const [searchId, setSearchId]           = useState("");
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState("");
  const [events, setEvents]               = useState<TraceEvent[]>([]);
  const [onChainProject, setOnChainProject] = useState<OnChainProject | null>(null);
  const [backendProject, setBackendProject] = useState<StoredProject | null>(null);
  const [evidence, setEvidence]           = useState<EvidenceFile[]>([]);
  const [searched, setSearched]           = useState(false);
  const [foundId, setFoundId]             = useState<number | null>(null);

  async function doSearch() {
    const pid = parseInt(searchId.trim(), 10);
    if (isNaN(pid) || pid < 1) {
      setError("กรุณาใส่ Project ID ที่ถูกต้อง (ตัวเลข ≥ 1)");
      return;
    }

    setLoading(true);
    setError("");
    setEvents([]);
    setOnChainProject(null);
    setBackendProject(null);
    setEvidence([]);
    setSearched(true);
    setFoundId(pid);

    try {
      const rpcUrl = import.meta.env.VITE_CHAIN_RPC_URL ?? "http://127.0.0.1:8545";
      const provider = new JsonRpcProvider(rpcUrl);

      if (!config.marketAddress) throw new Error("VITE_MARKET_ADDRESS not configured");
      const market = new Contract(config.marketAddress, carbonMarketAbi, provider);
      const pidBig = BigInt(pid);

      // On-chain project data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw: any = await market.projects(pidBig);
      const projectExists = Number(raw.id) > 0;
      if (projectExists) {
        setOnChainProject({
          id:                     Number(raw.id),
          seller:                 raw.seller as string,
          requestedCredits:       Number(raw.requestedCredits),
          approvedCredits:        Number(raw.approvedCredits),
          riskScore:              Number(raw.riskScore),
          trustScore:             Number(raw.trustScore),
          requiredStakeFormatted: formatUnits(raw.requiredStake as bigint, 18),
          stakedAmountFormatted:  formatUnits(raw.stakedAmount as bigint, 18),
          availableCredits:       Number(raw.availableCredits),
          pricePerCreditFormatted: formatUnits(raw.pricePerCredit as bigint, 18),
          status:                 Number(raw.status),
        });
      }

      // Query all events by projectId
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mktFilters = (market as any).filters;
      const allResults = await Promise.all(
        EVENT_NAMES.map(name =>
          market.queryFilter(mktFilters[name](pidBig), 0).catch(() => [] as unknown[])
        )
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allLogs = (allResults.flat() as any[]).sort(
        (a, b) => (a.blockNumber as number) - (b.blockNumber as number)
      );

      // Block timestamps in batch
      const uniqueBlocks = [...new Set(allLogs.map(l => l.blockNumber as number))];
      const blockData = await Promise.all(uniqueBlocks.map(b => provider.getBlock(b)));
      const tsMap: Record<number, number> = {};
      uniqueBlocks.forEach((b, i) => { if (blockData[i]) tsMap[b] = blockData[i]!.timestamp; });

      const traceEvents: TraceEvent[] = allLogs.map(log => {
        const name: string = (log.fragment?.name as string | undefined) ?? "Unknown";
        const meta = EVENT_META[name] ?? { label: name, icon: "📋", color: "gray" as ColorKey };
        return {
          name,
          label:       meta.label,
          icon:        meta.icon,
          colorKey:    meta.color,
          blockNumber: log.blockNumber as number,
          txHash:      log.transactionHash as string,
          timestamp:   tsMap[log.blockNumber as number] ?? null,
          details:     log.args ? parseDetails(name, Array.from(log.args as Iterable<unknown>)) : [],
        };
      });

      setEvents(traceEvents);

      // Backend project + IPFS evidence (optional — keyed via localStorage projectMap)
      try {
        const projectMap = loadProjectMap();
        const reverseMap: Record<number, string> = Object.fromEntries(
          Object.entries(projectMap).map(([localId, onChainId]) => [onChainId, localId])
        );
        const localId = reverseMap[pid];
        if (localId) {
          const [pRes, eRes] = await Promise.all([
            fetch(`${apiBase}/projects/${localId}`),
            fetch(`${apiBase}/projects/${localId}/evidence`),
          ]);
          if (pRes.ok) setBackendProject((await pRes.json()) as StoredProject);
          if (eRes.ok) setEvidence((await eRes.json()) as EvidenceFile[]);
        }
      } catch {
        // backend data is supplementary — silent fail
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect to blockchain");
    } finally {
      setLoading(false);
    }
  }

  const explorerBase = config.explorerBaseUrl;

  return (
    <div className="min-h-screen bg-gray-50">
      <WalletBar role="buyer" />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-2 flex items-center gap-3">
          <Link to="/" className="text-gray-400 hover:text-gray-600 text-sm">← Home</Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-500">Traceability Explorer</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">🔍 Traceability Explorer</h1>
        <p className="text-gray-500 text-sm mb-8">
          ค้นหา Carbon Credit Project บน Blockchain — ดู full journey ตั้งแต่ Submit → Stake → Approve → Mint → Buy พร้อม tx hash และหลักฐาน IPFS
        </p>

        {/* Search */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">On-Chain Project ID</label>
          <div className="flex gap-3">
            <input
              type="number"
              min="1"
              value={searchId}
              onChange={e => setSearchId(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") void doSearch(); }}
              placeholder="เช่น 1, 2, 3 ..."
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={() => void doSearch()}
              disabled={loading}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Loading...
                </span>
              ) : "Search"}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            ดู On-Chain ID ได้จาก Developer Dashboard → My Projects → แถบ "On-chain #N"
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">
            ⚠️ {error}
          </div>
        )}

        {/* Results */}
        {searched && !loading && (
          <>
            {/* Project not found */}
            {onChainProject === null && events.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
                <p className="text-4xl mb-3">📭</p>
                <p className="text-lg font-semibold text-gray-700">Project #{foundId} ไม่พบบน Blockchain</p>
                <p className="text-sm text-gray-400">ลองใส่ ID อื่น หรือตรวจสอบว่า Hardhat node กำลังรันอยู่</p>
              </div>
            )}

            {/* On-chain project info */}
            {onChainProject && onChainProject.id > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Project #{onChainProject.id}</h2>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    onChainProject.status >= 3 ? "bg-emerald-100 text-emerald-700"
                    : onChainProject.status >= 1 ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-500"
                  }`}>
                    {PROJECT_STATUS[onChainProject.status] ?? "Unknown"}
                  </span>
                </div>

                {backendProject && (
                  <div className="mb-4 pb-4 border-b border-gray-100">
                    <p className="font-semibold text-gray-800 text-base">{backendProject.input.projectName}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {backendProject.input.sellerName} • {backendProject.input.province} •{" "}
                      <span className="capitalize">{backendProject.input.projectType}</span> •{" "}
                      {backendProject.input.landAreaRai} ไร่ • Vintage {backendProject.input.vintageYear}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Seller",           value: shortAddr(onChainProject.seller) },
                    { label: "Approved Credits", value: `${onChainProject.approvedCredits}` },
                    { label: "Risk Score",       value: `${onChainProject.riskScore} / 100` },
                    { label: "Trust Score",      value: `${onChainProject.trustScore} / 100` },
                    { label: "Staked",           value: `${Number(onChainProject.stakedAmountFormatted).toLocaleString()} TCUT` },
                    { label: "Required Stake",   value: `${Number(onChainProject.requiredStakeFormatted).toLocaleString()} TCUT` },
                    { label: "Available",        value: `${onChainProject.availableCredits} credits` },
                    { label: "Price/Credit",     value: `${Number(onChainProject.pricePerCreditFormatted).toLocaleString()} TCUT` },
                  ].map(item => (
                    <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400">{item.label}</p>
                      <p className="font-semibold text-gray-900 text-sm mt-0.5">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* IPFS Evidence */}
            {evidence.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  📎 หลักฐานบน IPFS
                  <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    {evidence.length} ไฟล์
                  </span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {evidence.map(f => (
                    <a
                      key={f.id}
                      href={f.ipfsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                      <span>{f.mimeType === "application/pdf" ? "📄" : "🖼️"}</span>
                      <div>
                        <p className="font-medium">{f.fileName}</p>
                        <p className="font-mono text-emerald-500">{f.ipfsCid.slice(0, 14)}...</p>
                      </div>
                      <span>↗</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            {events.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-1">
                  ⛓️ Token Journey
                  <span className="ml-2 font-normal text-gray-400">{events.length} events on-chain</span>
                </h3>
                <p className="text-xs text-gray-400 mb-6">เรียงตาม Block Number — เก่าสุดอยู่บน, ใหม่สุดอยู่ล่าง</p>

                <div className="relative">
                  {/* Vertical connector line */}
                  <div className="absolute left-[18px] top-3 bottom-3 w-0.5 bg-gray-200" />

                  <div className="space-y-4">
                    {events.map((ev, i) => {
                      const cls = COLOR_CLASSES[ev.colorKey];
                      return (
                        <div key={i} className="relative flex gap-4 pl-12">
                          {/* Timeline dot */}
                          <div className={`absolute left-3 top-3.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow ${cls.dot}`} />

                          {/* Event card */}
                          <div className={`flex-1 rounded-xl border p-4 ${cls.bg} ${cls.border}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xl flex-shrink-0">{ev.icon}</span>
                                <div className="min-w-0">
                                  <p className={`text-sm font-bold ${cls.text}`}>{ev.label}</p>
                                  {ev.timestamp !== null && (
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      {new Date(ev.timestamp * 1000).toLocaleString("th-TH", {
                                        dateStyle: "medium",
                                        timeStyle: "short",
                                      })}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="text-right flex-shrink-0">
                                <p className="text-xs text-gray-400">Block #{ev.blockNumber}</p>
                                {explorerBase ? (
                                  <a
                                    href={`${explorerBase}/tx/${ev.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-mono text-blue-500 hover:underline"
                                  >
                                    {ev.txHash.slice(0, 10)}...↗
                                  </a>
                                ) : (
                                  <p className="text-xs font-mono text-gray-400" title={ev.txHash}>
                                    {ev.txHash.slice(0, 10)}...
                                  </p>
                                )}
                              </div>
                            </div>

                            {ev.details.length > 0 && (
                              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
                                {ev.details.map(d => (
                                  <div key={d.key} className="text-xs">
                                    <span className="text-gray-400">{d.key}: </span>
                                    <span className="font-semibold text-gray-700">{d.value}</span>
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
            )}

            {/* No events (but project exists) */}
            {events.length === 0 && onChainProject && onChainProject.id > 0 && (
              <div className="text-center py-10 bg-white rounded-2xl border border-gray-200 text-gray-400">
                <p className="text-3xl mb-2">⏳</p>
                <p className="font-medium">ยังไม่มี Events</p>
                <p className="text-sm">Project ID ถูกต้องแต่ยังไม่มี Transaction บน Blockchain</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
