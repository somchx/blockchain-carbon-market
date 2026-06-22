import { useEffect, useState } from "react";
import { Contract, formatUnits, parseEther } from "ethers";
import type { BrowserProvider } from "ethers";
import { tcutSaleAbi } from "../lib/contracts";
import { addTCUTToMetaMask, getContractConfig, readTCUTSaleInfo } from "../lib/web3";

type Tab = "faucet" | "buy";

type Props = {
  provider: BrowserProvider;
  account: string;
  onClose: () => void;
  onSuccess: () => void;
};

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h} ชม. ${m} นาที`;
  if (m > 0) return `${m} นาที ${s} วินาที`;
  return `${s} วินาที`;
}

export default function BuyTCUTModal({ provider, account, onClose, onSuccess }: Props) {
  const [tab, setTab] = useState<Tab>("faucet");
  const [rate, setRate] = useState<bigint>(0n);
  const [inventory, setInventory] = useState<bigint>(0n);
  const [faucetAmount, setFaucetAmount] = useState<bigint>(0n);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [ethBalance, setEthBalance] = useState<bigint>(0n);
  const [ethInput, setEthInput] = useState("0.001");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [addingToWallet, setAddingToWallet] = useState(false);

  async function load() {
    try {
      const [info, bal] = await Promise.all([
        readTCUTSaleInfo(provider, account),
        provider.getBalance(account),
      ]);
      setRate(info.rate);
      setInventory(info.inventory);
      setFaucetAmount(info.faucetAmount);
      setSecondsLeft(Number(info.secondsUntilClaim));
      setEthBalance(bal);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  // countdown tick
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  function getSaleContract(withSigner = false) {
    const config = getContractConfig();
    if (withSigner) {
      return provider.getSigner().then(
        (signer) => new Contract(config.tcutSaleAddress!, tcutSaleAbi, signer)
      );
    }
    return Promise.resolve(new Contract(config.tcutSaleAddress!, tcutSaleAbi, provider));
  }

  async function handleClaim() {
    setBusy(true);
    setMsg(null);
    try {
      const sale = await getSaleContract(true);
      const tx = await (sale as any).claimFaucet();
      setMsg({ text: "รอยืนยัน transaction...", ok: true });
      await tx.wait();
      const freeAmount = Number(formatUnits(faucetAmount, 18)).toLocaleString();
      setMsg({ text: `ได้รับ ${freeAmount} TCUT แล้ว! 🎉`, ok: true });
      setSecondsLeft(86400);
      onSuccess();
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      if (err.includes("rejected") || err.includes("denied")) {
        setMsg({ text: "ยกเลิกโดยผู้ใช้", ok: false });
      } else if (err.includes("FaucetCooldownActive") || err.includes("Too soon")) {
        setMsg({ text: "ยังไม่ครบ 24 ชั่วโมง ลองใหม่ทีหลัง", ok: false });
      } else {
        setMsg({ text: err.slice(0, 160), ok: false });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleBuy() {
    const ethNum = parseFloat(ethInput) || 0;
    if (ethNum <= 0) return;
    setBusy(true);
    setMsg(null);
    try {
      const sale = await getSaleContract(true);
      const tx = await (sale as any).buyTokens({ value: parseEther(ethInput) });
      setMsg({ text: "รอยืนยัน transaction...", ok: true });
      await tx.wait();
      const received = Math.floor(ethNum * Number(rate));
      setMsg({ text: `ได้รับ ${received.toLocaleString()} TCUT แล้ว! 🎉`, ok: true });
      onSuccess();
      // refresh inventory
      const readSale = await getSaleContract(false);
      setInventory(await (readSale as any).tokenBalance() as bigint);
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      if (err.includes("rejected") || err.includes("denied")) {
        setMsg({ text: "ยกเลิกโดยผู้ใช้", ok: false });
      } else if (err.includes("insufficient funds")) {
        setMsg({ text: "ETH ไม่พอ — ขอ Sepolia ETH จาก faucet.google.com ก่อน", ok: false });
      } else {
        setMsg({ text: err.slice(0, 160), ok: false });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleAddToWallet() {
    setAddingToWallet(true);
    try {
      await addTCUTToMetaMask();
    } catch {
      // user cancelled
    } finally {
      setAddingToWallet(false);
    }
  }

  const ethNum = parseFloat(ethInput) || 0;
  const tcutPreview = ethNum > 0 && rate > 0n ? Math.floor(ethNum * Number(rate)) : 0;
  const ethBalanceDisplay = parseFloat(formatUnits(ethBalance, 18)).toFixed(4);
  const inventoryDisplay = parseFloat(formatUnits(inventory, 18)).toLocaleString();
  const faucetDisplay = parseFloat(formatUnits(faucetAmount, 18)).toLocaleString();
  const canClaim = secondsLeft === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">TCUT Token</h2>
            <p className="text-xs text-gray-400 mt-0.5">Thai Carbon Utility Token · Sepolia</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddToWallet}
              disabled={addingToWallet}
              title="เพิ่ม TCUT ใน MetaMask"
              className="flex items-center gap-1.5 text-xs bg-orange-50 text-orange-600 border border-orange-200 px-3 py-1.5 rounded-lg hover:bg-orange-100 disabled:opacity-60 transition-colors font-medium"
            >
              <svg width="14" height="14" viewBox="0 0 35 33" fill="none">
                <path d="M32.9 1L19.5 10.7l2.5-5.9L32.9 1z" fill="#E17726" stroke="#E17726" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2.1 1l13.3 9.8-2.4-5.9L2.1 1z" fill="#E27625" stroke="#E27625" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M28.2 23.5l-3.6 5.5 7.7 2.1 2.2-7.5-6.3-.1zM.6 23.6l2.2 7.5 7.7-2.1-3.6-5.5-6.3.1z" fill="#E27625" stroke="#E27625" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10.1 14.5l-2.1 3.2 7.5.3-.3-8-5.1 4.5zM24.9 14.5l-5.2-4.6-.2 8.1 7.5-.3-2.1-3.2zM10.5 29l4.5-2.2-3.9-3-.6 5.2zM20 26.8l4.5 2.2-.6-5.2-3.9 3z" fill="#E27625" stroke="#E27625" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {addingToWallet ? "..." : "เพิ่มใน MetaMask"}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100">✕</button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400">กำลังโหลด...</div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => { setTab("faucet"); setMsg(null); }}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  tab === "faucet"
                    ? "text-emerald-600 border-b-2 border-emerald-600"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                ขอฟรี (Faucet)
              </button>
              <button
                onClick={() => { setTab("buy"); setMsg(null); }}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  tab === "buy"
                    ? "text-emerald-600 border-b-2 border-emerald-600"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                ซื้อด้วย ETH
              </button>
            </div>

            <div className="px-6 py-5">
              {/* Inventory pill — shared */}
              <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                <span>คลัง TCUT เหลือ</span>
                <span className="font-semibold text-gray-600">{inventoryDisplay} TCUT</span>
              </div>

              {tab === "faucet" && (
                <>
                  {/* Faucet amount hero */}
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-5 text-center mb-4">
                    <p className="text-xs text-emerald-600 font-medium mb-1">คุณจะได้รับ</p>
                    <p className="text-4xl font-bold text-emerald-700 tracking-tight">{faucetDisplay}</p>
                    <p className="text-sm text-emerald-500 mt-0.5">TCUT · ฟรี ทุก 24 ชั่วโมง</p>
                  </div>

                  {/* Cooldown status */}
                  {!canClaim && secondsLeft > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-center">
                      <p className="text-xs text-amber-600 mb-0.5">รับได้อีกครั้งใน</p>
                      <p className="text-sm font-bold text-amber-700">{formatCountdown(secondsLeft)}</p>
                    </div>
                  )}

                  {msg && (
                    <div className={`text-xs rounded-xl px-4 py-2.5 mb-4 text-center ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                      {msg.text}
                    </div>
                  )}

                  <button
                    onClick={handleClaim}
                    disabled={busy || !canClaim}
                    className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    {busy ? "กำลังดำเนินการ..." : canClaim ? `ขอ ${faucetDisplay} TCUT ฟรี` : `รอ ${formatCountdown(secondsLeft)}`}
                  </button>

                  <p className="text-xs text-gray-400 text-center mt-3">
                    ต้องใช้ Sepolia ETH เล็กน้อยเป็นค่า gas
                  </p>
                </>
              )}

              {tab === "buy" && (
                <>
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                    <span>อัตราแลก</span>
                    <span className="font-semibold text-gray-600">0.001 ETH = 10,000 TCUT</span>
                  </div>

                  <p className="text-xs text-gray-500 mb-1">
                    ยอด ETH ของคุณ: <span className="font-semibold text-gray-700">{ethBalanceDisplay} ETH</span>
                  </p>

                  <label className="block text-sm font-medium text-gray-700 mb-1.5">จำนวน ETH ที่จ่าย</label>
                  <div className="relative mb-3">
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={ethInput}
                      onChange={(e) => { setEthInput(e.target.value); setMsg(null); }}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="0.001"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">ETH</span>
                  </div>

                  <div className="flex gap-2 mb-4">
                    {["0.001", "0.002", "0.005", "0.01"].map((v) => (
                      <button
                        key={v}
                        onClick={() => { setEthInput(v); setMsg(null); }}
                        className={`flex-1 text-xs border rounded-lg py-1.5 transition-colors ${
                          ethInput === v
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold"
                            : "border-gray-200 hover:bg-gray-50 text-gray-500"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>

                  {tcutPreview > 0 && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 text-center">
                      <p className="text-xs text-emerald-600 mb-0.5">คุณจะได้รับ</p>
                      <p className="text-2xl font-bold text-emerald-700">{tcutPreview.toLocaleString()} TCUT</p>
                    </div>
                  )}

                  {msg && (
                    <div className={`text-xs rounded-xl px-4 py-2.5 mb-4 break-all ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                      {msg.text}
                    </div>
                  )}

                  <button
                    onClick={handleBuy}
                    disabled={busy || ethNum <= 0 || inventory === 0n}
                    className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    {busy ? "กำลังดำเนินการ..." : `ยืนยัน: ซื้อ ${tcutPreview > 0 ? tcutPreview.toLocaleString() + " " : ""}TCUT`}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
