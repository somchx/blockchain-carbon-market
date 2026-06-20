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
  const [newSubId, setNewSubId] = useState("");

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

        // Load oracle results for all on-chain projects
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

  async function requestOracle(project: StoredProject) {
    if (!wallet) { setTxMsg("Connect wallet first"); return; }
    const onChainId = projectMap[project.id];
    if (!onChainId) { setTxMsg("Project not on-chain yet"); return; }
    const coords = PROVINCE_COORDS[project.input.province];
    if (!coords) { setTxMsg(`No coordinates for province: ${project.input.province}`); return; }

    setRequestStatus(prev => ({ ...prev, [project.id]: "pending" }));
    setTxMsg("");
    try {
      const { oracle } = await getContracts(wallet.provider);
      const tx = await oracle.requestOracleData(onChainId, coords.lat, coords.lon);
      await (tx as any).wait();
      setRequestStatus(prev => ({ ...prev, [project.id]: "fulfilled" }));
      setTxMsg(`✅ Oracle request sent for "${project.input.projectName}" (${project.input.province}: ${coords.lat}, ${coords.lon}) — Chainlink DON กำลังประมวลผล รอ ~1-3 นาที`);
      // Reload oracle results after delay
      setTimeout(() => void loadAll(), 15000);
    } catch (e) {
      setRequestStatus(prev => ({ ...prev, [project.id]: "error" }));
      setTxMsg(`❌ ${e instanceof Error ? e.message.slice(0, 200) : "Request failed"}`);
    }
  }

  async function updateSubId() {
    if (!wallet || !newSubId) return;
    try {
      const { oracle } = await getContracts(wallet.provider);
      const DON_ID = "0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000";
      const tx = await oracle.updateConfig(DON_ID, Number(newSubId), 300000);
      await (tx as any).wait();
      setSubId(newSubId);
      setTxMsg(`✅ Subscription ID updated to ${newSubId}`);
      setNewSubId("");
    } catch (e) {
      setTxMsg(`❌ ${e instanceof Error ? e.message.slice(0, 200) : "Update failed"}`);
    }
  }

  const isDeployer = wallet?.account.toLowerCase() === "0x2910a663a02c055a84f1d95904318ac265f50135";

  return (
    <div className="min-h-screen bg-gray-50">
      <WalletBar role="verifier" />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">🔮 Chainlink Oracle</h1>
          <p className="text-gray-500 text-sm mt-1">
            ดึงข้อมูล NASA POWER (solar irradiance + precipitation) บน Blockchain ผ่าน Chainlink Functions DON
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
                  <span className="font-mono text-xs text-gray-700">0xb83E...D954 (Sepolia)</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500">DON ID</span>
                  <span className="font-mono text-xs text-gray-700">fun-ethereum-sepolia-1</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-500">Subscription ID</span>
                  <span className={`font-bold ${subId === "0" || subId === "—" ? "text-red-500" : "text-emerald-600"}`}>
                    {subId === "0" ? "⚠️ Not configured" : subId}
                  </span>
                </div>
              </div>

              {/* Setup guide */}
              {(subId === "0" || subId === "—") && wallet && (
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                  <p className="font-semibold mb-2">⚙️ ต้องตั้งค่า Chainlink Subscription ก่อน:</p>
                  <ol className="space-y-1 text-xs list-decimal list-inside">
                    <li>ไปที่ <a href="https://functions.chain.link/sepolia" target="_blank" rel="noreferrer" className="text-blue-600 underline">functions.chain.link/sepolia</a></li>
                    <li>Create subscription → รับ Subscription ID</li>
                    <li>Fund ด้วย LINK จาก <a href="https://faucets.chain.link/sepolia" target="_blank" rel="noreferrer" className="text-blue-600 underline">faucets.chain.link/sepolia</a></li>
                    <li>Add Consumer: <span className="font-mono">{config.oracleAddress}</span></li>
                    <li>กรอก Subscription ID ด้านล่าง แล้ว Update</li>
                  </ol>
                </div>
              )}

              {isDeployer && wallet && (
                <div className="mt-4 flex gap-2">
                  <input
                    value={newSubId}
                    onChange={e => setNewSubId(e.target.value)}
                    placeholder="Subscription ID (e.g. 1234)"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  <button
                    disabled={!newSubId}
                    onClick={() => void updateSubId()}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-40">
                    Update Sub ID
                  </button>
                </div>
              )}
            </div>

            {/* How It Works */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 mb-6">
              <h2 className="text-sm font-semibold text-indigo-800 mb-3">🔗 วิธีการทำงาน</h2>
              <div className="flex flex-wrap gap-2 items-center text-xs text-indigo-700">
                {[
                  "1. Admin เรียก requestOracleData(projectId, lat, lon)",
                  "→",
                  "2. Chainlink DON รัน JavaScript (fetch NASA POWER API)",
                  "→",
                  "3. DON consensus → fulfillRequest() on-chain",
                  "→",
                  "4. solarIrradiance + precipitation บันทึกลง Blockchain",
                ].map((s, i) => (
                  <span key={i} className={s === "→" ? "text-indigo-400 font-bold" : "bg-white px-2 py-1 rounded-lg border border-indigo-200"}>
                    {s}
                  </span>
                ))}
              </div>
              <p className="text-xs text-indigo-600 mt-2">
                ข้อมูลจาก NASA POWER API ถูกดึงโดย Chainlink Decentralized Oracle Network — ไม่ได้ผ่าน Backend ของเรา ✅
              </p>
            </div>

            {/* Projects with Oracle Data */}
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              โครงการที่ Submit On-Chain แล้ว
            </h2>

            {!wallet && (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 text-gray-400">
                <p className="text-3xl mb-2">🔌</p>
                <p>Connect MetaMask เพื่อ Request Oracle Data</p>
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

                    {/* Oracle Results */}
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
                          {" · "}Stored on Sepolia blockchain permanently
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-xl p-4 mb-4 text-center text-sm text-gray-400">
                        ยังไม่มีข้อมูล — กด Request เพื่อให้ Chainlink DON ดึง NASA POWER data
                      </div>
                    )}

                    {/* Request Button */}
                    {wallet && coords && (
                      <button
                        disabled={status === "pending" || subId === "0" || subId === "—"}
                        onClick={() => void requestOracle(project)}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 bg-indigo-600 text-white hover:bg-indigo-700">
                        {status === "pending"
                          ? "⏳ Requesting..."
                          : result?.fulfilled
                          ? "🔄 Re-fetch from NASA via Chainlink"
                          : "🔮 Request Oracle Data (LINK required)"}
                      </button>
                    )}
                    {!coords && (
                      <p className="text-xs text-amber-600 text-center">Province coordinates not mapped: {project.input.province}</p>
                    )}
                    {(subId === "0" || subId === "—") && (
                      <p className="text-xs text-red-500 text-center mt-1">⚠️ ต้องตั้งค่า Chainlink Subscription ID ก่อน</p>
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
              <p className="text-gray-400 mb-3 font-sans text-xs font-semibold uppercase tracking-wide">Oracle JavaScript Source (runs in Chainlink DON)</p>
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
