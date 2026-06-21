import { Contract, formatUnits, JsonRpcProvider, MaxUint256, parseEther } from "ethers";
import { carbonCreditAbi, erc20Abi } from "../../lib/contracts";
import { useEffect, useState } from "react";
import WalletBar from "../../components/WalletBar";
import { getConnectedWallet, getContractConfig, getContracts, readWalletBalances, type WalletState } from "../../lib/web3";
import type { StoredProject, OnChainProject } from "../../types";

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

function trustBadge(score: number) {
  if (score >= 70) return { cls: "bg-emerald-100 text-emerald-800", label: "High Trust" };
  if (score >= 45) return { cls: "bg-yellow-100 text-yellow-800", label: "Medium Trust" };
  return { cls: "bg-red-100 text-red-800", label: "Low Trust" };
}

type ListedProject = {
  local: StoredProject;
  onChain: OnChainProject;
};

export default function BuyerMarketplace() {
  const [listedProjects, setListedProjects] = useState<ListedProject[]>([]);
  const [allOnChainProjects, setAllOnChainProjects] = useState<ListedProject[]>([]);
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [balance, setBalance] = useState("—");
  const [buyAmount, setBuyAmount] = useState<Record<string, number>>({});
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [txMsg, setTxMsg] = useState("");
  const [portfolio, setPortfolio] = useState<Record<number, number>>({});
  const [tab, setTab] = useState<"market" | "portfolio">("market");
  const [retireAmount, setRetireAmount] = useState<Record<string, number>>({});
  const [certLinks, setCertLinks] = useState<Record<string, string>>({});
  const [pageLoading, setPageLoading] = useState(true);
  const [cardMsg, setCardMsg] = useState<Record<string, string>>({});
  const [portfolioError, setPortfolioError] = useState("");
  const [portfolioDebug, setPortfolioDebug] = useState("");

  async function loadData() {
    const w = await getConnectedWallet();
    if (!w) return;

    const [apiRes, { market }] = await Promise.all([
      fetch(`${apiBase}/projects`),
      getContracts(w.provider),
    ]);
    if (!apiRes.ok) return;
    const apiProjects: StoredProject[] = await apiRes.json();

    // Scan all on-chain projects by nextProjectId (no event query needed)
    let maxId = 0;
    try { maxId = Number(await market.nextProjectId()) - 1; } catch {}

    const listed: ListedProject[] = [];
    const allMinted: ListedProject[] = [];
    for (let pid = 1; pid <= maxId; pid++) {
      try {
        const raw = await market.projects(pid);
        const onChain = mapOnChainProject(raw);
        // Match backend project by sourceDataHash
        const rawHash: string = raw[3] as string; // sourceDataHash at index 3
        const local = apiProjects.find(p =>
          p.assessment.sourceHash === rawHash || p.assessment.sourceHash === String(raw.sourceDataHash)
        );
        if (!local) continue;
        allMinted.push({ local, onChain });
        if (onChain.status === 3 && onChain.availableCredits > 0) listed.push({ local, onChain });
      } catch {}
    }
    setListedProjects(listed);
    setAllOnChainProjects(allMinted);
  }

  async function loadBalance(w: WalletState) {
    try {
      const b = await readWalletBalances(w.provider, w.account);
      setBalance(b.tokenBalance);
    } catch {
      setBalance("Contract not configured");
    }
  }

  async function loadPortfolio(w: WalletState) {
    const entries: Record<number, number> = {};
    setPortfolioError("");
    setPortfolioDebug("");
    const debugLines: string[] = [];
    try {
      const { market, carbonToken } = await getContracts(w.provider);
      debugLines.push(`account: ${w.account}`);
      debugLines.push(`carbonToken: ${config.carbonTokenAddress}`);
      const nextId: bigint = await market.nextProjectId();
      const maxId = Number(nextId) - 1;
      debugLines.push(`nextProjectId: ${nextId} → maxId: ${maxId}`);
      for (let pid = 1; pid <= maxId; pid++) {
        const bal: bigint = await carbonToken.balanceOf(w.account, pid);
        debugLines.push(`balanceOf(${pid}): ${bal}`);
        if (bal > 0n) entries[pid] = Number(bal);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      debugLines.push(`ERROR: ${msg}`);
      setPortfolioError(msg);
    }
    setPortfolioDebug(debugLines.join(" | "));
    setPortfolio(entries);
  }

  async function refreshAll() {
    const w = await getConnectedWallet();
    setWallet(w);
    if (w) {
      await Promise.all([loadBalance(w), loadPortfolio(w)]);
    }
    await loadData();
  }

  useEffect(() => {
    refreshAll().finally(() => setPageLoading(false));
    if (!window.ethereum?.on) return;
    const h = () => void refreshAll();
    window.ethereum.on("accountsChanged", h);
    window.ethereum.on("chainChanged", h);
    return () => {
      window.ethereum?.removeListener?.("accountsChanged", h);
      window.ethereum?.removeListener?.("chainChanged", h);
    };
  }, []);

  async function runAction(key: string, task: () => Promise<void>, itemId?: string) {
    setActionKey(key);
    setTxMsg("");
    try {
      await task();
      await refreshAll();
    } catch (e) {
      const msg = `❌ ${e instanceof Error ? e.message : "Transaction failed"}`;
      setTxMsg(msg);
      if (itemId) setCardMsg(prev => ({ ...prev, [itemId]: msg }));
    } finally {
      setActionKey(null);
    }
  }

  async function approveAndBuy(item: ListedProject, amount: number, itemId: string) {
    if (!wallet) throw new Error("Connect wallet first");
    const signer = await wallet.provider.getSigner();
    const { market } = await getContracts(wallet.provider);

    // Read actual token address from the contract (not env var) to ensure correctness
    const tokenAddr: string = await market.utilityToken();
    const token = new Contract(tokenAddr, erc20Abi, signer);
    const marketAddr: string = await market.getAddress();

    // Compute cost from already-displayed price (avoids bigint field access issues)
    const priceFormatted = item.onChain.pricePerCreditFormatted; // e.g. "100.0"
    const totalCost = parseEther(String(Number(priceFormatted) * amount));

    // Check current allowance
    const allowance: bigint = await token.allowance(wallet.account, marketAddr);

    if (allowance < totalCost) {
      setCardMsg(prev => ({ ...prev, [itemId]: "⏳ Step 1/2: MetaMask — Approve TCUT..." }));
      // Approve MaxUint256 so user never needs to re-approve for future buys
      const approveTx = await token.approve(marketAddr, MaxUint256);
      await approveTx.wait();
      setCardMsg(prev => ({ ...prev, [itemId]: "✅ Approved — ⏳ Step 2/2: MetaMask — ยืนยัน Buy..." }));
    } else {
      setCardMsg(prev => ({ ...prev, [itemId]: "⏳ MetaMask popup — กรุณา Confirm ใน MetaMask" }));
    }

    const buyTx = await market.buyCredits(item.onChain.id, amount);
    await buyTx.wait();
    const msg = `✅ ซื้อ ${amount} Credits จาก "${item.local.input.projectName}" สำเร็จ! (${formatUnits(totalCost, 18)} TCUT)`;
    setTxMsg(msg);
    setCardMsg(prev => ({ ...prev, [itemId]: msg }));
  }

  async function retireCredits(onChainId: number, amount: number, localProject: StoredProject | undefined) {
    if (!wallet) throw new Error("Connect wallet first");
    if (amount < 1) throw new Error("Retire at least 1 credit");

    setTxMsg("Generating certificate on IPFS...");
    const certRes = await fetch(`${apiBase}/retire/certificate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyerAddress: wallet.account,
        projectId: onChainId,
        projectName: localProject?.input.projectName ?? `Project #${onChainId}`,
        province: localProject?.input.province ?? "",
        projectType: localProject?.input.projectType ?? "forest",
        vintageYear: localProject?.input.vintageYear ?? 2024,
        creditsRetired: amount
      })
    });
    if (!certRes.ok) {
      const err = await certRes.json() as { message: string };
      throw new Error(err.message);
    }
    const cert = await certRes.json() as { cid: string; url: string; tokenUri: string };
    setTxMsg("Certificate pinned to IPFS. Sending retire transaction...");

    const { market } = await getContracts(wallet.provider);
    const tx = await market.retireCredits(onChainId, amount, cert.tokenUri);
    await tx.wait();
    setCertLinks(prev => ({ ...prev, [onChainId]: cert.url }));
    setTxMsg(`✅ Retired ${amount} credits! NFT certificate: ${cert.url}`);
  }

  const portfolioEntries = Object.entries(portfolio);
  const totalCredits = portfolioEntries.reduce((sum, [, v]) => sum + v, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <WalletBar role="buyer" />

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🛒 Carbon Credit Marketplace</h1>
            <p className="text-gray-500 text-sm mt-1">ซื้อ Carbon Credit จากโครงการที่ผ่านการตรวจสอบแล้ว</p>
          </div>
          {wallet && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-2 text-sm">
              <span className="text-purple-500 text-xs">Wallet Balance</span>
              <p className="font-bold text-purple-900">{balance}</p>
            </div>
          )}
        </div>

        {pageLoading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          </div>
        )}

        {txMsg && (
          <div className={`mb-4 p-3 rounded-lg text-sm border ${txMsg.startsWith("✅") ? "bg-emerald-50 border-emerald-200 text-emerald-800" : txMsg.startsWith("❌") ? "bg-red-50 border-red-200 text-red-700" : "bg-blue-50 border-blue-200 text-blue-700"}`}>{txMsg}</div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-200 rounded-lg p-1 w-fit">
          <button onClick={() => setTab("market")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "market" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>
            🛒 Marketplace <span className="ml-1 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">{listedProjects.length}</span>
          </button>
          <button onClick={() => setTab("portfolio")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "portfolio" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>
            💼 My Portfolio {totalCredits > 0 && <span className="ml-1 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{totalCredits}</span>}
          </button>
        </div>

        {/* Marketplace */}
        {!pageLoading && tab === "market" && (
          <>
            {!wallet && (
              <div className="text-center py-10 bg-white rounded-2xl border border-gray-200 text-gray-500">
                <p className="text-3xl mb-2">👜</p>
                <p className="font-medium">Connect MetaMask เพื่อดู Marketplace</p>
              </div>
            )}
            {wallet && listedProjects.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-3">🌿</p>
                <p className="text-lg font-medium">ยังไม่มี Carbon Credits ที่ขายอยู่</p>
                <p className="text-sm">รอ Developer Mint Token และ Verifier Approve ก่อน</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {listedProjects.map((item) => {
                const trust = trustBadge(item.onChain.trustScore);
                const amount = buyAmount[item.local.id] ?? 1;
                const total = (Number(item.onChain.pricePerCreditFormatted) * amount).toFixed(2);
                return (
                  <div key={item.local.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-3xl">
                          {item.local.input.projectType === "forest" ? "🌳" : item.local.input.projectType === "mangrove" ? "🌿" : item.local.input.projectType === "solar" ? "☀️" : "⚡"}
                        </span>
                        <div>
                          <h3 className="font-bold text-gray-900 leading-tight">{item.local.input.projectName}</h3>
                          <p className="text-xs text-gray-500">{item.local.input.province} • {item.local.input.vintageYear}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trust.cls}`}>{trust.label}</span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-400">Available</p>
                        <p className="font-bold text-gray-900">{item.onChain.availableCredits}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-400">Price/Credit</p>
                        <p className="font-bold text-gray-900">{item.onChain.pricePerCreditFormatted} TCUT</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-400">Risk Score</p>
                        <p className={`font-bold ${item.onChain.riskScore < 35 ? "text-emerald-600" : item.onChain.riskScore < 60 ? "text-yellow-600" : "text-red-600"}`}>
                          {item.onChain.riskScore}
                        </p>
                      </div>
                    </div>

                    {/* Source hash */}
                    <p className="text-xs text-gray-400 font-mono mb-4 truncate">
                      Source: {item.local.assessment.sourceHash.slice(0, 28)}...
                    </p>

                    {/* Buy section */}
                    <div className="border-t border-gray-100 pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <label className="text-xs font-medium text-gray-600">จำนวน Credits:</label>
                        <input type="number" min={1} max={item.onChain.availableCredits}
                          value={amount}
                          onChange={(e) => setBuyAmount((prev) => ({ ...prev, [item.local.id]: Number(e.target.value) }))}
                          className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-purple-400" />
                        <span className="text-xs text-gray-500">= <strong>{total} TCUT</strong></span>
                      </div>
                      <div>
                        <button
                          disabled={!!actionKey || !wallet}
                          onClick={() => void runAction(`${item.local.id}:buy`, () => approveAndBuy(item, amount, item.local.id), item.local.id)}
                          className="w-full text-sm bg-purple-600 text-white py-2.5 rounded-lg hover:bg-purple-700 disabled:opacity-40 transition-colors font-semibold">
                          {actionKey === `${item.local.id}:buy` ? "⏳ Processing..." : "🛒 Buy Credits"}
                        </button>
                      </div>
                      {cardMsg[item.local.id] && (
                        <p className={`text-xs mt-2 px-1 ${cardMsg[item.local.id].startsWith("✅") ? "text-emerald-700" : cardMsg[item.local.id].startsWith("❌") ? "text-red-600" : "text-blue-600"}`}>
                          {cardMsg[item.local.id]}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Portfolio */}
        {!pageLoading && tab === "portfolio" && (
          <div>
            {!wallet && (
              <div className="text-center py-10 bg-white rounded-2xl border border-gray-200 text-gray-500">
                <p className="text-3xl mb-2">💼</p>
                <p className="font-medium">Connect MetaMask เพื่อดู Portfolio</p>
              </div>
            )}
            {wallet && portfolioEntries.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-3">💼</p>
                <p className="text-lg font-medium">ยังไม่มี Carbon Credits</p>
                {portfolioDebug && (
                  <p className="text-xs text-gray-400 max-w-lg mx-auto mt-2 mb-1 break-all font-mono bg-gray-100 p-2 rounded text-left">{portfolioDebug}</p>
                )}
                {portfolioError && (
                  <p className="text-xs text-red-500 max-w-md mx-auto mt-1 mb-3 break-all">{portfolioError}</p>
                )}
                <p className="text-sm mb-4">ถ้าเพิ่งซื้อ กด Refresh เพื่อโหลดใหม่</p>
                <button
                  onClick={() => void refreshAll()}
                  className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700"
                >
                  🔄 Refresh Portfolio
                </button>
              </div>
            )}
            {wallet && portfolioEntries.length > 0 && (
              <>
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-emerald-600">Total Carbon Credits Held</p>
                    <p className="text-4xl font-bold text-emerald-800">{totalCredits}</p>
                    <p className="text-xs text-emerald-500 mt-1">= {totalCredits} tCO₂ offset potential</p>
                  </div>
                  <span className="text-5xl">🌿</span>
                </div>
                <div className="space-y-4">
                  {portfolioEntries.map(([onChainId, bal]) => {
                    const item = allOnChainProjects.find(p => p.onChain.id === Number(onChainId));
                    const local = item?.local;
                    const oid = Number(onChainId);
                    const rAmount = retireAmount[onChainId] ?? 1;
                    const certUrl = certLinks[onChainId];
                    return (
                      <div key={onChainId} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">
                              {local?.input.projectType === "forest" ? "🌳"
                                : local?.input.projectType === "mangrove" ? "🌿"
                                : local?.input.projectType === "solar" ? "☀️" : "⚡"}
                            </span>
                            <div>
                              <p className="font-bold text-gray-900">
                                {local ? local.input.projectName : `Project #${onChainId}`}
                              </p>
                              <p className="text-xs text-gray-500">
                                {local ? `${local.input.province} · ${local.input.projectType} · ${local.input.vintageYear}` : `On-chain ID: ${onChainId}`}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-bold text-emerald-700">{bal}</p>
                            <p className="text-xs text-gray-400">Credits held</p>
                          </div>
                        </div>

                        {/* Retire panel */}
                        <div className="border-t border-gray-100 pt-4">
                          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Retire Credits</p>
                          <div className="flex items-center gap-2 mb-3">
                            <label className="text-xs text-gray-600">จำนวน:</label>
                            <input
                              type="number" min={1} max={bal}
                              value={rAmount}
                              onChange={(e) => setRetireAmount(prev => ({ ...prev, [onChainId]: Number(e.target.value) }))}
                              className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            />
                            <span className="text-xs text-gray-500">= {rAmount} tCO₂ offset</span>
                          </div>
                          <button
                            disabled={!!actionKey || !wallet || bal < 1}
                            onClick={() => void runAction(`${onChainId}:retire`, () => retireCredits(oid, rAmount, local))}
                            className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 transition-colors">
                            {actionKey === `${onChainId}:retire` ? "Processing..." : "🔥 Retire & Get NFT Certificate"}
                          </button>

                          {certUrl && (
                            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                              <p className="font-semibold mb-1">🎉 Certificate minted on IPFS!</p>
                              <a href={certUrl} target="_blank" rel="noreferrer"
                                className="text-emerald-600 underline break-all">{certUrl}</a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
