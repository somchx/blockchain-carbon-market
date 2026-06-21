import { Link } from "react-router-dom";
import { getContractConfig } from "../lib/web3";

const config = getContractConfig();

const roles = [
  {
    id: "developer",
    label: "Project Developer",
    thai: "นักพัฒนาโครงการ",
    icon: "🌱",
    accent: "emerald",
    description: "ยื่นโครงการลดคาร์บอน วางหลักประกัน อัปโหลดหลักฐาน และรับ Carbon Credit เมื่อผ่านการตรวจสอบ",
    actions: ["ประเมิน Risk Score จาก NASA POWER API", "วาง PLAT เป็น Stake Collateral", "อัปโหลดเอกสารขึ้น IPFS จริง", "ติดตามสถานะบน Blockchain"],
    gradient: "from-emerald-500 to-teal-600",
    border: "border-emerald-200 hover:border-emerald-400",
    bg: "hover:bg-emerald-50/50",
    btnColor: "bg-emerald-600 hover:bg-emerald-700",
  },
  {
    id: "verifier",
    label: "Verifier",
    thai: "ผู้ตรวจสอบ",
    icon: "🔍",
    accent: "blue",
    description: "ตรวจสอบข้อมูล climate signals, evidence IPFS และอนุมัติหรือปฏิเสธโครงการบน Blockchain โดยตรง",
    actions: ["วิเคราะห์ Risk Signals จากข้อมูลจริง", "เปิดไฟล์ Evidence จาก IPFS Gateway", "Approve / Reject ผ่าน Smart Contract", "ดู Trust Leaderboard"],
    gradient: "from-blue-500 to-indigo-600",
    border: "border-blue-200 hover:border-blue-400",
    bg: "hover:bg-blue-50/50",
    btnColor: "bg-blue-600 hover:bg-blue-700",
  },
  {
    id: "buyer",
    label: "Credit Buyer",
    thai: "ผู้ซื้อ Carbon Credit",
    icon: "🛒",
    accent: "violet",
    description: "เรียกดูโครงการที่ผ่านการรับรอง ซื้อ Carbon Credit ERC-1155 และ Retire เพื่อรับ NFT ใบรับรองการ offset",
    actions: ["ซื้อ Carbon Credit จาก Marketplace", "ดู Portfolio และยอดคงเหลือ", "Retire Credits เพื่อ offset จริง", "รับ ERC-721 NFT Certificate"],
    gradient: "from-violet-500 to-purple-600",
    border: "border-violet-200 hover:border-violet-400",
    bg: "hover:bg-violet-50/50",
    btnColor: "bg-violet-600 hover:bg-violet-700",
  },
];

const tools = [
  {
    to: "/explorer",
    icon: "🔭",
    title: "Traceability Explorer",
    description: "ดู full journey ของทุก Credit — Submit → Mint → Buy → Retire พร้อม tx hash และ IPFS proof",
    color: "border-sky-200 hover:border-sky-400 hover:bg-sky-50/40",
  },
  {
    to: "/dao",
    icon: "🏛️",
    title: "DAO Governance",
    description: "Vote เปลี่ยน Assessor, Platform Fee และ parameters ผ่าน On-Chain Governor ด้วย CGOV token",
    color: "border-purple-200 hover:border-purple-400 hover:bg-purple-50/40",
  },
  {
    to: "/oracle",
    icon: "🌤️",
    title: "Chainlink Oracle",
    description: "ข้อมูล NASA POWER (solar + precipitation) ถูกดึงผ่าน Chainlink Functions architecture และ store บน chain",
    color: "border-amber-200 hover:border-amber-400 hover:bg-amber-50/40",
  },
  {
    to: "/admin",
    icon: "📊",
    title: "Admin Dashboard",
    description: "ภาพรวมระบบ — Risk Distribution, Trust Leaderboard, สถิติโครงการ และ DAO Proposals",
    color: "border-gray-200 hover:border-gray-400 hover:bg-gray-50/60",
  },
];

const flow = [
  { n: "01", label: "Submit", desc: "Developer ยื่นโครงการ ระบบดึง climate data จาก NASA POWER คำนวณ Risk Score และ Required Stake อัตโนมัติ" },
  { n: "02", label: "Stake", desc: "Developer วาง PLAT Token เป็น collateral — stake สูงขึ้นเมื่อ risk สูง เพื่อลด incentive ข้อมูลเท็จ" },
  { n: "03", label: "Verify", desc: "Verifier ตรวจ signals, เปิด IPFS evidence และ publish assessment บน Blockchain ผ่าน MetaMask" },
  { n: "04", label: "Mint", desc: "ระบบ mint ERC-1155 Carbon Credit Token แยกตาม projectId และ list ใน marketplace พร้อมราคา" },
  { n: "05", label: "Trade & Retire", desc: "Buyer ซื้อเครดิต, ถือใน portfolio หรือ retire เพื่อ burn token และรับ ERC-721 NFT Certificate" },
  { n: "06", label: "Trace & Govern", desc: "ทุก event มี tx hash บน Etherscan ค้นหาใน Explorer หรือ vote เปลี่ยน parameter ผ่าน DAO" },
];

export default function RoleSelect() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🌿</span>
            <div>
              <p className="text-sm font-bold leading-none text-gray-900">Thailand Carbon Market</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Blockchain Carbon Credit Platform</p>
            </div>
          </div>
          <div className="flex gap-2 text-[11px]">
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-500 font-medium">{config.rpcLabel}</span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 font-medium border border-emerald-200">ERC-1155 · ERC-20 · ERC-721</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 space-y-10">

        {/* ── Hero ── */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-teal-50 border border-emerald-100 px-8 py-10 shadow-sm">
          <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: "repeating-linear-gradient(0deg,#000 0,#000 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#000 0,#000 1px,transparent 1px,transparent 40px)" }} />

          <div className="relative max-w-3xl">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-600">
              Research Prototype · Sepolia Testnet · Hardhat + Solidity
            </p>
            <h1 className="text-3xl font-bold leading-tight text-gray-900 sm:text-4xl">
              ตลาดคาร์บอนเครดิต<br />
              <span className="text-emerald-600">ที่ตรวจสอบได้จริง</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-gray-500">
              End-to-end carbon credit lifecycle บน Ethereum — ตั้งแต่ submit โครงการ, ประเมินความเสี่ยงด้วย NASA POWER API,
              เก็บหลักฐานบน IPFS, ซื้อขาย Token ไปจนถึงออก NFT ใบรับรองการ offset
            </p>

            <div className="mt-7 flex flex-wrap gap-6 text-sm">
              {[
                ["7", "Smart Contracts", "บน Sepolia"],
                ["3", "Token Standards", "ERC-1155 / 20 / 721"],
                ["51+", "Unit Tests", "Hardhat + Jest"],
              ].map(([num, label, sub]) => (
                <div key={label}>
                  <p className="text-2xl font-bold text-gray-900">{num}</p>
                  <p className="text-emerald-600 text-xs font-semibold">{label}</p>
                  <p className="text-gray-400 text-[11px]">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Role Cards ── */}
        <section>
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">เลือกบทบาทของคุณ</p>
            <h2 className="mt-1.5 text-2xl font-bold text-gray-900">เข้าสู่ Dashboard</h2>
            <p className="mt-1 text-sm text-gray-500">ใช้ wallet เดียวกันได้ทุก role — เลือกตาม flow ที่ต้องการ demo</p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {roles.map((role) => (
              <Link
                key={role.id}
                to={`/${role.id}`}
                className={`group relative flex flex-col rounded-2xl border-2 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${role.border} ${role.bg}`}
              >
                {/* colored top stripe */}
                <div className={`absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r ${role.gradient}`} />

                <div className="flex items-start justify-between">
                  <span className="text-4xl">{role.icon}</span>
                  <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{role.label}</span>
                </div>

                <h3 className="mt-4 text-xl font-bold text-gray-900">{role.thai}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-500 flex-1">{role.description}</p>

                <ul className="mt-4 space-y-1.5">
                  {role.actions.map((a) => (
                    <li key={a} className="flex items-start gap-2 text-xs text-gray-500">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gray-300" />
                      {a}
                    </li>
                  ))}
                </ul>

                <div className={`mt-5 rounded-xl py-2.5 text-center text-sm font-semibold text-white transition-colors ${role.btnColor}`}>
                  เข้าสู่ Dashboard →
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Manual Banner ── */}
        <Link
          to="/manual"
          className="flex items-center justify-between gap-4 rounded-2xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 hover:shadow-md hover:border-emerald-300 transition-all duration-150 group"
        >
          <div className="flex items-center gap-4">
            <span className="text-3xl">📘</span>
            <div>
              <p className="font-bold text-gray-900 text-sm">ใหม่ต่อ Carbon Credit บน Blockchain?</p>
              <p className="text-xs text-gray-500 mt-0.5">อ่านคู่มือการใช้งาน — อธิบายทีละขั้นตอน พร้อม diagram ภาษาเข้าใจง่าย</p>
            </div>
          </div>
          <span className="text-emerald-600 font-semibold text-sm whitespace-nowrap group-hover:translate-x-1 transition-transform">อ่านคู่มือ →</span>
        </Link>

        {/* ── Supporting Tools ── */}
        <section>
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">เครื่องมือประกอบ</p>
            <h2 className="mt-1.5 text-xl font-bold text-gray-900">Explorer · DAO · Oracle · Admin</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tools.map((tool) => (
              <Link
                key={tool.to}
                to={tool.to}
                className={`group flex flex-col gap-3 rounded-2xl border-2 bg-white p-5 shadow-sm transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 ${tool.color}`}
              >
                <span className="text-2xl">{tool.icon}</span>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{tool.title}</p>
                  <p className="mt-1 text-xs leading-5 text-gray-500">{tool.description}</p>
                </div>
                <span className="mt-auto text-xs font-medium text-gray-400 group-hover:text-gray-700 transition-colors">เปิด →</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── System Flow ── */}
        <section className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
          <div className="mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">System Flow</p>
            <h2 className="mt-1.5 text-xl font-bold text-gray-900">วงจรชีวิตของ Carbon Credit</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {flow.map((item, i) => (
              <div key={item.n} className="flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                  {i + 1}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{item.label}</p>
                  <p className="mt-1 text-xs leading-5 text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer bar ── */}
        <footer className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-6 py-4 text-xs text-gray-400 shadow-sm">
          <div className="flex flex-wrap gap-4">
            {[
              ["Market", "0x604058…4e4b"],
              ["GovDAO", "0x7F208C…79Db"],
              ["Oracle", "0xaa6D37…2c6"],
            ].map(([label, addr]) => (
              <span key={label} className="font-mono">
                <span className="text-gray-500 font-sans font-medium mr-1">{label}</span>{addr}
              </span>
            ))}
          </div>
          <span className="text-gray-400">Sepolia Testnet · 2026</span>
        </footer>

      </main>
    </div>
  );
}
