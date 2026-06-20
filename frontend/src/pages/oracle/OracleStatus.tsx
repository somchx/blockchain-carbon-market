import { useEffect, useState } from "react";
import WalletBar from "../../components/WalletBar";
import { getConnectedWallet, getContractConfig, getContracts, type WalletState } from "../../lib/web3";
import { loadProjectMap } from "../../lib/storage";
import type { StoredProject } from "../../types";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";
const config = getContractConfig();

// Province → lat/lon mapping (matches backend dataAggregator.ts)
const PROVINCE_COORDS: Record<string, { lat: string; lon: string }> = {
  ChiangMai:  { lat: "18.79", lon: "98.98" },
  Bangkok:    { lat: "13.75", lon: "100.49" },
  KhonKaen:  { lat: "16.43", lon: "102.83" },
  SuratThani: { lat: "9.14",  lon: "99.33" },
  Chonburi:   { lat: "13.37", lon: "101.01" },
  Phuket:     { lat: "7.89",  lon: "98.40" },
};

type OracleResult = {
  solarScaled: number;  // × 100
  precipScaled: number; // × 100
  fulfilledAt: number;
  fulfilled: boolean;
};

type RequestStatus = "idle" | "pending" | "fulfilled" | "error";

export default function OracleStatus() {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [projects, setProjects] = useState<StoredProject[]>([]);
  const [oracleResults, setOracleResults] = useState<Record<string, OracleResult>>({});
  const [subId, setSubId] = useState<string>("—");
  const [pageLoading, setPageLoading] = useState(true);
  const [requestStatus, setRequestStatus] = useState<Record<string, RequestStatus>>({});
  const [txMsg, setTxMsg] = useState("");

  const projectMap = loadProjectMap();

  async function loadAll() {
    const [w, projRes] = await Promise.all([
      getConnectedWallet(),
      fetch(`${apiBase}/projects`)
    ]);
    setWallet(w);
    if (projRes.ok) setProjects(await projRes.json() as StoredProject[]);

    if (w) {
      try {
        const { oracle } = await getContracts(w.provider);
        const sid = await oracle.subscriptionId();
        setSubId(sid.toString());

        const results: Record<string, OracleResult> = {};
        await Promise.all(
          Object.entries(projectMap).map(async ([localId, onChainId]) => {
            try {
              const [solar, precip, ts, ok] = await oracle.getOracleData(onChainId);
              results[localId] = {
                solarScaled: Number(solar),
                precipScaled: Number(precip),
                fulfilledAt: Number(ts),
                fulfilled: Boolean(ok),
              };
            } catch {}
          })
        );
        setOracleResults(results);
      } catch {}
    }
  }

  useEffect(() => {
    loadAll().finally(() => setPageLoading(false));
  }, []);

  // Simulate oracle: fetch real NASA data from backend, then call ownerFulfill on-chain
  async function simulateOracle(project: StoredProject) {
    if (!wallet) { setTxMsg("Connect wallet first"); return; }
    const onChainId = projectMap[project.id];
    if (!onChainId) { setTxMsg("Project not on-chain yet"); return; }
    const coords = PROVINCE_COORDS[project.input.province];
    if (!coords) { setTxMsg(`No coordinates for province: ${project.input.province}`); return; }

    setRequestStatus(prev => ({ ...prev, [project.id]: "pending" }));
    setTxMsg(`⏳ กำลังดึงข้อมูลจาก NASA POWER API (${project.input.province}: ${coords.lat}°N, ${coords.lon}°E)...`);

    try {
      // 1. Fetch real NASA POWER data from backend
      const climateRes = await fetch(`${apiBase}/oracle/climate?lat=${coords.lat}&lon=${coords.lon}`);
      if (!climateRes.ok) {
        const err = await climateRes.json() as { message?: string };
        throw new Error(err.message ?? "Backend fetch failed");
      }
      const climateData = await climateRes.json() as {
        solarScaled: number;
        precipScaled: number;
        solar: number;
        precip: number;
      };

      setTxMsg(`⏳ NASA POWER: solar=${climateData.solar.toFixed(2)} kWh/m²/day, precip=${climateData.precip.toFixed(2)} mm/day — กำลัง submit on-chain...`);

      // 2. Call ownerFulfill to write data on-chain
      const { oracle } = await getContracts(wallet.provider);
      const tx = await oracle.ownerFulfill(onChainId, climateData.solarScaled, climateData.precipScaled);
      await (tx as any).wait();

      setRequestStatus(prev => ({ ...prev, [project.id]: "fulfilled" }));
      setTxMsg(`✅ Oracle data stored on-chain for "${project.input.projectName}" — Solar: ${climateData.solar.toFixed(2)} kWh/m²/day, Precip: ${climateData.precip.toFixed(2)} mm/day (NASA POWER Climatology, ${project.input.province})`);
      setTimeout(() => void loadAll(), 3000);
    } catch (e) {
      setRequestStatus(prev => ({ ...prev, [project.id]: "error" }));
      setTxMsg(`❌ ${e instanceof Error ? e.message.slice(0, 200) : "Simulation failed"}`);
    }
  }

  const isDeployer = wallet?.account.toLowerCase() === "0x2910a663a02c055a84f1d95904318ac265f50135";

  return (
    <div className="min-h-screen bg-gray-50">
      <WalletBar role="verifier" />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">🔮 Chainlink Oracle</h1>
          <p className="text-gray-500 text-sm mt-1">
            NASA POWER climate data (solar irradiance + precipitation) stored permanently on Blockchain
          </p>
        </div>

        {/* Chainlink Functions sunset warning */}
        <div className="mb-5 bg-amber-50 border border-amber-300 rounded-xl p-4 text-sm text-amber-900">
          <p className="font-bold mb-1">⚠️ Chainlink Functions Testnet — Sunset June 15, 2026</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            Chainlink Functions on Sepolia sunsetted June 15, 2026. การ Request ผ่าน DON ไม่สามารถทำได้อีก
            แต่ contract architecture ยังคงสมบูรณ์ — ใช้ <strong>Simulate Oracle</strong> แทน:
            backend จะดึงข้อมูลจาก NASA POWER API จริง แล้ว owner submit on-chain ผ่าน <code className="bg-amber-100 px-1 rounded">ownerFulfill()</code>
          </p>
          <p className="text-xs text-amber-600 mt-1">
            Production: ใช้ Chainlink Runtime Environment (CRE) ซึ่งเป็น successor ของ Functions ·{" "}
            <a href="https://docs.chain.link/chainlink-runtime-environment" target="_blank" rel="noreferrer" className="underline">docs.chain.link/chainlink-runtime-environment</a>
          </p>
        </div>

        {txMsg && (
          <div className={`mb-5 p-3 rounded-lg text-sm border ${txMsg.startsWith("✅") ? "bg-emerald-50 border-emerald-200 text-emerald-800" : txMsg.startsWith("❌") ? "bg-red-50 border-red-200 text-red-700" : "bg-blue-50 border-blue-200 text-blue-700"}`}>
            {txMsg}
          </div>
        )}

        {pageLoading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        )}

        {!pageLoading && (
          <>
            {/* Oracle Contract Info */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Oracle Contract Info</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500">Contract Address</span>
                  <a href={`${config.explorerBaseUrl}/address/${config.oracleAddress}`}
                    target="_blank" rel="noreferrer"
                    className="font-mono text-blue-600 hover:underline text-xs">
                    {config.oracleAddress ?? "Not configured"}
                  </a>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500">Chainlink Functions Router</span>
                  <span className="font-mono text-xs text-gray-400 line-through">0xb83E...D954 (sunset)</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500">DON ID</span>
                  <span className="font-mono text-xs text-gray-400 line-through">fun-ethereum-sepolia-1 (sunset)</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-500">Mode</span>
                  <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    ownerFulfill (Demo Mode)
                  </span>
                </div>
              </div>
            </div>

            {/* How It Works */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 mb-6">
              <h2 className="text-sm font-semibold text-indigo-800 mb-3">🔗 Architecture (Chainlink Functions Pattern)</h2>
              <div className="flex flex-wrap gap-2 items-center text-xs text-indigo-700 mb-3">
                {[
                  "1. requestOracleData(projectId, lat, lon)",
                  "→",
                  "2. Chainlink DON รัน JS (fetch NASA POWER)",
                  "→",
                  "3. DON consensus → fulfillRequest()",
                  "→",
                  "4. solar + precip บน Blockchain",
                ].map((s, i) => (
                  <span key={i} className={s === "→" ? "text-indigo-400 font-bold" : "bg-white px-2 py-1 rounded-lg border border-indigo-200"}>
                    {s}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 items-center text-xs text-emerald-700">
                {[
                  "Demo: backend fetch NASA POWER API",
                  "→",
                  "ownerFulfill(projectId, solarScaled, precipScaled)",
                  "→",
                  "OracleFulfilled event + data on-chain ✅",
                ].map((s, i) => (
                  <span key={i} className={s === "→" ? "text-emerald-400 font-bold" : "bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200"}>
                    {s}
                  </span>
                ))}
              </div>
              <p className="text-xs text-indigo-500 mt-2">
                ข้อมูล NASA POWER เป็น Real Data จาก NASA — เพียงแต่ขั้นตอน DON consensus ถูก replace ด้วย ownerFulfill()
              </p>
            </div>

            {/* Projects */}
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              โครงการที่ Submit On-Chain แล้ว
            </h2>

            {!wallet && (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 text-gray-400">
                <p className="text-3xl mb-2">🔌</p>
                <p>Connect MetaMask (deployer wallet) เพื่อ Simulate Oracle Data</p>
              </div>
            )}

            <div className="space-y-4">
              {projects.filter(p => projectMap[p.id]).map(project => {
                const onChainId = projectMap[project.id];
                const result = oracleResults[project.id];
                const coords = PROVINCE_COORDS[project.input.province];
                const status = requestStatus[project.id] ?? "idle";

                return (
                  <div key={project.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-gray-900">{project.input.projectName}</p>
                        <p className="text-xs text-gray-500">
                          {project.input.province} · On-chain #{onChainId}
                          {coords && <span className="ml-2 font-mono text-gray-400">{coords.lat}°N, {coords.lon}°E</span>}
                        </p>
                      </div>
                      {result?.fulfilled ? (
                        <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-3 py-1 rounded-full">✅ Oracle Data On-Chain</span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-500 font-semibold px-3 py-1 rounded-full">⏳ No Oracle Data</span>
                      )}
                    </div>

                    {result?.fulfilled ? (
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
                          <p className="text-xs text-yellow-600 mb-1">☀️ Solar Irradiance</p>
                          <p className="text-xl font-bold text-yellow-800">
                            {(result.solarScaled / 100).toFixed(2)}
                          </p>
                          <p className="text-xs text-yellow-500">kWh/m²/day</p>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                          <p className="text-xs text-blue-600 mb-1">🌧️ Precipitation</p>
                          <p className="text-xl font-bold text-blue-800">
                            {(result.precipScaled / 100).toFixed(2)}
                          </p>
                          <p className="text-xs text-blue-500">mm/day</p>
                        </div>
                        <div className="col-span-2 bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-500 text-center">
                          Fulfilled at: {new Date(result.fulfilledAt * 1000).toLocaleString("th-TH")}
                          {" · "}NASA POWER Climatology · Stored on Sepolia permanently
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-xl p-4 mb-4 text-center text-sm text-gray-400">
                        ยังไม่มีข้อมูล — กด Simulate เพื่อดึง NASA POWER data แล้ว store on-chain
                      </div>
                    )}

                    {wallet && coords && isDeployer && (
                      <button
                        disabled={status === "pending"}
                        onClick={() => void simulateOracle(project)}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 bg-emerald-600 text-white hover:bg-emerald-700">
                        {status === "pending"
                          ? "⏳ Fetching NASA POWER → Submitting on-chain..."
                          : result?.fulfilled
                          ? "🔄 Re-fetch NASA POWER + Update On-Chain"
                          : "🌍 Simulate Oracle — Fetch Real NASA POWER Data"}
                      </button>
                    )}
                    {wallet && !isDeployer && (
                      <p className="text-xs text-amber-600 text-center mt-1">⚠️ ต้องใช้ Deployer Wallet (0x2910…) เพื่อ submit oracle data</p>
                    )}
                    {!coords && (
                      <p className="text-xs text-amber-600 text-center">Province coordinates not mapped: {project.input.province}</p>
                    )}
                  </div>
                );
              })}

              {projects.filter(p => projectMap[p.id]).length === 0 && wallet && (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 text-gray-400">
                  <p className="text-3xl mb-2">📋</p>
                  <p>ยังไม่มีโครงการที่ Submit On-Chain — ไปที่ Developer Dashboard ก่อน</p>
                </div>
              )}
            </div>

            {/* Oracle JS Source Preview */}
            <div className="mt-8 bg-gray-900 rounded-2xl p-5 text-xs font-mono overflow-x-auto">
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-400 font-sans text-xs font-semibold uppercase tracking-wide">Oracle JavaScript Source (designed for Chainlink DON)</p>
                <span className="text-xs bg-amber-900 text-amber-300 px-2 py-0.5 rounded font-sans">Sunset — runs via ownerFulfill() in demo</span>
              </div>
              <pre className="text-green-300 whitespace-pre-wrap leading-relaxed">{`const lat = args[0]; // e.g. "13.75"
const lon = args[1]; // e.g. "100.49"

const response = await Functions.makeHttpRequest({
  url: \`https://power.larc.nasa.gov/api/temporal/climatology/point
    ?parameters=ALLSKY_SFC_SW_DWN,PRECTOTCORR
    &community=RE&longitude=\${lon}&latitude=\${lat}&format=JSON\`,
  timeout: 9000
});

const solar = response.data.properties.parameter.ALLSKY_SFC_SW_DWN.ANN;
const precip = response.data.properties.parameter.PRECTOTCORR.ANN;

// Pack into uint256: solarInt * 100000 + precipInt
const packed = Math.round(solar * 100) * 100000 + Math.round(precip * 100);

return Functions.encodeUint256(packed); // returned to fulfillRequest()`}</pre>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
