import { formatUnits, Interface, id as ethersId, parseEther } from "ethers";
import { useEffect, useState } from "react";
import WalletBar from "../../components/WalletBar";
import { getCGOVSaleContract, getConnectedWallet, getContractConfig, getContracts, readCGOVSaleInfo, type WalletState } from "../../lib/web3";

const config = getContractConfig();

const PROPOSAL_STATE: Record<number, { label: string; cls: string }> = {
  0: { label: "Pending", cls: "bg-gray-100 text-gray-600" },
  1: { label: "Active", cls: "bg-blue-100 text-blue-700" },
  2: { label: "Canceled", cls: "bg-gray-100 text-gray-500" },
  3: { label: "Defeated", cls: "bg-red-100 text-red-700" },
  4: { label: "Succeeded", cls: "bg-emerald-100 text-emerald-700" },
  5: { label: "Queued", cls: "bg-yellow-100 text-yellow-700" },
  6: { label: "Expired", cls: "bg-orange-100 text-orange-700" },
  7: { label: "Executed", cls: "bg-purple-100 text-purple-700" },
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

type GovernanceRule = {
  key: string;
  label: string;
  value: string;
  helper: string;
  badge: "On-chain" | "Hybrid";
};

type ProposalType =
  | "changeReviewerBond"
  | "changeChallengeDuration"
  | "changeVoteThreshold"
  | "changePenaltyBps"
  | "changeRewardReputation"
  | "changePenaltyReputation"
  | "changePlatformFee"
  | "changeMinVerifierReputation";

const PROPOSAL_OPTIONS: Array<{
  type: ProposalType;
  label: string;
  helper: string;
  paramLabel: string;
  placeholder: string;
  parse: (input: string) => bigint;
  describe: (input: string) => string;
}> = [
  {
    type: "changeReviewerBond",
    label: "เปลี่ยน Reviewer Bond",
    helper: "ปรับเงิน TCUT ที่ reviewer ต้องวางเพื่อเข้าระบบ challenge",
    paramLabel: "New Bond (TCUT)",
    placeholder: "150",
    parse: (input) => BigInt(Math.round(Number(input) * 1e18)),
    describe: (input) => `เปลี่ยน Reviewer Bond เป็น ${input} TCUT`,
  },
  {
    type: "changeChallengeDuration",
    label: "เปลี่ยน Challenge Duration",
    helper: "กำหนดเวลาที่เปิดให้ challenge โหวต",
    paramLabel: "New Duration (seconds)",
    placeholder: "604800",
    parse: (input) => BigInt(input),
    describe: (input) => `เปลี่ยน Challenge Duration เป็น ${input} วินาที`,
  },
  {
    type: "changeVoteThreshold",
    label: "เปลี่ยน Vote Threshold",
    helper: "กำหนดจำนวนเสียงที่ทำให้ challenge ถูกตัดสิน",
    paramLabel: "New Vote Threshold",
    placeholder: "4",
    parse: (input) => BigInt(input),
    describe: (input) => `เปลี่ยน Vote Threshold เป็น ${input} เสียง`,
  },
  {
    type: "changePenaltyBps",
    label: "เปลี่ยน Failed Challenge Penalty",
    helper: "กำหนดอัตราหัก bond เมื่อ challenger เปิด challenge แล้วไม่สำเร็จ",
    paramLabel: "New Penalty (bps)",
    placeholder: "750",
    parse: (input) => BigInt(input),
    describe: (input) => `เปลี่ยน Failed Challenge Penalty เป็น ${input} bps`,
  },
  {
    type: "changeRewardReputation",
    label: "เปลี่ยน Reputation Reward",
    helper: "กำหนดคะแนน reputation ที่ challenger ได้เมื่อ challenge สำเร็จ",
    paramLabel: "New Reward Points",
    placeholder: "15",
    parse: (input) => BigInt(input),
    describe: (input) => `เปลี่ยน Reputation Reward เป็น ${input} คะแนน`,
  },
  {
    type: "changePenaltyReputation",
    label: "เปลี่ยน Reputation Penalty",
    helper: "กำหนดคะแนน reputation ที่ challenger เสียเมื่อ challenge ไม่สำเร็จ",
    paramLabel: "New Penalty Points",
    placeholder: "8",
    parse: (input) => BigInt(input),
    describe: (input) => `เปลี่ยน Reputation Penalty เป็น ${input} คะแนน`,
  },
  {
    type: "changePlatformFee",
    label: "เปลี่ยน Marketplace Fee",
    helper: "กำหนดค่าธรรมเนียม marketplace ของระบบ",
    paramLabel: "New Fee (bps)",
    placeholder: "150",
    parse: (input) => BigInt(input),
    describe: (input) => `เปลี่ยน Marketplace Fee เป็น ${input} bps`,
  },
  {
    type: "changeMinVerifierReputation",
    label: "เปลี่ยน Min Verifier Reputation",
    helper: "กำหนดคะแนน reputation ขั้นต่ำสำหรับ verifier policy",
    paramLabel: "New Min Reputation",
    placeholder: "60",
    parse: (input) => BigInt(input),
    describe: (input) => `เปลี่ยน Min Verifier Reputation เป็น ${input} คะแนน`,
  },
];

function formatSeconds(seconds: bigint) {
  const total = Number(seconds);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  if (days > 0) return `${days} วัน ${hours} ชม.`;
  if (hours > 0) return `${hours} ชม.`;
  return `${total} วิ`;
}

function formatTCUT(value: bigint) {
  return `${Number(formatUnits(value, 18)).toLocaleString()} TCUT`;
}

export default function GovernancePortal() {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [govBalance, setGovBalance] = useState("—");
  const [votingPower, setVotingPower] = useState("0");
  const [proposalThreshold, setProposalThreshold] = useState("—");
  const [delegatee, setDelegatee] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [rules, setRules] = useState<GovernanceRule[]>([]);
  const [legacyContractWarning, setLegacyContractWarning] = useState("");
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [txMsg, setTxMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [propType, setPropType] = useState<ProposalType>("changeReviewerBond");
  const [propParam, setPropParam] = useState("");
  const [propDesc, setPropDesc] = useState("");

  const [cgovInventory, setCgovInventory] = useState("—");
  const [cgovFaucetAmount, setCgovFaucetAmount] = useState("500");
  const [cgovCooldownSec, setCgovCooldownSec] = useState(0n);
  const [cgovRate, setCgovRate] = useState(10_000n);
  const [ethBuyInput, setEthBuyInput] = useState("");
  const [delegateTarget, setDelegateTarget] = useState("");

  const selectedOption = PROPOSAL_OPTIONS.find((option) => option.type === propType) ?? PROPOSAL_OPTIONS[0];

  async function loadData() {
    setLoading(true);
    setLegacyContractWarning("");
    try {
      const w = await getConnectedWallet();
      setWallet(w);
      if (!w) return;

      const { govToken, governor, market } = await getContracts(w.provider);

      const [
        rawBal,
        rawVotes,
        rawDelegatee,
        rawProposalThreshold,
      ] = await Promise.all([
        govToken.balanceOf(w.account),
        govToken.getVotes(w.account),
        govToken.delegates(w.account),
        governor.proposalThreshold(),
      ]);

      setGovBalance(Number(formatUnits(rawBal, 18)).toLocaleString());
      setVotingPower(Number(formatUnits(rawVotes, 18)).toLocaleString());
      setProposalThreshold(Number(formatUnits(rawProposalThreshold, 18)).toLocaleString());
      setDelegatee(rawDelegatee as string);

      const governanceReads = await Promise.allSettled([
        market.reviewerBond(),
        market.challengeDuration(),
        market.voteThreshold(),
        market.challengerPenaltyBps(),
        market.challengerRewardReputation(),
        market.challengerPenaltyReputation(),
        market.platformFeeBps(),
        market.minimumVerifierReputationToApprove(),
      ]);

      const hasLegacyMismatch = governanceReads.some((result) => result.status === "rejected");
      if (hasLegacyMismatch) {
        setLegacyContractWarning("Contract CarbonMarket ปัจจุบันบน address นี้ยังเป็นเวอร์ชันเก่า จึงยังไม่รองรับ governance parameters ชุดใหม่ทั้งหมด ต้อง redeploy market contract ก่อน");
      }

      const readValue = (index: number, fallback: bigint) =>
        governanceReads[index]?.status === "fulfilled" ? governanceReads[index].value as bigint : fallback;

      const rawReviewerBond = readValue(0, 0n);
      const rawChallengeDuration = readValue(1, 0n);
      const rawVoteThreshold = readValue(2, 0n);
      const rawPenaltyBps = readValue(3, 0n);
      const rawRewardRep = readValue(4, 0n);
      const rawPenaltyRep = readValue(5, 0n);
      const rawPlatformFee = readValue(6, 0n);
      const rawMinVerifierRep = readValue(7, 0n);

      setRules([
        { key: "reviewerBond", label: "Reviewer Bond", value: rawReviewerBond > 0n ? formatTCUT(rawReviewerBond) : "—", helper: "เงิน TCUT ที่ reviewer ต้องวางเพื่อเข้าระบบ challenge", badge: "On-chain" },
        { key: "challengeDuration", label: "Challenge Duration", value: rawChallengeDuration > 0n ? formatSeconds(rawChallengeDuration) : "—", helper: "เวลาที่เปิดให้ challenge และลงคะแนน", badge: "On-chain" },
        { key: "voteThreshold", label: "Vote Threshold", value: rawVoteThreshold > 0n ? `${rawVoteThreshold.toString()} เสียง` : "—", helper: "จำนวนเสียงที่ทำให้ challenge ถูกตัดสิน", badge: "On-chain" },
        { key: "challengerPenaltyBps", label: "Failed Challenge Penalty", value: rawPenaltyBps > 0n ? `${rawPenaltyBps.toString()} bps` : "—", helper: "อัตราหัก bond เมื่อ challenger เปิด challenge แล้วไม่สำเร็จ", badge: "On-chain" },
        { key: "challengerRewardReputation", label: "Successful Challenge Reward", value: rawRewardRep > 0n ? `${rawRewardRep.toString()} คะแนน` : "—", helper: "reputation reward เมื่อ challenge สำเร็จ", badge: "On-chain" },
        { key: "challengerPenaltyReputation", label: "Failed Challenge Reputation Penalty", value: rawPenaltyRep > 0n ? `${rawPenaltyRep.toString()} คะแนน` : "—", helper: "reputation penalty เมื่อ challenge ไม่สำเร็จ", badge: "On-chain" },
        { key: "platformFeeBps", label: "Marketplace Fee", value: rawPlatformFee > 0n ? `${rawPlatformFee.toString()} bps` : "—", helper: "ค่าธรรมเนียม marketplace ของระบบ", badge: "On-chain" },
        { key: "minimumVerifierReputationToApprove", label: "Min Verifier Reputation", value: rawMinVerifierRep > 0n ? `${rawMinVerifierRep.toString()} คะแนน` : "—", helper: "เกณฑ์ reputation ขั้นต่ำสำหรับ verifier policy", badge: "Hybrid" },
      ]);

      try {
        const saleInfo = await readCGOVSaleInfo(w.provider, w.account);
        setCgovInventory(Number(formatUnits(saleInfo.inventory, 18)).toLocaleString());
        setCgovFaucetAmount(Number(formatUnits(saleInfo.faucetAmount, 18)).toLocaleString());
        setCgovCooldownSec(saleInfo.secondsUntilClaim);
        setCgovRate(saleInfo.rate);
      } catch { /* cgovSale not configured */ }

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

  useEffect(() => {
    void loadData();
  }, []);

  async function runAction(key: string, task: () => Promise<void>) {
    setActionKey(key);
    setTxMsg("");
    try {
      await task();
      await loadData();
    } catch (e) {
      setTxMsg(e instanceof Error ? e.message.slice(0, 220) : "Transaction failed");
    } finally {
      setActionKey(null);
    }
  }

  async function addCGOVToMetaMask() {
    const govTokenAddr = config.governanceTokenAddress;
    if (!govTokenAddr || !window.ethereum) return;
    await (window.ethereum as any).request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: { address: govTokenAddr, symbol: "CGOV", decimals: 18 },
      },
    });
  }

  async function claimCGOVFaucet() {
    if (!wallet) return;
    const signer = await wallet.provider.getSigner();
    const sale = getCGOVSaleContract(wallet.provider);
    const tx = await (sale.connect(signer) as any).claimFaucet();
    await tx.wait();
    setTxMsg(`✅ รับ ${cgovFaucetAmount} CGOV แล้ว! อย่าลืม Delegate votes ด้วย`);
  }

  async function buyCGOVWithETH() {
    if (!wallet || !ethBuyInput) return;
    const signer = await wallet.provider.getSigner();
    const sale = getCGOVSaleContract(wallet.provider);
    const ethValue = parseEther(ethBuyInput);
    const tx = await (sale.connect(signer) as any).buyTokens({ value: ethValue });
    await tx.wait();
    const received = Number(ethBuyInput) * Number(cgovRate);
    setTxMsg(`✅ ซื้อ ${received.toLocaleString()} CGOV ด้วย ${ethBuyInput} ETH สำเร็จ! อย่าลืม Delegate votes ด้วย`);
    setEthBuyInput("");
  }

  async function delegateToSelf() {
    if (!wallet) return;
    const { govToken } = await getContracts(wallet.provider);
    const tx = await govToken.delegate(wallet.account);
    await (tx as any).wait();
    setTxMsg("✅ Delegated voting power to yourself!");
  }

  async function delegateToAddress() {
    if (!wallet || !delegateTarget) return;
    const { govToken } = await getContracts(wallet.provider);
    const tx = await govToken.delegate(delegateTarget);
    await (tx as any).wait();
    setTxMsg(`✅ มอบสิทธิ์โหวตให้ ${delegateTarget.slice(0, 8)}... แล้ว`);
    setDelegateTarget("");
  }

  function buildCalldata(type: ProposalType, input: string): { targets: string[]; values: bigint[]; calldatas: string[] } {
    const iface = new Interface([
      "function setReviewerBond(uint256)",
      "function setChallengeDuration(uint256)",
      "function setVoteThreshold(uint256)",
      "function setChallengerPenaltyBps(uint256)",
      "function setChallengerRewardReputation(uint256)",
      "function setChallengerPenaltyReputation(uint256)",
      "function setPlatformFeeBps(uint256)",
      "function setMinimumVerifierReputationToApprove(uint256)",
    ]);

    const encodedValue = selectedOption.parse(input);
    const fnMap: Record<ProposalType, string> = {
      changeReviewerBond: "setReviewerBond",
      changeChallengeDuration: "setChallengeDuration",
      changeVoteThreshold: "setVoteThreshold",
      changePenaltyBps: "setChallengerPenaltyBps",
      changeRewardReputation: "setChallengerRewardReputation",
      changePenaltyReputation: "setChallengerPenaltyReputation",
      changePlatformFee: "setPlatformFeeBps",
      changeMinVerifierReputation: "setMinimumVerifierReputationToApprove",
    };

    return {
      targets: [config.marketAddress!],
      values: [0n],
      calldatas: [iface.encodeFunctionData(fnMap[type], [encodedValue])],
    };
  }

  async function createProposal() {
    if (!wallet || !propParam || !propDesc) throw new Error("กรอกข้อมูลให้ครบ");
    if (legacyContractWarning) throw new Error("Current market contract is still legacy. Redeploy CarbonMarket before creating governance proposals with the new parameters.");
    const { governor } = await getContracts(wallet.provider);
    const { targets, values, calldatas } = buildCalldata(propType, propParam);
    const tx = await governor.propose(targets, values, calldatas, propDesc);
    await (tx as any).wait();
    setTxMsg("✅ Proposal created! รอ 1 block แล้ว voting จะ Active");
    setPropParam("");
    setPropDesc("");
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
  const hasProposalThreshold = parseFloat(votingPower.replace(/,/g, "")) >= parseFloat(proposalThreshold.replace(/,/g, ""));
  const previewText = propParam ? selectedOption.describe(propParam) : "กรอกค่าใหม่เพื่อดูผลกระทบของ proposal นี้";

  return (
    <div className="min-h-screen bg-gray-50">
      <WalletBar role="developer" />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">🏛️ DAO Governance Portal</h1>
          <p className="text-gray-500 text-sm mt-1">กำหนดกติกา challenge, slashing, verifier policy และ market rule ของ Carbon Market</p>
        </div>

        {txMsg && (
          <div className={`mb-5 p-3 rounded-lg text-sm border ${txMsg.startsWith("✅") ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-700"}`}>
            {txMsg}
          </div>
        )}

        {legacyContractWarning && (
          <div className="mb-5 p-3 rounded-lg text-sm border bg-amber-50 border-amber-200 text-amber-800">
            ⚠️ {legacyContractWarning}
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
            {/* ── CGOV Acquisition ───────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-purple-200 shadow-sm p-6 mb-6">
              <div className="flex items-start justify-between mb-1">
                <h2 className="text-sm font-semibold text-purple-700 uppercase tracking-wide">รับ CGOV Token</h2>
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">คงเหลือ {cgovInventory} CGOV</span>
              </div>
              <p className="text-xs text-gray-400 mb-5">ต้องถือ CGOV และ Delegate ก่อนจึงจะโหวตหรือเสนอ Proposal ได้</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Faucet */}
                <div className="rounded-xl border border-purple-100 bg-purple-50 p-4">
                  <p className="text-sm font-semibold text-purple-900 mb-1">🪙 รับฟรี (Faucet)</p>
                  <p className="text-xs text-purple-600 mb-3">{cgovFaucetAmount} CGOV ต่อครั้ง · cooldown 24 ชม.</p>
                  {cgovCooldownSec > 0n ? (
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">
                      ⏳ รอ {Math.ceil(Number(cgovCooldownSec) / 3600)} ชม. อีก {Math.ceil((Number(cgovCooldownSec) % 3600) / 60)} นาที
                    </div>
                  ) : (
                    <button
                      disabled={!!actionKey}
                      onClick={() => void runAction("faucet", claimCGOVFaucet)}
                      className="w-full py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-40 transition-colors mb-2"
                    >
                      {actionKey === "faucet" ? "กำลังรับ..." : "🎁 รับ 500 CGOV ฟรี สำหรับทดสอบระบบ"}
                    </button>
                  )}
                  <button
                    onClick={() => void addCGOVToMetaMask()}
                    className="w-full py-1.5 rounded-xl border border-purple-200 text-purple-700 text-xs font-semibold hover:bg-purple-50 transition-colors"
                  >
                    🦊 เพิ่ม CGOV ใน MetaMask
                  </button>
                </div>

                {/* Buy with ETH */}
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                  <p className="text-sm font-semibold text-indigo-900 mb-1">💰 ซื้อด้วย ETH</p>
                  <p className="text-xs text-indigo-600 mb-3">1 ETH = {Number(cgovRate).toLocaleString()} CGOV (การลงหุ้นในระบบ)</p>
                  <div className="flex gap-2">
                    <input
                      value={ethBuyInput}
                      onChange={(e) => setEthBuyInput(e.target.value)}
                      placeholder="0.01"
                      type="number"
                      min="0"
                      step="0.001"
                      className="flex-1 border border-indigo-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                    />
                    <button
                      disabled={!!actionKey || !ethBuyInput || Number(ethBuyInput) <= 0}
                      onClick={() => void runAction("buy", buyCGOVWithETH)}
                      className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 transition-colors whitespace-nowrap"
                    >
                      {actionKey === "buy" ? "..." : "ซื้อ"}
                    </button>
                  </div>
                  {ethBuyInput && Number(ethBuyInput) > 0 && (
                    <p className="text-xs text-indigo-500 mt-1.5">
                      ≈ {(Number(ethBuyInput) * Number(cgovRate)).toLocaleString()} CGOV
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-xs text-gray-500 leading-5">
                <span className="font-semibold text-gray-700">ขั้นตอนหลังได้ CGOV:</span>{" "}
                1) รับ CGOV → 2) กด <span className="font-semibold">Delegate Votes to Myself</span> → 3) โหวตหรือเสนอ Proposal ได้เลย
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Voting Power</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
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
              <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                Proposal Threshold ปัจจุบัน: <span className="font-semibold text-gray-900">{proposalThreshold} CGOV</span>
              </div>
              {!selfDelegated && (
                <button
                  disabled={!!actionKey}
                  onClick={() => void runAction("delegate", delegateToSelf)}
                  className="w-full py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-40 transition-colors mb-3"
                >
                  {actionKey === "delegate" ? "Delegating..." : "🗳️ Delegate Votes to Myself"}
                </button>
              )}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-semibold text-gray-600 mb-2">🤝 มอบสิทธิ์โหวตให้คนอื่น</p>
                <p className="text-xs text-gray-400 mb-2">กรอก wallet address ของผู้ที่จะรับสิทธิ์โหวตแทนคุณ</p>
                <div className="flex gap-2">
                  <input
                    value={delegateTarget}
                    onChange={(e) => setDelegateTarget(e.target.value)}
                    placeholder="0x..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                  />
                  <button
                    disabled={!!actionKey || !delegateTarget || !/^0x[a-fA-F0-9]{40}$/.test(delegateTarget)}
                    onClick={() => void runAction("delegateTo", delegateToAddress)}
                    className="px-3 py-1.5 rounded-lg bg-gray-700 text-white text-xs font-semibold hover:bg-gray-800 disabled:opacity-40 transition-colors whitespace-nowrap"
                  >
                    {actionKey === "delegateTo" ? "..." : "มอบสิทธิ์"}
                  </button>
                </div>
              </div>
              {selfDelegated && !hasVotingPower && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="font-semibold">⚠️ Delegated แล้วแต่ยังไม่มี CGOV tokens</p>
                  <p className="mt-1">wallet นี้ต้องได้รับ `CGOV allocation` หรือ `airdrop` ก่อน จึงจะมี voting power และโหวตได้ตาม flow DAO จริง</p>
                </div>
              )}
              {selfDelegated && hasVotingPower && !hasProposalThreshold && (
                <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="font-semibold">ℹ️ Vote ได้แล้ว แต่ยังเสนอ proposal เองไม่ได้</p>
                  <p className="mt-1">voting power ปัจจุบันต่ำกว่า proposal threshold ที่กำหนดไว้ จึงใช้สิทธิ์โหวตได้ แต่ยังสร้าง proposal ใหม่ไม่ได้</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
              <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Current Rules</h2>
                  <p className="text-xs text-gray-400 mt-1">ค่าปัจจุบันของกติกาตลาดคาร์บอนที่ DAO สามารถเปลี่ยนได้</p>
                </div>
                {loading && <span className="text-xs text-gray-400">Loading rules...</span>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {rules.map((rule) => (
                  <div key={rule.key} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-gray-800">{rule.label}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${rule.badge === "On-chain" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                        {rule.badge}
                      </span>
                    </div>
                    <p className="text-lg font-bold text-gray-900 mt-2">{rule.value}</p>
                    <p className="text-xs text-gray-500 mt-1 leading-5">{rule.helper}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Create Governance Proposal</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">ประเภท Proposal</label>
                  <select
                    value={propType}
                    onChange={(e) => setPropType(e.target.value as ProposalType)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    {PROPOSAL_OPTIONS.map((option) => (
                      <option key={option.type} value={option.type}>{option.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1.5">{selectedOption.helper}</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">{selectedOption.paramLabel}</label>
                  <input
                    value={propParam}
                    onChange={(e) => setPropParam(e.target.value)}
                    placeholder={selectedOption.placeholder}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>

                <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
                  <p className="text-xs font-semibold text-indigo-700 mb-1">Impact Preview</p>
                  <p className="text-sm text-indigo-900">{previewText}</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">คำอธิบาย Proposal</label>
                  <textarea
                    value={propDesc}
                    onChange={(e) => setPropDesc(e.target.value)}
                    rows={2}
                    placeholder="เช่น: เพิ่ม reviewer bond เพื่อให้ challenge มีต้นทุนสูงขึ้นและลด spam"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                  />
                </div>

                <button
                  disabled={!!actionKey || !propParam || !propDesc || !selfDelegated || !hasProposalThreshold || !!legacyContractWarning}
                  onClick={() => void runAction("propose", createProposal)}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                >
                  {actionKey === "propose" ? "Creating..." : "📋 Create Proposal"}
                </button>
                {!selfDelegated && (
                  <p className="text-xs text-gray-400 text-center">ต้อง Delegate votes ก่อนถึงจะ propose ได้</p>
                )}
                {selfDelegated && !hasProposalThreshold && (
                  <p className="text-xs text-gray-400 text-center">ต้องมี voting power อย่างน้อย {proposalThreshold} CGOV ก่อนถึงจะ propose ได้</p>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Governance History {loading && <span className="text-gray-400 normal-case font-normal">(loading...)</span>}
              </h2>

              {proposals.length === 0 && !loading && (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 text-gray-400">
                  <p className="text-3xl mb-2">📋</p>
                  <p>ยังไม่มี Proposal — สร้างอันแรกได้เลย!</p>
                </div>
              )}

              <div className="space-y-4">
                {proposals.map((proposal) => {
                  const state = PROPOSAL_STATE[proposal.state] ?? { label: "Unknown", cls: "bg-gray-100 text-gray-600" };
                  const total = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
                  const forPct = total > 0n ? Number((proposal.forVotes * 100n) / total) : 0;
                  const againstPct = total > 0n ? Number((proposal.againstVotes * 100n) / total) : 0;
                  const explorerUrl = config.explorerBaseUrl ? `${config.explorerBaseUrl}/address/${config.governorAddress}` : null;

                  return (
                    <div key={proposal.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 pr-4">
                          <p className="font-semibold text-gray-900 leading-snug">{proposal.description}</p>
                          <p className="text-xs text-gray-400 mt-1 font-mono">
                            by {proposal.proposer.slice(0, 8)}... · Blocks {proposal.voteStart}–{proposal.voteEnd}
                          </p>
                        </div>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${state.cls}`}>
                          {state.label}
                        </span>
                      </div>

                      <div className="mb-3">
                        <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 mb-1">
                          <div className="bg-emerald-400" style={{ width: `${forPct}%` }} />
                          <div className="bg-red-400" style={{ width: `${againstPct}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>✅ For: {Number(formatUnits(proposal.forVotes, 18)).toLocaleString()}</span>
                          <span>❌ Against: {Number(formatUnits(proposal.againstVotes, 18)).toLocaleString()}</span>
                          <span>⚪ Abstain: {Number(formatUnits(proposal.abstainVotes, 18)).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {proposal.state === 1 && !proposal.hasVoted && (
                          <>
                            <button
                              disabled={!!actionKey}
                              onClick={() => void runAction(`vote-${proposal.id}`, () => castVote(proposal, 1))}
                              className="flex-1 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"
                            >
                              {actionKey === `vote-${proposal.id}` ? "Voting..." : "✅ Vote For"}
                            </button>
                            <button
                              disabled={!!actionKey}
                              onClick={() => void runAction(`vote-${proposal.id}`, () => castVote(proposal, 0))}
                              className="flex-1 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40"
                            >
                              ❌ Vote Against
                            </button>
                            <button
                              disabled={!!actionKey}
                              onClick={() => void runAction(`vote-${proposal.id}`, () => castVote(proposal, 2))}
                              className="flex-1 py-2 text-xs font-semibold rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                            >
                              ⚪ Abstain
                            </button>
                          </>
                        )}
                        {proposal.state === 1 && proposal.hasVoted && (
                          <p className="text-xs text-emerald-600 font-medium py-2">✅ คุณ Vote แล้วใน Proposal นี้</p>
                        )}
                        {proposal.state === 4 && (
                          <button
                            disabled={!!actionKey}
                            onClick={() => void runAction(`exec-${proposal.id}`, () => executeProposal(proposal))}
                            className="flex-1 py-2 text-xs font-semibold rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40"
                          >
                            {actionKey === `exec-${proposal.id}` ? "Executing..." : "⚡ Execute Proposal"}
                          </button>
                        )}
                        {explorerUrl && (
                          <a
                            href={explorerUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-2 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
                          >
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
