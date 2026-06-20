import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Role } from "../types";
import {
  connectWallet,
  getConnectedWallet,
  getContractConfig,
  readWalletBalances,
  switchToConfiguredNetwork,
  type WalletState,
} from "../lib/web3";

type Props = {
  role: Role;
};

const roleLabel: Record<Role, string> = {
  developer: "Project Developer",
  verifier: "Verifier",
  buyer: "Buyer",
};

const roleBadge: Record<Role, string> = {
  developer: "bg-emerald-100 text-emerald-800",
  verifier: "bg-blue-100 text-blue-800",
  buyer: "bg-purple-100 text-purple-800",
};

function shorten(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function WalletBar({ role }: Props) {
  const navigate = useNavigate();
  const config = getContractConfig();
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [balance, setBalance] = useState("—");
  const [msg, setMsg] = useState("");

  async function refresh() {
    const w = await getConnectedWallet();
    setWallet(w);
    if (w) {
      try {
        const b = await readWalletBalances(w.provider, w.account);
        setBalance(b.tokenBalance);
      } catch {
        setBalance("Contract not configured");
      }
    }
  }

  useEffect(() => {
    void refresh();
    if (!window.ethereum?.on) return;
    const handler = () => void refresh();
    window.ethereum.on("accountsChanged", handler);
    window.ethereum.on("chainChanged", handler);
    return () => {
      window.ethereum?.removeListener?.("accountsChanged", handler);
      window.ethereum?.removeListener?.("chainChanged", handler);
    };
  }, []);

  async function connect() {
    try {
      const w = await connectWallet();
      setWallet(w);
      const b = await readWalletBalances(w.provider, w.account);
      setBalance(b.tokenBalance);
      setMsg("");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Connection failed");
    }
  }

  async function switchNet() {
    try {
      await switchToConfiguredNetwork();
      await refresh();
      setMsg(`Switched to ${config.rpcLabel}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Switch failed");
    }
  }

  const chainOk = wallet?.chainId === config.chainId;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        {/* Left: logo + role */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="text-lg font-bold text-gray-900 hover:text-emerald-600 transition-colors"
          >
            🌿 Carbon Market
          </button>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleBadge[role]}`}>
            {roleLabel[role]}
          </span>
        </div>

        {/* Right: wallet info */}
        <div className="flex items-center gap-2 flex-wrap">
          {wallet ? (
            <>
              <span className="text-xs text-gray-500 hidden sm:block">{balance}</span>
              <span
                className={`text-xs px-2 py-1 rounded font-mono ${chainOk ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}
              >
                {chainOk ? shorten(wallet.account) : `Wrong network (need ${config.rpcLabel})`}
              </span>
              {!chainOk && (
                <button
                  onClick={switchNet}
                  className="text-xs bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                >
                  Switch Network
                </button>
              )}
            </>
          ) : (
            <button
              onClick={connect}
              className="text-sm bg-emerald-600 text-white px-4 py-1.5 rounded-lg hover:bg-emerald-700 font-medium"
            >
              Connect MetaMask
            </button>
          )}
          <button
            onClick={() => navigate("/")}
            className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-2 py-1 rounded"
          >
            Switch Role
          </button>
        </div>
      </div>
      {msg && (
        <div className="bg-blue-50 text-blue-700 text-xs text-center py-1 px-4">{msg}</div>
      )}
    </header>
  );
}
