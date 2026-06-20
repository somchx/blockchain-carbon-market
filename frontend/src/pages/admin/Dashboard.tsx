import { formatUnits } from "ethers";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import WalletBar from "../../components/WalletBar";
import { getConnectedWallet, getContractConfig, getContracts, type WalletState } from "../../lib/web3";
import { loadProjectMap } from "../../lib/storage";
import type { StoredProject } from "../../types";
import { PROJECT_STATUS } from "../../types";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";
const config = getContractConfig();

type AdminStats = {
  totalProjects: number;
  totalEvidence: number;
  riskLow: number;
  riskMed: number;
  riskHigh: number;
};

type LeaderboardEntry = {
  rank: number;
  id: string;
  sellerName: string;
  projectName: string;
  trustScore: number;
  riskScore: number;
  approvedCredits: number;
};

type Proposal = {
  id: string;
  description: string;
  proposer: string;
  voteStart: number;
  voteEnd: number;
  state: number;
  forVotes: bigint;
  againstVotes: bigint;
  abstainVotes: bigint;
};

const PROPOSAL_STATE: Record<number, { label: string; cls: string }> = {
  0: { label: "Pending",   cls: "bg-gray-100 text-gray-600" },
  1: { label: "Active",    cls: "bg-blue-100 text-blue-700" },
  2: { label: "Canceled",  cls: "bg-gray-100 text-gray-500" },
  3: { label: "Defeated",  cls: "bg-red-100 text-red-700" },
  4: { label: "Succeeded", cls: "bg-emerald-100 text-emerald-700" },
  5: { label: "Queued",    cls: "bg-yellow-100 text-yellow-700" },
  6: { label: "Expired",   cls: "bg-orange-100 text-orange-700" },
  7: { label: "Executed",  cls: "bg-purple-100 text-purple-700" },
};

const STATUS_ICON: Record<number, string> = {
  0: "⏳", 1: "✅", 2: "🔒", 3: "🌱", 4: "⚠️", 5: "❌", 6: "🗂️",
};

function riskColor(score: number) {
  if (score < 35) return "text-emerald-600";
  if (score < 60) return "text-yellow-600";
  return "text-red-600";
}

function trustBar(score: number) {
  const pct = Math.min(100, score);
  const color = score >= 70 ? "bg-emerald-400" : score >= 45 ? "bg-yellow-400" : "bg-red-400";
  return { pct, color };
}

export default function AdminDashboard() {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [projects, setProjects] = useState<StoredProject[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [onChainStatus, setOnChainStatus] = useState<Record<string, number>>({});
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "projects" | "leaderboard" | "dao">("overview");

  async function loadAll() {
    const [statsRes, projectsRes, lbRes, w] = await Promise.all([
      fetch(`${apiBase}/admin/stats`),
      fetch(`${apiBase}/projects`),
      fetch(`${apiBase}/leaderboard`),
      getConnectedWallet(),
    ]);
    if (statsRes.ok) setStats(await statsRes.json() as AdminStats);
    const projs: StoredProject[] = projectsRes.ok ? await projectsRes.json() : [];
    setProjects(projs);
    if (lbRes.ok) setLeaderboard(await lbRes.json() as LeaderboardEntry[]);
    setWallet(w);

    if (w) {
      // Load on-chain statuses
      const projectMap = loadProjectMap();
      const statusMap: Record<string, number> = {};
      await Promise.all(
        Object.entries(projectMap).map(async ([localId, onChainId]) => {
          try {
            const { market } = await getContracts(w.provider);
            const raw = await market.projects(onChainId);
            statusMap[localId] = Number((raw as { status: number }).status);
          } catch {}
        })
      );
      setOnChainStatus(statusMap);

      // Load DAO proposals
      try {
        const { governor } = await getContracts(w.provider);
        const filter = (governor as any).filters.ProposalCreated();
        const events = await (governor as any).queryFilter(filter, 0);
        const loaded: Proposal[] = await Promise.all(
          events.map(async (ev: any) => {
            const { proposalId, proposer, voteStart, voteEnd, description } = ev.args;
            const [state, votes] = await Promise.all([
              governor.state(proposalId),
              (governor as any).proposalVotes(proposalId),
            ]);
            return {
              id: proposalId.toString(),
              description: description as string,
              proposer: proposer as string,
              voteStart: Number(voteStart),
              voteEnd: Number(voteEnd),
              state: Number(state),
              forVotes: (votes as any).forVotes as bigint,
              againstVotes: (votes as any).againstVotes as bigint,
              abstainVotes: (votes as any).abstainVotes as bigint,
            };
          })
        );
        setProposals(loaded.reverse());
      } catch {}
    }
  }

  useEffect(() => {
    loadAll().finally(() => setPageLoading(false));
  }, []);

  const projectMap = loadProjectMap();
  const onChainCount = Object.keys(onChainStatus).length;
  const mintedCount = Object.values(onChainStatus).filter(s => s === 3).length;
  const pendingCount = Object.values(onChainStatus).filter(s => s === 0).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <WalletBar role="developer" />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">⚙️ Admin Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">ภาพรวมระบบ — โครงการ, DAO Proposals, Leaderboard</p>
          </div>
          <div className="flex gap-2">
            <Link to="/dao"
              className="text-xs bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-semibold transition-colors">
              🏛️ DAO Portal
            </Link>
            <Link to="/explorer"
              className="text-xs bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold transition-colors">
              🔍 Explorer
            </Link>
          </div>
        </div>

        {pageLoading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
          </div>
        )}

        {!pageLoading && (
          <>
            {/* System Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-center">
                <p className="text-3xl font-bold text-gray-900">{stats?.totalProjects ?? "—"}</p>
                <p className="text-xs text-gray-400 mt-1">Total Projects</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-center">
                <p className="text-3xl font-bold text-emerald-600">{mintedCount}</p>
                <p className="text-xs text-gray-400 mt-1">Live on Market</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-center">
                <p className="text-3xl font-bold text-amber-600">{pendingCount}</p>
                <p className="text-xs text-gray-400 mt-1">Awaiting Verify</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-center">
                <p className="text-3xl font-bold text-blue-600">{stats?.totalEvidence ?? "—"}</p>
                <p className="text-xs text-gray-400 mt-1">Evidence Files</p>
              </div>
            </div>

            {/* Risk Distribution */}
            {stats && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Risk Distribution</h2>
                <div className="flex gap-4 items-center flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                    <span className="text-sm text-gray-600">Low Risk</span>
                    <span className="font-bold text-gray-900">{stats.riskLow}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <span className="text-sm text-gray-600">Medium Risk</span>
                    <span className="font-bold text-gray-900">{stats.riskMed}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <span className="text-sm text-gray-600">High Risk</span>
                    <span className="font-bold text-gray-900">{stats.riskHigh}</span>
                  </div>
                  <div className="flex-1 min-w-32">
                    {stats.totalProjects > 0 && (
                      <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
                        <div className="bg-emerald-400 transition-all" style={{ width: `${(stats.riskLow / stats.totalProjects) * 100}%` }} />
                        <div className="bg-yellow-400 transition-all" style={{ width: `${(stats.riskMed / stats.totalProjects) * 100}%` }} />
                        <div className="bg-red-400 transition-all" style={{ width: `${(stats.riskHigh / stats.totalProjects) * 100}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-gray-200 rounded-lg p-1 w-fit flex-wrap">
              {([
                { key: "overview", label: "📋 Projects", count: projects.length },
                { key: "leaderboard", label: "🏆 Leaderboard", count: leaderboard.length },
                { key: "dao", label: "🏛️ DAO Proposals", count: proposals.length },
              ] as const).map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                  {t.label}
                  {t.count > 0 && <span className="ml-1 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">{t.count}</span>}
                </button>
              ))}
            </div>

            {/* Projects Tab */}
            {tab === "overview" && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Project</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Seller</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Risk</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Trust</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Credits</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {projects.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-12 text-gray-400">
                            <p className="text-3xl mb-2">📋</p>
                            <p>ยังไม่มีโครงการในระบบ</p>
                          </td>
                        </tr>
                      )}
                      {projects.map(p => {
                        const onChainId = projectMap[p.id];
                        const status = onChainStatus[p.id];
                        return (
                          <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900 truncate max-w-[180px]">{p.input.projectName}</p>
                              <p className="text-xs text-gray-400">{p.input.province} · {p.input.projectType}</p>
                            </td>
                            <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{p.input.sellerName}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`font-bold ${riskColor(p.assessment.riskScore)}`}>{p.assessment.riskScore}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-bold text-gray-700">{p.assessment.trustScore}</span>
                            </td>
                            <td className="px-4 py-3 text-center text-gray-700">{p.assessment.approvedCredits}</td>
                            <td className="px-4 py-3 text-center">
                              {onChainId !== undefined && status !== undefined ? (
                                <span className="text-xs font-medium">
                                  {STATUS_ICON[status]} {PROJECT_STATUS[status]}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">Off-chain only</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex gap-1 justify-center">
                                {onChainId && (
                                  <Link to="/explorer"
                                    className="text-xs text-blue-600 border border-blue-200 px-2 py-1 rounded hover:bg-blue-50">
                                    Trace
                                  </Link>
                                )}
                                {onChainId && status === 3 && (
                                  <Link to="/dao"
                                    className="text-xs text-red-600 border border-red-200 px-2 py-1 rounded hover:bg-red-50">
                                    Slash via DAO
                                  </Link>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Leaderboard Tab */}
            {tab === "leaderboard" && (
              <div className="space-y-3">
                {leaderboard.length === 0 && (
                  <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 text-gray-400">
                    <p className="text-3xl mb-2">🏆</p>
                    <p>ยังไม่มีข้อมูล Leaderboard</p>
                  </div>
                )}
                {leaderboard.map(entry => {
                  const bar = trustBar(entry.trustScore);
                  return (
                    <div key={entry.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-4">
                      <div className={`text-2xl font-bold w-10 text-center ${entry.rank === 1 ? "text-yellow-500" : entry.rank === 2 ? "text-gray-400" : entry.rank === 3 ? "text-amber-600" : "text-gray-300"}`}>
                        {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{entry.projectName}</p>
                        <p className="text-xs text-gray-400">{entry.sellerName}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full max-w-32">
                            <div className={`h-1.5 rounded-full ${bar.color}`} style={{ width: `${bar.pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">Trust {entry.trustScore}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-bold ${riskColor(entry.riskScore)}`}>Risk {entry.riskScore}</p>
                        <p className="text-xs text-gray-400">{entry.approvedCredits} credits</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* DAO Proposals Tab */}
            {tab === "dao" && (
              <div className="space-y-4">
                {!wallet && (
                  <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 text-gray-400">
                    <p className="text-3xl mb-2">🔌</p>
                    <p>Connect MetaMask เพื่อดู DAO Proposals</p>
                  </div>
                )}
                {wallet && proposals.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 text-gray-400">
                    <p className="text-3xl mb-2">🏛️</p>
                    <p>ยังไม่มี Proposal</p>
                    <Link to="/dao" className="inline-block mt-3 text-sm text-purple-600 border border-purple-200 px-4 py-2 rounded-lg hover:bg-purple-50">
                      สร้าง Proposal แรก →
                    </Link>
                  </div>
                )}
                {wallet && proposals.map(p => {
                  const st = PROPOSAL_STATE[p.state] ?? { label: "Unknown", cls: "bg-gray-100 text-gray-600" };
                  const total = p.forVotes + p.againstVotes + p.abstainVotes;
                  const forPct = total > 0n ? Number((p.forVotes * 100n) / total) : 0;
                  const againstPct = total > 0n ? Number((p.againstVotes * 100n) / total) : 0;
                  return (
                    <div key={p.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 pr-4">
                          <p className="font-semibold text-gray-900">{p.description}</p>
                          <p className="text-xs text-gray-400 mt-1 font-mono">
                            proposer: {p.proposer.slice(0, 10)}... · blocks {p.voteStart}–{p.voteEnd}
                          </p>
                        </div>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${st.cls}`}>
                          {st.label}
                        </span>
                      </div>
                      <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 mb-1">
                        <div className="bg-emerald-400" style={{ width: `${forPct}%` }} />
                        <div className="bg-red-400" style={{ width: `${againstPct}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mb-3">
                        <span>✅ For: {Number(formatUnits(p.forVotes, 18)).toLocaleString()}</span>
                        <span>❌ Against: {Number(formatUnits(p.againstVotes, 18)).toLocaleString()}</span>
                        <span>⚪ Abstain: {Number(formatUnits(p.abstainVotes, 18)).toLocaleString()}</span>
                      </div>
                      <Link to="/dao"
                        className="inline-block text-xs text-purple-600 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-50">
                        Vote in DAO Portal →
                      </Link>
                    </div>
                  );
                })}
                {wallet && (
                  <div className="text-center pt-2">
                    <Link to="/dao"
                      className="inline-block text-sm bg-purple-600 text-white px-6 py-2.5 rounded-xl hover:bg-purple-700 font-semibold transition-colors">
                      🏛️ เปิด DAO Portal เพื่อ Vote / สร้าง Proposal
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Contract Addresses Reference */}
            <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Contract Addresses ({config.rpcLabel})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                {[
                  { label: "CarbonMarket", addr: config.marketAddress },
                  { label: "GovernanceToken", addr: config.governanceTokenAddress },
                  { label: "GovernorDAO", addr: config.governorAddress },
                  { label: "RetireCertificate", addr: config.retireCertificateAddress },
                ].map(({ label, addr }) => addr && (
                  <div key={label} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-gray-400 w-36 flex-shrink-0">{label}</span>
                    <a href={`${config.explorerBaseUrl}/address/${addr}`} target="_blank" rel="noreferrer"
                      className="text-blue-600 hover:underline truncate">{addr}</a>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
