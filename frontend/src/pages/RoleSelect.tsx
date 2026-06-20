import { Link } from "react-router-dom";
import { getContractConfig } from "../lib/web3";

const roles = [
  {
    id: "developer",
    label: "Project Developer",
    thai: "นักพัฒนาโครงการ",
    icon: "🌱",
    description: "ส่งโครงการลดคาร์บอน วาง Stake และติดตามสถานะการตรวจสอบ",
    color: "border-emerald-300/70 hover:border-emerald-200 hover:bg-emerald-400/10",
    badge: "bg-emerald-300/15 text-emerald-100",
    actions: ["Submit Project", "Upload Evidence", "Stake Collateral", "Track Status"],
  },
  {
    id: "verifier",
    label: "Verifier",
    thai: "ผู้ตรวจสอบ",
    icon: "🔍",
    description: "ตรวจสอบข้อมูลโครงการ วิเคราะห์ Risk Score และอนุมัติหรือปฏิเสธบน Blockchain",
    color: "border-sky-300/70 hover:border-sky-200 hover:bg-sky-400/10",
    badge: "bg-sky-300/15 text-sky-100",
    actions: ["Review Risk Signals", "Check Evidence", "Approve On-Chain", "Reject with Comment"],
  },
  {
    id: "buyer",
    label: "Buyer",
    thai: "ผู้ซื้อ Carbon Credit",
    icon: "🛒",
    description: "เรียกดูและซื้อ Carbon Credit Token จากโครงการที่ผ่านการตรวจสอบ",
    color: "border-amber-300/70 hover:border-amber-200 hover:bg-amber-400/10",
    badge: "bg-amber-300/15 text-amber-100",
    actions: ["Browse Marketplace", "Buy Credits", "View Portfolio", "Retire Credits"],
  },
];

const valueProps = [
  {
    title: "โปร่งใส ตรวจสอบได้",
    description: "ทุกการ submit, verify, mint, buy และ retire มี event, tx hash และ block timestamp ให้ย้อนตรวจสอบได้จริงบน Sepolia",
  },
  {
    title: "หลักฐานไม่หาย",
    description: "Evidence ถูกอัปโหลดขึ้น IPFS ผ่าน Pinata และผูกกับข้อมูล on-chain ทำให้พิสูจน์ได้ว่าไฟล์ไม่ถูกแก้ไข",
  },
  {
    title: "ลดการพึ่งคนกลาง",
    description: "การอนุมัติ, stake, reward/slash, DAO governance และ retire certificate ถูกคุมด้วย smart contract แทนการจดบันทึกแบบปิด",
  },
];

const systemSteps = [
  { step: "01", title: "Submit", description: "Developer ส่งข้อมูลโครงการ พร้อมคำนวณ risk score และ required stake จาก climate data จริง" },
  { step: "02", title: "Stake", description: "ผู้พัฒนาโครงการวาง PLAT เป็นหลักประกันเพื่อลด incentive ของข้อมูลเท็จ" },
  { step: "03", title: "Verify", description: "Verifier ตรวจเอกสาร, risk signals และ publish assessment บน blockchain" },
  { step: "04", title: "Mint & List", description: "ระบบ mint Carbon Credit แบบ ERC-1155 แยกตาม projectId และลงขายใน marketplace" },
  { step: "05", title: "Buy & Retire", description: "Buyer ซื้อเครดิต, ถือใน portfolio หรือ retire เพื่อ mint NFT certificate เป็นหลักฐาน offset" },
  { step: "06", title: "Trace & Govern", description: "ทุกฝ่ายค้นหา full journey ใน explorer และเปลี่ยนพารามิเตอร์ผ่าน DAO ได้" },
];

const quickStart = [
  "เชื่อม MetaMask กับเครือข่าย Sepolia และเตรียม ETH สำหรับค่า gas",
  "เลือกบทบาทที่ต้องการใช้งาน: Developer, Verifier หรือ Buyer",
  "Developer ส่งโครงการ, ประเมินความเสี่ยง, stake และอัปโหลดเอกสารหลักฐาน",
  "Verifier ตรวจสอบข้อมูลจาก dashboard แล้ว approve/reject บน chain",
  "Buyer เข้า marketplace เพื่อซื้อ carbon credits, retire และรับ NFT certificate",
];

const manualSections = [
  {
    title: "เว็บนี้คืออะไร",
    description:
      "แพลตฟอร์มต้นแบบสำหรับตลาดคาร์บอนเครดิตบน blockchain ที่เชื่อมการประเมินความเสี่ยงจากข้อมูลจริง, การเก็บหลักฐานบน IPFS, การซื้อขาย token และการออกใบรับรองการ retire แบบตรวจสอบย้อนหลังได้ทั้งหมด",
  },
  {
    title: "ทำไมต้องมี",
    description:
      "ตลาดคาร์บอนแบบเดิมมักมีปัญหาเรื่องความโปร่งใส, หลักฐานกระจัดกระจาย, ตรวจสอบย้อนหลังยาก และเสี่ยง double counting ระบบนี้ออกแบบมาเพื่อให้ทุกขั้นมีร่องรอยพิสูจน์ได้ทั้ง on-chain และ off-chain",
  },
  {
    title: "ใช้งานยังไง",
    description:
      "เริ่มจากเลือก role ด้านล่าง จากนั้นทำตาม flow ของแต่ละหน้าจอ โดยหน้า Developer สำหรับสร้าง supply, Verifier สำหรับอนุมัติ, Buyer สำหรับซื้อและ retire ส่วน Explorer/DAO/Oracle/Admin ใช้สำหรับตรวจสอบและบริหารระบบ",
  },
];

const guideLinks = [
  { to: "/manual", icon: "📘", title: "คู่มือการใช้งาน", description: "คู่มือแบบละเอียดตั้งแต่เตรียม MetaMask, submit โครงการ, verify, buy, retire ไปจนถึงการแก้ปัญหาเบื้องต้น" },
  { to: "/explorer", icon: "🧭", title: "Traceability Explorer", description: "ค้นหา project หรือ token แล้วดู full event timeline, tx hash และ IPFS evidence" },
  { to: "/dao", icon: "🏛️", title: "DAO Portal", description: "ใช้ CGOV เพื่อ delegate, สร้าง proposal และโหวตเปลี่ยน parameter ของระบบ" },
  { to: "/oracle", icon: "🌤️", title: "Oracle View", description: "ดูการเชื่อมข้อมูล climate จริงจาก NASA POWER และ flow ของ oracle integration" },
  { to: "/admin", icon: "📊", title: "Admin Dashboard", description: "ดูภาพรวมระบบ, distribution ของความเสี่ยง, leaderboard และสถานะ proposal" },
];

export default function RoleSelect() {
  const config = getContractConfig();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌿</span>
            <div>
              <p className="text-lg font-bold leading-none text-gray-900">Thailand Carbon Market</p>
              <p className="text-xs text-gray-500">High-Integrity Blockchain Carbon Credit Platform</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-gray-600">{config.rpcLabel}</span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">ERC-1155 / ERC-20 / ERC-721</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
            <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
              Blockchain • Carbon Credits • Traceability
            </p>
            <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-4">
              ตลาดคาร์บอนเครดิตที่อธิบายได้ ตรวจสอบได้ และเดโมครบทั้งวงจร
            </h1>
            <p className="text-gray-500 text-sm leading-7 max-w-3xl">
              เว็บนี้คือแพลตฟอร์มต้นแบบสำหรับ submit โครงการลดคาร์บอน, ตรวจสอบความเสี่ยงจากข้อมูลจริง,
              อัปโหลดหลักฐานขึ้น IPFS, mint carbon credits, ซื้อขายใน marketplace, retire credits
              และออก NFT certificate บน Sepolia Testnet แบบ end-to-end
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href="#roles"
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 font-medium text-sm transition-colors"
              >
                เริ่มใช้งานตามบทบาท
              </a>
              <a
                href="#guide"
                className="bg-white text-gray-700 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium text-sm transition-colors"
              >
                ดูคู่มือใช้งาน
              </a>
              <Link
                to="/explorer"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
              >
                เปิด Explorer
              </Link>
              <Link
                to="/manual"
                className="bg-white text-gray-700 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium text-sm transition-colors"
              >
                คู่มือแบบละเอียด
              </Link>
            </div>
            </div>

            <div className="grid gap-4">
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Why This Exists</p>
              <p className="mt-2 text-lg font-semibold text-gray-900">ลดปัญหา double counting และช่องว่างความเชื่อมั่น</p>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                ระบบนี้ทำให้ข้อมูลโครงการ, หลักฐาน, การอนุมัติ, การซื้อขาย และการ retire มีร่องรอยเดียวกันทั้งฝั่ง web2 และ blockchain
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <p className="text-2xl font-bold text-gray-900">7</p>
                <p className="mt-1 text-xs text-gray-500">Smart contracts และ pages พร้อม demo flow</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <p className="text-2xl font-bold text-gray-900">IPFS</p>
                <p className="mt-1 text-xs text-gray-500">Evidence pinning จริงผ่าน Pinata พร้อม CID</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <p className="text-2xl font-bold text-gray-900">DAO</p>
                <p className="mt-1 text-xs text-gray-500">Governance portal สำหรับปรับ parameter แบบ on-chain</p>
              </div>
            </div>
          </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {manualSections.map((section, index) => (
            <article
              key={section.title}
              className={`bg-white rounded-2xl border p-5 shadow-sm ${
                index === 0 ? "border-blue-200 bg-blue-50" : index === 1 ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-white"
              }`}
            >
              <p className="text-base font-semibold text-gray-900">{section.title}</p>
              <p className="mt-2 text-sm leading-6 text-gray-500">{section.description}</p>
            </article>
          ))}
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Value Proposition</p>
              <h2 className="mt-2 text-2xl font-bold text-gray-900">ทำไมการใช้ blockchain กับ carbon market ถึงมีประโยชน์</h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-gray-500">
              แกนของระบบนี้ไม่ใช่แค่ “เอา token มาแปะ” แต่คือการทำให้ตลาดคาร์บอนมี audit trail ที่ทุกฝ่ายเห็นตรงกัน
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {valueProps.map((item) => (
              <div key={item.title} className="bg-gray-50 rounded-2xl border border-gray-200 p-5">
                <p className="text-base font-semibold text-gray-900">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-gray-500">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">System Flow</p>
              <h2 className="mt-2 text-2xl font-bold text-gray-900">ระบบทำงานยังไงตั้งแต่ต้นจนจบ</h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-gray-500">
              flow นี้อ้างอิงจากแผน MVP ในเอกสารและจัดวางให้พร้อมสำหรับการ demo จริงในหน้าเว็บ
            </p>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {systemSteps.map((item) => (
              <div key={item.step} className="bg-gray-50 rounded-2xl border border-gray-200 p-5">
                <p className="text-xs font-semibold tracking-wide text-gray-500">{item.step}</p>
                <p className="mt-2 text-lg font-semibold text-gray-900">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-gray-500">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="roles" className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Choose A Role</p>
            <h2 className="mt-2 text-2xl font-bold text-gray-900">เริ่มใช้งานตามบทบาทของคุณ</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
              ทุก role ใช้ wallet เดียวกันได้ แต่เห็นเครื่องมือคนละชุดเพื่อเล่าเรื่องของตลาดคาร์บอนให้ครบทุกฝั่ง
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-3">
          {roles.map((role) => (
            <Link
              key={role.id}
              to={`/${role.id}`}
              className={`
                rounded-2xl border bg-white p-6 text-left transition-all duration-200 shadow-sm
                hover:shadow-md ${role.color}
              `}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-4xl">{role.icon}</span>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${role.badge}`}>
                  {role.label}
                </span>
              </div>
              <h3 className="mb-2 text-xl font-bold text-gray-900">{role.thai}</h3>
              <p className="mb-6 text-sm leading-7 text-gray-500">{role.description}</p>
              <ul className="space-y-1">
                {role.actions.map((a) => (
                  <li key={a} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="inline-block h-1 w-1 rounded-full bg-gray-300" />
                    {a}
                  </li>
                ))}
              </ul>
              <div className="mt-5 text-center">
                <span className="inline-block w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
                  เข้าสู่ Dashboard →
                </span>
              </div>
            </Link>
          ))}
          </div>
        </section>

        <section id="guide" className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Quick Manual</p>
            <h2 className="mt-2 text-2xl font-bold text-gray-900">คู่มือเริ่มใช้งานแบบเร็ว</h2>
            <ol className="mt-5 space-y-4">
              {quickStart.map((item, index) => (
                <li key={item} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                    {index + 1}
                  </span>
                  <p className="pt-0.5 text-sm leading-6 text-gray-500">{item}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Supporting Views</p>
            <h2 className="mt-2 text-2xl font-bold text-gray-900">หน้าประกอบสำหรับ demo และตรวจสอบระบบ</h2>
            <div className="mt-5 grid gap-4">
              {guideLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 transition hover:border-gray-300 hover:bg-white"
                >
                  <div className="flex items-start gap-4">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <p className="font-semibold text-gray-900">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-gray-500">{item.description}</p>
                    </div>
                  </div>
                  <span className="text-xl text-gray-300 transition group-hover:text-gray-500">→</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
