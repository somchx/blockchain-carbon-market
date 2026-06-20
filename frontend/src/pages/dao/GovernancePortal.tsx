import { formatUnits, Interface, id as ethersId } from "ethers";
import { useEffect, useState } from "react";
import WalletBar from "../../components/WalletBar";
import { getConnectedWallet, getContractConfig, getContracts, type WalletState } from "../../lib/web3";

const config = getContractConfig();

// Proposal state labels
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

type Proposal = {
  id: string;
  description: string;
  proposer: string;
  voteStart: number;
  voteEnd: number;
  targets: string[];
  values: bigint[];
  calldatas: string[];
  state: number;
  forVotes: bigint;
  againstVotes: bigint;
  abstainVotes: bigint;
  hasVoted: boolean;
};

export default function GovernancePortal() {
  const [wallet, setWallet]       = useState<WalletState | null>(null);
  const [govBalance, setGovBalance] = useState("—");
  const [votingPower, setVotingPower] = useState("0");
  const [delegatee, setDelegatee]   = useState<string | null>(null);
  const [proposals, setProposals]   = useState<Proposal[]>([]);
  const [actionKey, setActionKey]   = useState<string | null>(null);
  const [txMsg, setTxMsg]           = useState("");
  const [loading, setLoading]       = useState(false);

  // Create proposal form
  const [propType, setPropType] = useState<"changeAssessor" | "changeFee">("changeAssessor");
  const [propParam, setPropParam] = useState("");
  const [propDesc, setPropDesc]   = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const w = await getConnectedWallet();
      setWallet(w);
      if (!w) return;

      const { govToken, governor } = await getContracts(w.provider);

      const [rawBal, rawVotes, rawDelegatee] = await Promise.all([
        govToken.balanceOf(w.account),
        govToken.getVotes(w.account),
        govToken.delegates(w.account),
      ]);
      setGovBalance(Number(formatUnits(rawBal, 18)).toLocaleString());
      setVotingPower(Number(formatUnits(rawVotes, 18)).toLocaleString());
      setDelegatee(rawDelegatee as string);

      // Load proposals from ProposalCreated events
      const filter = (governor as any).filters.ProposalCreated();
      const events = await (governor as any).queryFilter(filter, 0);

      const loaded: Proposal[] = await Promise.all(
        events.map(async (ev: any) => {
          const { proposalId, proposer, targets, values, calldatas, voteStart, voteEnd, description } = ev.args;
          const [state, votes, hasVoted] = await Promise.all([
            governor.state(proposalId),
            (governor as any).proposalVotes(proposalId),
            (governor as any).hasVoted(proposalId, w.account),
          ]);
          return {
            id: proposalId.toString(),
            description: description as string,
            proposer: proposer as string,
            voteStart: Number(voteStart),
            voteEnd: Number(voteEnd),
            targets: targets as string[],
            values: values as bigint[],
            calldatas: calldatas as string[],
            state: Number(state),
            forVotes: (votes as any).forVotes as bigint,
            againstVotes: (votes as any).againstVotes as bigint,
            abstainVotes: (votes as any).abstainVotes as bigint,
            hasVoted: hasVoted as boolean,
          };
        })
      );
      setProposals(loaded.reverse());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, []);

  async function runAction(key: string, task: () => Promise<void>) {
    setActionKey(key);
    setTxMsg("");
    try {
      await task();
      await loadData();
    } catch (e) {
      setTxMsg(e instanceof Error ? e.message.slice(0, 200) : "Transaction failed");
    } finally {
      setActionKey(null);
    }
  }

  async function delegateToSelf() {
    if (!wallet) return;
    const { govToken } = await getContracts(wallet.provider);
    const tx = await govToken.delegate(wallet.account);
    await (tx as any).wait();
    setTxMsg("✅ Delegated voting power to yourself!");
  }

  function buildCalldata(type: string, param: string): { targets: string[]; values: bigint[]; calldatas: string[] } {
    const iface = new Interface(["function setAssessor(address)", "function setPlatformFeeBps(uint256)"]);
    if (type === "changeAssessor") {
      return {
        targets: [config.marketAddress!],
        values: [0n],
        calldatas: [iface.encodeFunctionData("setAssessor", [param])],
      };
    } else {
      return {
        targets: [config.marketAddress!],
        values: [0n],
        calldatas: [iface.encodeFunctionData("setPlatformFeeBps", [BigInt(param)])],
      };
    }
  }

  async function createProposal() {
    if (!wallet || !propParam || !propDesc) throw new Error("กรอกข้อมูลให้ครบ");
    const { governor } = await getContracts(wallet.provider);
    const { targets, values, calldatas } = buildCalldata(propType, propParam);
    const tx = await governor.propose(targets, values, calldatas, propDesc);
    await (tx as any).wait();
    setTxMsg("✅ Proposal created! รอ 1 block แล้ว voting จะ Active");
    setPropParam(""); setPropDesc("");
  }

  async function castVote(proposal: Proposal, support: number) {
    if (!wallet) return;
    const { governor } = await getContracts(wallet.provider);
    const tx = await (governor as any).castVote(BigInt(proposal.id), support);
    await (tx as any).wait();
    const labels = ["Against", "For", "Abstain"];
    setTxMsg(`✅ Voted ${labels[support]} on proposal!`);
  }

  async function executeProposal(proposal: Proposal) {
    if (!wallet) return;
    const { governor } = await getContracts(wallet.provider);
    const descHash = ethersId(proposal.description);
    const tx = await governor.execute(proposal.targets, proposal.values, proposal.calldatas, descHash);
    await (tx as any).wait();
    setTxMsg("✅ Proposal executed! Changes applied on-chain.");
  }

  const selfDelegated = delegatee?.toLowerCase() === wallet?.account.toLowerCase();
  const hasVotingPower = parseFloat(votingPower.replace(/,/g, "")) > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <WalletBar role="developer" />
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">🏛️ DAO Governance Portal</h1>
          <p className="text-gray-500 text-sm mt-1">Carbon Market DAO — vote เปลี่ยน Assessor, Platform Fee และ parameters ต่างๆ</p>
        </div>

        {txMsg && (
          <div className={`mb-5 p-3 rounded-lg text-sm border ${txMsg.startsWith("✅") ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-700"}`}>
            {txMsg}
          </div>
        )}

        {!wallet && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 text-gray-400">
            <p className="text-4xl mb-3">🏛️</p>
            <p className="text-lg font-medium">Connect MetaMask เพื่อใช้งาน DAO</p>
          </div>
        )}

        {wallet && (
          <>
            {/* Voting Power Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Voting Power</h2>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-purple-500 mb-1">CGOV Balance</p>
                  <p className="text-2xl font-bold text-purple-900">{govBalance}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-blue-500 mb-1">Voting Power</p>
                  <p className="text-2xl font-bold text-blue-900">{votingPower}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Delegated To</p>
                  <p className="text-sm font-mono font-bold text-gray-700 truncate">
                    {selfDelegated ? "Self ✅" : delegatee ? `${delegatee.slice(0, 8)}...` : "Not delegated"}
                  </p>
                </div>
              </div>
              {!selfDelegated && (
                <button
                  disabled={!!actionKey}
                  onClick={() => void runAction("delegate", delegateToSelf)}
                  className="w-full py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-40 transition-colors">
                  {actionKey === "delegate" ? "Delegating..." : "🗳️ Delegate Votes to Myself"}
                </button>
              )}
              {selfDelegated && !hasVotingPower && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2 text-center">
                  ⚠️ Delegated แล้วแต่ยังไม่มี CGOV tokens — ต้องมี tokens ถึงจะ vote ได้
                </p>
              )}
            </div>

            {/* Create Proposal */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">สร้าง Proposal</h2>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">ประเภท Proposal</label>
                  <select
                    value={propType}
                    onChange={e => setPropType(e.target.value as "changeAssessor" | "changeFee")}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                    <option value="changeAssessor">เปลี่ยน Assessor (ผู้ตรวจสอบโครงการ)</option>
                    <option value="changeFee">เปลี่ยน Platform Fee (bps)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    {propType === "changeAssessor" ? "New Assessor Address (0x...)" : "New Fee (bps, 100 = 1%)"}
                  </label>
                  <input
                    value={propParam}
                    onChange={e => setPropParam(e.target.value)}
                    placeholder={propType === "changeAssessor" ? "0x2910A..." : "200"}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">คำอธิบาย Proposal</label>
                  <textarea
                    value={propDesc}
                    onChange={e => setPropDesc(e.target.value)}
                    rows={2}
                    placeholder="เช่น: เปลี่ยน Assessor เป็น 0x... เพราะ..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" />
                </div>

                <button
                  disabled={!!actionKey || !propParam || !propDesc || !selfDelegated}
                  onClick={() => void runAction("propose", createProposal)}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 transition-colors">
                  {actionKey === "propose" ? "Creating..." : "📋 Create Proposal"}
                </button>
                {!selfDelegated && (
                  <p className="text-xs text-gray-400 text-center">ต้อง Delegate votes ก่อนถึงจะ propose ได้</p>
                )}
              </div>
            </div>

            {/* Proposals List */}
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Proposals {loading && <span className="text-gray-400 normal-case font-normal">(loading...)</span>}
              </h2>

              {proposals.length === 0 && !loading && (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 text-gray-400">
                  <p className="text-3xl mb-2">📋</p>
                  <p>ยังไม่มี Proposal — สร้างอันแรกได้เลย!</p>
                </div>
              )}

              <div className="space-y-4">
                {proposals.map(p => {
                  const st = PROPOSAL_STATE[p.state] ?? { label: "Unknown", cls: "bg-gray-100 text-gray-600" };
                  const total = p.forVotes + p.againstVotes + p.abstainVotes;
                  const forPct = total > 0n ? Number((p.forVotes * 100n) / total) : 0;
                  const againstPct = total > 0n ? Number((p.againstVotes * 100n) / total) : 0;
                  const explorerUrl = config.explorerBaseUrl ? `${config.explorerBaseUrl}/address/${config.governorAddress}` : null;

                  return (
                    <div key={p.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 pr-4">
                          <p className="font-semibold text-gray-900 leading-snug">{p.description}</p>
                          <p className="text-xs text-gray-400 mt-1 font-mono">
                            by {p.proposer.slice(0, 8)}... · Blocks {p.voteStart}–{p.voteEnd}
                          </p>
                        </div>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${st.cls}`}>
                          {st.label}
                        </span>
                      </div>

                      {/* Vote bar */}
                      <div className="mb-3">
                        <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 mb-1">
                          <div className="bg-emerald-400" style={{ width: `${forPct}%` }} />
                          <div className="bg-red-400" style={{ width: `${againstPct}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>✅ For: {Number(formatUnits(p.forVotes, 18)).toLocaleString()}</span>
                          <span>❌ Against: {Number(formatUnits(p.againstVotes, 18)).toLocaleString()}</span>
                          <span>⚪ Abstain: {Number(formatUnits(p.abstainVotes, 18)).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 flex-wrap">
                        {p.state === 1 && !p.hasVoted && (
                          <>
                            <button disabled={!!actionKey} onClick={() => void runAction(`vote-${p.id}`, () => castVote(p, 1))}
                              className="flex-1 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40">
                              {actionKey === `vote-${p.id}` ? "Voting..." : "✅ Vote For"}
                            </button>
                            <button disabled={!!actionKey} onClick={() => void runAction(`vote-${p.id}`, () => castVote(p, 0))}
                              className="flex-1 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40">
                              ❌ Vote Against
                            </button>
                            <button disabled={!!actionKey} onClick={() => void runAction(`vote-${p.id}`, () => castVote(p, 2))}
                              className="flex-1 py-2 text-xs font-semibold rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                              ⚪ Abstain
                            </button>
                          </>
                        )}
                        {p.state === 1 && p.hasVoted && (
                          <p className="text-xs text-emerald-600 font-medium py-2">✅ คุณ Vote แล้วใน Proposal นี้</p>
                        )}
                        {p.state === 4 && (
                          <button disabled={!!actionKey} onClick={() => void runAction(`exec-${p.id}`, () => executeProposal(p))}
                            className="flex-1 py-2 text-xs font-semibold rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40">
                            {actionKey === `exec-${p.id}` ? "Executing..." : "⚡ Execute Proposal"}
                          </button>
                        )}
                        {explorerUrl && (
                          <a href={explorerUrl} target="_blank" rel="noreferrer"
                            className="px-3 py-2 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">
                            Etherscan ↗
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
