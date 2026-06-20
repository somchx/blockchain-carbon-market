import { Link, useNavigate } from "react-router-dom";

const roles = [
  {
    id: "developer",
    label: "Project Developer",
    thai: "นักพัฒนาโครงการ",
    icon: "🌱",
    description: "ส่งโครงการลดคาร์บอน วาง Stake และติดตามสถานะการตรวจสอบ",
    color: "border-emerald-400 hover:bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-800",
    actions: ["Submit Project", "Upload Evidence", "Stake Collateral", "Track Status"],
  },
  {
    id: "verifier",
    label: "Verifier",
    thai: "ผู้ตรวจสอบ",
    icon: "🔍",
    description: "ตรวจสอบข้อมูลโครงการ วิเคราะห์ Risk Score และอนุมัติหรือปฏิเสธบน Blockchain",
    color: "border-blue-400 hover:bg-blue-50",
    badge: "bg-blue-100 text-blue-800",
    actions: ["Review Risk Signals", "Check Evidence", "Approve On-Chain", "Reject with Comment"],
  },
  {
    id: "buyer",
    label: "Buyer",
    thai: "ผู้ซื้อ Carbon Credit",
    icon: "🛒",
    description: "เรียกดูและซื้อ Carbon Credit Token จากโครงการที่ผ่านการตรวจสอบ",
    color: "border-purple-400 hover:bg-purple-50",
    badge: "bg-purple-100 text-purple-800",
    actions: ["Browse Marketplace", "Buy Credits", "View Portfolio", "Retire Credits"],
  },
];

export default function RoleSelect() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌿</span>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-none">Thailand Carbon Market</h1>
              <p className="text-xs text-gray-500">High-Integrity Blockchain Carbon Credit Platform</p>
            </div>
          </div>
          <div className="flex gap-2 text-xs text-gray-400">
            <span className="bg-gray-100 px-2 py-1 rounded">Hardhat Local</span>
            <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded">ERC-1155</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <p className="text-sm font-semibold text-emerald-600 tracking-widest uppercase mb-2">
            Blockchain • DeFi • Carbon Credits
          </p>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            เข้าสู่ระบบในฐานะ
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            เลือก Role ของคุณเพื่อเข้าถึง Dashboard ที่เหมาะสม
            ทุก transaction จะถูกบันทึกบน Blockchain อย่างโปร่งใส
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => navigate(`/${role.id}`)}
              className={`
                bg-white rounded-2xl border-2 p-6 text-left transition-all duration-200 shadow-sm
                hover:shadow-lg hover:-translate-y-1 cursor-pointer ${role.color}
              `}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-4xl">{role.icon}</span>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${role.badge}`}>
                  {role.label}
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">{role.thai}</h3>
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">{role.description}</p>
              <ul className="space-y-1">
                {role.actions.map((a) => (
                  <li key={a} className="text-xs text-gray-400 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-gray-300 inline-block" />
                    {a}
                  </li>
                ))}
              </ul>
              <div className="mt-5 text-center">
                <span className="inline-block text-sm font-semibold text-white bg-gray-800 px-5 py-2 rounded-lg w-full">
                  เข้าสู่ Dashboard →
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Traceability Explorer link */}
        <div className="mt-6 w-full max-w-5xl">
          <Link
            to="/explorer"
            className="flex items-center justify-between bg-white border border-gray-200 rounded-2xl px-6 py-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔍</span>
              <div>
                <p className="font-semibold text-gray-900">Traceability Explorer</p>
                <p className="text-sm text-gray-500">ดู full journey ของ Carbon Credit Token บน Blockchain — tx hash, IPFS evidence, block timestamps</p>
              </div>
            </div>
            <span className="text-gray-300 group-hover:text-blue-400 text-xl transition-colors">→</span>
          </Link>
        </div>

        {/* DAO Governance link */}
        <div className="mt-3 w-full max-w-5xl">
          <Link
            to="/dao"
            className="flex items-center justify-between bg-white border border-gray-200 rounded-2xl px-6 py-4 shadow-sm hover:shadow-md hover:border-purple-300 transition-all group"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏛️</span>
              <div>
                <p className="font-semibold text-gray-900">DAO Governance Portal</p>
                <p className="text-sm text-gray-500">Vote เปลี่ยน Assessor, Platform Fee และ parameters ผ่าน On-Chain DAO — CGOV token holders only</p>
              </div>
            </div>
            <span className="text-gray-300 group-hover:text-purple-400 text-xl transition-colors">→</span>
          </Link>
        </div>

        {/* Flow diagram */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 w-full max-w-5xl">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">System Flow</p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            {[
              { step: "1", label: "Submit Project", icon: "📋", role: "Developer" },
              { step: "2", label: "Stake Collateral", icon: "🔒", role: "Developer" },
              { step: "3", label: "Verify & Approve", icon: "✅", role: "Verifier" },
              { step: "4", label: "Mint Carbon Token", icon: "🪙", role: "Auto" },
              { step: "5", label: "Buy in Marketplace", icon: "🛒", role: "Buyer" },
              { step: "6", label: "Settle on-chain", icon: "⛓️", role: "Smart Contract" },
              { step: "7", label: "Reputation Update", icon: "⭐", role: "Auto" },
            ].map((item, i, arr) => (
              <div key={item.step} className="flex items-center gap-2">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg mb-1">
                    {item.icon}
                  </div>
                  <p className="text-xs font-medium text-gray-700 w-20 leading-tight">{item.label}</p>
                  <p className="text-[10px] text-gray-400">{item.role}</p>
                </div>
                {i < arr.length - 1 && (
                  <span className="text-gray-300 text-lg mb-4">→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
