import { useState } from "react";
import { Link } from "react-router-dom";

// ─── Flow lifecycle ────────────────────────────────────────────────────────────
const FLOW = [
  { icon: "🌱", label: "ยื่นโครงการ", sub: "Developer", color: "emerald" },
  { icon: "🔍", label: "ตรวจสอบ", sub: "Verifier", color: "blue" },
  { icon: "🔒", label: "วางหลักประกัน", sub: "Developer", color: "purple" },
  { icon: "🌿", label: "ออก Credits", sub: "ระบบอัตโนมัติ", color: "teal" },
  { icon: "🛒", label: "ซื้อ Credits", sub: "Buyer", color: "amber" },
  { icon: "🔥", label: "ใช้ Offset", sub: "Buyer", color: "orange" },
  { icon: "📜", label: "รับใบรับรอง", sub: "NFT", color: "rose" },
];

const FLOW_COLOR: Record<string, string> = {
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  purple: "bg-purple-100 text-purple-700 border-purple-200",
  teal: "bg-teal-100 text-teal-700 border-teal-200",
  amber: "bg-amber-100 text-amber-700 border-amber-200",
  orange: "bg-orange-100 text-orange-700 border-orange-200",
  rose: "bg-rose-100 text-rose-700 border-rose-200",
};

// ─── Role steps ───────────────────────────────────────────────────────────────
type Step = { icon: string; title: string; body: string; tag?: string; link?: string; linkLabel?: string; externalLink?: string; externalLinkLabel?: string; mono?: string };

const DEV_STEPS: Step[] = [
  {
    icon: "📋",
    title: "กรอกข้อมูลโครงการ",
    body: "ใส่ชื่อโครงการ, จังหวัด, ประเภทป่า/พลังงาน, พื้นที่ไร่ และปีที่ทำ ระบบจะดึงข้อมูลอากาศจริงจาก NASA มาคำนวณความเสี่ยงให้อัตโนมัติ",
    tag: "ไม่ต้องใช้ MetaMask",
    link: "/developer",
    linkLabel: "ไปหน้า Developer",
  },
  {
    icon: "📊",
    title: "ดู Risk Score และจำนวนเครดิตที่ได้",
    body: "ระบบคำนวณ Risk Score จากข้อมูล solar, ฝน และความน่าเชื่อถือของโครงการ ยิ่ง risk ต่ำ ยิ่งได้เครดิตมาก และวางหลักประกันน้อยลง",
    tag: "ดูผลได้ทันที",
  },
  {
    icon: "⛓️",
    title: "บันทึกโครงการบน Blockchain",
    body: "กด Submit On-Chain แล้วยืนยันใน MetaMask ข้อมูลโครงการจะถูกบันทึกถาวร ไม่มีใครลบหรือแก้ไขได้",
    tag: "ต้องใช้ MetaMask",
  },
  {
    icon: "🔒",
    title: "วางหลักประกัน (Stake)",
    body: "วาง TCUT Token ค้ำประกันว่าข้อมูลที่ส่งมาเป็นความจริง ถ้าภายหลังถูกพิสูจน์ว่าเท็จ ระบบจะหัก token นี้ออก",
    tag: "ต้องใช้ MetaMask",
  },
  {
    icon: "📎",
    title: "แนบหลักฐานบน IPFS",
    body: "อัปโหลดเอกสาร PDF หรือรูปภาพโครงการ ระบบจะเก็บบน IPFS — เหมือน Google Drive ที่ไม่มีใครลบได้ และ Verifier จะเปิดดูได้ทุกเวลา",
    tag: "ไม่ต้องใช้ MetaMask",
  },
  {
    icon: "🌿",
    title: "Mint และลงขาย Credits",
    body: "หลัง Verifier อนุมัติแล้ว ตั้งราคาต่อเครดิตและกด Mint แล้ว Carbon Credit จะถูกสร้างเป็น Token และลงขายใน Marketplace ทันที",
    tag: "ต้องใช้ MetaMask",
  },
];

const VER_STEPS: Step[] = [
  {
    icon: "📥",
    title: "เปิดรายการโครงการที่รอตรวจ",
    body: "เข้า Verifier Dashboard จะเห็นโครงการที่ Developer ส่งมา พร้อมข้อมูล risk, climate signals และหลักฐาน IPFS",
    tag: "ต้องใช้ MetaMask",
    link: "/verifier",
    linkLabel: "ไปหน้า Verifier",
  },
  {
    icon: "📂",
    title: "เปิดหลักฐาน IPFS",
    body: "กดเปิดไฟล์หลักฐานที่ Developer อัปโหลดไว้ ตรวจว่าเอกสารสอดคล้องกับข้อมูลที่กรอกมาหรือไม่",
    tag: "ไม่ต้องใช้ MetaMask",
  },
  {
    icon: "📈",
    title: "ดู Climate Signals",
    body: "ระบบแสดงข้อมูลจาก NASA เช่น แสงแดดเฉลี่ย, ปริมาณฝน, ค่าความเชื่อมั่น ใช้ประกอบการตัดสินใจว่าโครงการมีความเป็นไปได้จริงไหม",
    tag: "ดูได้เลย",
  },
  {
    icon: "✅",
    title: "อนุมัติหรือปฏิเสธโครงการ",
    body: "ถ้าโครงการผ่าน กด Approve เพื่อบันทึกผลลงใน Blockchain Developer จะเห็นสถานะเปลี่ยนทันทีและกลับไป Mint Credits ได้",
    tag: "ต้องใช้ MetaMask",
  },
];

const BUYER_STEPS: Step[] = [
  {
    icon: "⛽",
    title: "เตรียม Sepolia ETH สำหรับค่า Gas",
    body: "ทุก transaction บน blockchain ต้องจ่ายค่า gas ด้วย Sepolia ETH (ไม่ใช่เงินจริง — ฟรี) กรอก wallet address ในหน้า faucet แล้วกด Request ถ้าไม่มี ETH ระบบจะขึ้น error 'insufficient funds' และทำอะไรไม่ได้เลย",
    tag: "ทำก่อนอย่างอื่น",
    link: "/buyer",
    linkLabel: "ไปหน้า Buyer",
    externalLink: "https://cloud.google.com/application/web3/faucet/ethereum/sepolia",
    externalLinkLabel: "⛽ Google Sepolia Faucet →",
  },
  {
    icon: "🪙",
    title: "รับ TCUT Token (เงินที่ใช้ในระบบ)",
    body: "กดปุ่ม '+ รับ TCUT' ที่มุมขวาบนของหน้า Buyer เลือกวิธีรับ: 'รับฟรี (Faucet)' ได้ 100 TCUT ฟรีต่อครั้ง หรือ 'ซื้อด้วย ETH' แลก Sepolia ETH เป็น TCUT แล้วยืนยันใน MetaMask จากนั้นกดปุ่ม 'เพิ่มใน MetaMask' ในหน้าต่างรับ TCUT เพื่อแสดงยอดใน MetaMask หรือ import token address ด้านล่างด้วยตนเอง",
    tag: "🦊 ต้องใช้ MetaMask",
    mono: "0xe51A5687ad95b737D6DF0DF89CD2419375214ec5",
  },
  {
    icon: "👁️",
    title: "เพิ่ม TCUT ใน MetaMask (เพื่อดูยอด)",
    body: "กดปุ่ม 'เพิ่มใน MetaMask' ในหน้าต่าง รับ TCUT แล้วกด Add token ใน MetaMask popup ยอด TCUT จะปรากฏในแท็บ Tokens หมายเหตุ: ต้องดูที่ network Sepolia และมุมมอง 'Custom tokens' — MetaMask ซ่อน testnet tokens ใน All networks view",
    tag: "แนะนำทำ",
  },
  {
    icon: "🔓",
    title: "Enable TCUT — ทำครั้งเดียวตลอดชีพ",
    body: "ก่อนซื้อครั้งแรก ระบบจะแสดงแถบสีส้ม 'เปิดใช้ TCUT ก่อนซื้อ' ในหน้า Marketplace กดปุ่ม 'Enable TCUT' แล้วยืนยันใน MetaMask ขั้นตอนนี้ให้สิทธิ์ระบบตัด TCUT แทนคุณ ทำครั้งเดียวและระบบจะจำไว้ตลอด",
    tag: "🦊 ต้องใช้ MetaMask",
  },
  {
    icon: "🛒",
    title: "เลือกและซื้อ Carbon Credits",
    body: "เข้า Marketplace ดู Carbon Credit ที่วางขาย แต่ละ card แสดงชื่อโครงการ, จังหวัด, ราคา TCUT ต่อตัน และ Risk Badge บอกความน่าเชื่อถือ กรอกจำนวนตัน กด 'Buy Credits' แล้วยืนยันใน MetaMask ระบบตัด TCUT และโอน Credit เข้ากระเป๋าทันที",
    tag: "🦊 ต้องใช้ MetaMask",
  },
  {
    icon: "💼",
    title: "ดู My Portfolio",
    body: "แท็บ 'My Portfolio' แสดง Carbon Credit ทั้งหมดที่คุณถืออยู่ แยกตามโครงการ — จากป่าไหน กี่ตัน สามารถ Retire เพื่อ offset คาร์บอนจริงๆ ได้ที่นี่",
    tag: "🦊 ต้องใช้ MetaMask",
  },
  {
    icon: "🔥",
    title: "Retire Credits — รับ NFT Certificate",
    body: "กด 'Retire & Get NFT Certificate' ระบบจะเผา Carbon Credit นั้นทิ้งถาวร (ใช้ได้ครั้งเดียว — ป้องกันการนับซ้ำ) และออก NFT ใบรับรองในกระเป๋า MetaMask ของคุณ เป็นหลักฐานถาวรบน blockchain ว่าคุณ offset จริงกี่ tCO₂",
    tag: "🦊 ต้องใช้ MetaMask",
  },
];

// ─── Concept cards ────────────────────────────────────────────────────────────
const CONCEPTS = [
  {
    icon: "🪙",
    term: "TCUT Token",
    simple: "เงินในระบบ",
    body: "เป็น ERC-20 token ใช้ซื้อ Carbon Credit, วางหลักประกัน และรับ reward หน่วยทุกหน่วยเหมือนกัน จึงเหมาะกับการเป็นเหรียญกลางของระบบ",
    color: "amber",
  },
  {
    icon: "🌿",
    term: "Carbon Credit Token",
    simple: "ตั๋วลดคาร์บอน",
    body: "ใช้มาตรฐาน ERC-1155 เพราะแต่ละโครงการเป็นคนละ tokenId แต่ในโครงการเดียวกันมีได้หลายหน่วย โดย 1 token แทน 1 tCO2 ขายต่อหรือ retire ได้",
    color: "emerald",
  },
  {
    icon: "📜",
    term: "NFT Certificate",
    simple: "ใบรับรองดิจิทัล",
    body: "ใช้มาตรฐาน ERC-721 เพราะใบรับรองแต่ละใบไม่ซ้ำกัน มีเจ้าของ, project, จำนวนเครดิต และเวลาที่ retire เฉพาะของตัวเอง",
    color: "rose",
  },
  {
    icon: "🗳️",
    term: "CGOV Token",
    simple: "สิทธิ์โหวต",
    body: "เป็น ERC-20 governance token ใช้โหวตเปลี่ยนกฎของระบบ เช่น ใครเป็น Verifier หรือค่าธรรมเนียมเท่าไหร่ เหมือนแต้มสิทธิ์ออกเสียง",
    color: "purple",
  },
];

const CONCEPT_COLOR: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  amber: { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700", text: "text-amber-900" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-700", text: "text-emerald-900" },
  rose: { bg: "bg-rose-50", border: "border-rose-200", badge: "bg-rose-100 text-rose-700", text: "text-rose-900" },
  purple: { bg: "bg-purple-50", border: "border-purple-200", badge: "bg-purple-100 text-purple-700", text: "text-purple-900" },
};

// ─── Issues ───────────────────────────────────────────────────────────────────
const ISSUES = [
  { q: "MetaMask ขึ้น Wrong Network", a: "กดปุ่ม Switch Network ในแถบด้านบนของหน้า แล้วเลือก Sepolia" },
  { q: "ขึ้น 'insufficient funds' / ค่า gas", a: "ต้องมี Sepolia ETH ในกระเป๋าก่อน ไปรับฟรีที่ Google Cloud Web3 Faucet — พิมพ์ใน Google ว่า 'Sepolia faucet' แล้วกรอก wallet address" },
  { q: "Enable TCUT แล้วยังซื้อไม่ได้", a: "ลอง reload หน้า แล้วตรวจดูว่าแถบสีส้มหายไปยัง (แสดงว่า Enable สำเร็จ) ถ้ายังไม่หาย ลอง Enable ใหม่อีกครั้ง" },
  { q: "กด Buy แล้วขึ้น Error หรือ TCUT ไม่พอ", a: "ตรวจยอด TCUT ในแถบ Wallet Balance ของหน้า Buyer ถ้าน้อย กดปุ่ม '+ รับ TCUT' เพื่อรับเพิ่ม" },
  { q: "TCUT ไม่ขึ้นใน MetaMask Tokens list", a: "MetaMask ซ่อน testnet tokens เมื่ออยู่ใน 'All popular networks' — สลับไปที่ Sepolia network แล้วกด 'Custom tokens' ถึงจะเห็น ยอดในเว็บถูกต้องเสมอ" },
  { q: "Retire แล้วขึ้น Unauthorized / error", a: "ตรวจว่า contract addresses ใน frontend .env ตรงกับที่ deploy ล่าสุด และ RetireCertificate กับ CarbonCreditToken ต้องชี้ไปที่ CarbonMarket address ปัจจุบัน" },
  { q: "ปุ่มค้าง หมุนไม่จบ", a: "เปิด MetaMask ดูว่ามี transaction รอ confirm อยู่ไหม ถ้ามีให้ confirm หรือ cancel ก่อน" },
  { q: "Marketplace ว่าง ไม่เห็น Credits", a: "โครงการต้องผ่านขั้นตอน Submit → Verify → Stake → Mint ครบก่อน ถึงจะปรากฏในตลาด" },
  { q: "อัปโหลดหลักฐานไม่ได้", a: "รองรับ PDF, JPG, PNG ขนาดไม่เกิน 10MB และ backend ต้องออนไลน์อยู่" },
];

// ─── Component ────────────────────────────────────────────────────────────────
type Role = "developer" | "verifier" | "buyer";

export default function ManualPage() {
  const [role, setRole] = useState<Role>("developer");
  const [openIssue, setOpenIssue] = useState<number | null>(null);

  const steps = role === "developer" ? DEV_STEPS : role === "verifier" ? VER_STEPS : BUYER_STEPS;

  const roleConfig = {
    developer: { label: "🌱 Developer", sub: "ยื่นโครงการและสร้างเครดิต", active: "bg-emerald-600 text-white", inactive: "bg-white text-gray-600 hover:bg-emerald-50" },
    verifier: { label: "🔍 Verifier", sub: "ตรวจสอบและอนุมัติ", active: "bg-blue-600 text-white", inactive: "bg-white text-gray-600 hover:bg-blue-50" },
    buyer: { label: "🛒 Buyer", sub: "ซื้อและใช้ Carbon Credits", active: "bg-amber-500 text-white", inactive: "bg-white text-gray-600 hover:bg-amber-50" },
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-lg">📘</div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-none">คู่มือการใช้งาน</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Thailand Carbon Market · ฉบับเข้าใจง่าย</p>
            </div>
          </div>
          <Link to="/" className="text-sm text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            ← หน้าหลัก
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-10">
        {/* ── Role Tabs + Steps ── */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-4">คู่มือตามบทบาท</p>

          {/* Tab buttons */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {(["developer", "verifier", "buyer"] as Role[]).map(r => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all shadow-sm ${role === r ? roleConfig[r].active + " border-transparent shadow-md" : "border-gray-200 " + roleConfig[r].inactive
                  }`}
              >
                {roleConfig[r].label}
                <span className={`ml-2 text-[11px] font-normal ${role === r ? "opacity-80" : "text-gray-400"}`}>
                  {roleConfig[r].sub}
                </span>
              </button>
            ))}
          </div>

          {/* Buyer quick-start banner */}
          {role === "buyer" && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
              <p className="font-bold text-amber-900 text-sm mb-3">🚀 Buyer Quick-Start — ทำตามลำดับนี้ครั้งแรก</p>
              <ol className="space-y-2">
                {[
                  { step: "01", label: "รับ Sepolia ETH", desc: "ค่า gas — ไป Google พิมพ์ 'Sepolia faucet'" },
                  { step: "02", label: "รับ TCUT", desc: "กดปุ่ม '+ รับ TCUT' มุมขวาบน → รับฟรี หรือซื้อด้วย ETH" },
                  { step: "03", label: "Enable TCUT", desc: "กดแถบสีส้มใน Marketplace → ยืนยัน MetaMask (ครั้งเดียว)" },
                  { step: "04", label: "ซื้อ Carbon Credits", desc: "เลือกโครงการ → กรอกจำนวน → Buy Credits → ยืนยัน MetaMask" },
                  { step: "05", label: "Retire & รับ NFT", desc: "My Portfolio → Retire & Get NFT Certificate → ยืนยัน MetaMask" },
                ].map(s => (
                  <li key={s.step} className="flex items-start gap-3">
                    <span className="text-[10px] font-bold bg-amber-200 text-amber-800 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">{s.step}</span>
                    <span className="text-sm text-amber-900"><strong>{s.label}</strong> <span className="text-amber-700 font-normal">— {s.desc}</span></span>
                  </li>
                ))}
              </ol>
              <p className="text-xs text-amber-600 mt-3 border-t border-amber-200 pt-3">
                💡 ทุก transaction ต้องใช้ Sepolia ETH เป็นค่า gas แม้แต่รับ TCUT ฟรีก็ตาม
              </p>
            </div>
          )}

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex gap-4">
                {/* Number + icon */}
                <div className="flex flex-col items-center gap-1.5 shrink-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl border-2 ${role === "developer" ? "bg-emerald-50 border-emerald-200" :
                      role === "verifier" ? "bg-blue-50 border-blue-200" :
                        "bg-amber-50 border-amber-200"
                    }`}>
                    {step.icon}
                  </div>
                  <span className={`text-[10px] font-bold ${role === "developer" ? "text-emerald-400" :
                      role === "verifier" ? "text-blue-400" : "text-amber-400"
                    }`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 text-sm">{step.title}</p>
                    {step.tag && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                        step.tag.includes("MetaMask")
                          ? "bg-orange-100 text-orange-700"
                          : step.tag === "ทำก่อนอย่างอื่น"
                          ? "bg-red-100 text-red-700"
                          : step.tag === "แนะนำทำ"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {step.tag.includes("MetaMask") ? "🦊 " : step.tag === "ทำก่อนอย่างอื่น" ? "⚠️ " : ""}{step.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1.5 leading-6">{step.body}</p>
                  {step.mono && (
                    <p className="mt-2 font-mono text-[11px] bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 break-all select-all">
                      {step.mono}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {step.link && (
                      <Link
                        to={step.link}
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${role === "developer" ? "bg-emerald-600 text-white hover:bg-emerald-700" :
                            role === "verifier" ? "bg-blue-600 text-white hover:bg-blue-700" :
                              "bg-amber-500 text-white hover:bg-amber-600"
                          }`}
                      >
                        {step.linkLabel} →
                      </Link>
                    )}
                    {step.externalLink && (
                      <a
                        href={step.externalLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-700 text-white hover:bg-gray-900 transition-colors"
                      >
                        {step.externalLinkLabel}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Assessment methodology ── */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-4">ระบบประเมินโครงการยังไง?</p>

          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-6">

            {/* Intro */}
            <div className="flex gap-4 items-start">
              <span className="text-4xl shrink-0">🔬</span>
              <div>
                <h3 className="font-bold text-gray-900">ระบบไม่ได้ใช้คนตรวจ — ใช้ข้อมูลจริงจาก 4 แหล่ง</h3>
                <p className="text-sm text-gray-500 mt-1 leading-6">
                  เมื่อ Developer กรอกข้อมูลโครงการ ระบบจะ query ข้อมูลจาก API ภายนอกพร้อมกันทันที
                  แล้วนำมาคำนวณ Risk Score และจำนวนเครดิตที่อนุมัติได้ อัตโนมัติ
                </p>
              </div>
            </div>

            {/* 4 data sources */}
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                {
                  icon: "🛰️", badge: "MODIS NDVI", badgeColor: "bg-emerald-100 text-emerald-700",
                  title: "ดาวเทียม NASA — ค่าความเขียวพืช",
                  body: "NASA MODIS ถ่ายภาพทุก 16 วัน ความละเอียด 250m วัด NDVI (Normalized Difference Vegetation Index) ที่พิกัด lat/lon ของจังหวัด — ยิ่งเขียวมาก NDVI สูง",
                  used: "→ iotConfidence",
                },
                {
                  icon: "🗺️", badge: "MODIS Land Cover", badgeColor: "bg-emerald-100 text-emerald-700",
                  title: "ดาวเทียม NASA — ประเภทพื้นที่",
                  body: "MODIS จำแนกพื้นที่เป็น 17 ประเภท เช่น forest, cropland, urban, barren — ระบบ cross-validate ว่า project type ที่กรอกมาตรงกับพื้นที่จริงไหม",
                  used: "→ governmentConfidence",
                },
                {
                  icon: "☀️", badge: "NASA POWER", badgeColor: "bg-blue-100 text-blue-700",
                  title: "NASA POWER — ข้อมูล climate",
                  body: "ดึงค่าเฉลี่ยแสงอาทิตย์ (W/m²) และปริมาณฝน (mm/day) ที่พิกัดจังหวัด ไม่ต้องใช้ API key — ฟรีและเปิดสาธารณะ",
                  used: "→ historicalConfidence",
                },
                {
                  icon: "🌦️", badge: "OpenWeatherMap", badgeColor: "bg-sky-100 text-sky-700",
                  title: "OpenWeatherMap — สภาพอากาศวันนั้น",
                  body: "ดึงอุณหภูมิ ความชื้น และเมฆปกคลุม ณ วันที่ submit โครงการ แสดงเป็นข้อมูล context เพิ่มเติม",
                  used: "→ weather_*",
                },
              ].map(s => (
                <div key={s.title} className="border border-gray-200 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{s.icon}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.badgeColor}`}>{s.badge}</span>
                  </div>
                  <p className="font-semibold text-sm text-gray-900">{s.title}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-5">{s.body}</p>
                  <p className="text-[10px] font-mono text-purple-500 mt-2">{s.used}</p>
                </div>
              ))}
            </div>

            {/* Formulas */}
            <div className="border-t border-gray-100 pt-5 space-y-4">
              <p className="font-bold text-gray-900 text-sm">สูตรคำนวณ</p>

              <div className="space-y-3">
                {[
                  {
                    label: "① Confidence Blend (ค่าเฉลี่ยถ่วงน้ำหนัก)",
                    formula: "blend = iot×30% + government×30% + historical×25% + userInput×15%",
                    note: "ยิ่งข้อมูลสอดคล้องกัน blend สูง",
                  },
                  {
                    label: "② Risk Score (0–100, ยิ่งต่ำยิ่งดี)",
                    formula: "risk = 100 − blend + (anomaly × 0.45) − (additionality × 0.2)",
                    note: "blend ต่ำ + anomaly สูง = risk พุ่ง",
                  },
                  {
                    label: "③ Approved Credits (จำนวนที่ได้จริง)",
                    formula: "credits = min(requested,  selfReported × blend/100 × (100−risk)/100)",
                    note: "risk 60 + blend 50 → ได้แค่ ~20% ของที่ขอ",
                  },
                  {
                    label: "④ Required Stake (หลักประกัน)",
                    formula: "stake = max(100,  approvedCredits × (0.4 + risk/100 × 1.8))  TCUT",
                    note: "risk สูง → multiplier สูง → stake พุ่ง",
                  },
                ].map(f => (
                  <div key={f.label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-gray-700 mb-1.5">{f.label}</p>
                    <p className="font-mono text-[11px] bg-white rounded-lg px-3 py-2 text-gray-800 overflow-x-auto">{f.formula}</p>
                    <p className="text-[10px] text-gray-400 mt-1.5">{f.note}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Example */}
            <div className="border-t border-gray-100 pt-5">
              <p className="font-bold text-gray-900 text-sm mb-3">ตัวอย่างจริง — ChiangMai, Forest</p>
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-100">
                      <th className="pb-2 pr-4">Signal</th><th className="pb-2 pr-4">ค่า</th><th className="pb-2">มาจาก</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700 divide-y divide-gray-50">
                    {[
                      ["ndvi", "0.290", "🛰️ MODIS MOD13Q1 — ดาวเทียมจริง"],
                      ["landCoverType", "13 (Urban)", "🛰️ MODIS MCD12Q1 — พิกัดชิ้กเชียงใหม่ตัวเมือง"],
                      ["nasa_solarIrradiance", "4.83 W/m²", "NASA POWER 2023 avg"],
                      ["nasa_precipitation", "3.51 mm/day", "NASA POWER 2023 avg"],
                      ["iotConfidence", "63", "คำนวณจาก NDVI 0.290"],
                      ["governmentConfidence", "20", "Forest claim vs Urban land → mismatch"],
                      ["Risk Score", "~65", "สูงเพราะ LC mismatch"],
                    ].map(([s, v, src]) => (
                      <tr key={s}>
                        <td className="py-1.5 pr-4 font-mono text-gray-600">{s}</td>
                        <td className="py-1.5 pr-4 font-semibold">{v}</td>
                        <td className="py-1.5 text-gray-400">{src}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-emerald-700 mt-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                Developer สามารถกรอก <strong>พิกัด GPS จริงของพื้นที่โครงการ</strong> (Latitude / Longitude) ได้ที่หน้า Submit Project — ระบบจะใช้พิกัดนั้นสำหรับ MODIS + NASA + OWM ทั้งหมด ถ้าไม่กรอกถึงจะ fallback เป็นพิกัดตัวเมืองจังหวัด
              </p>
            </div>
          </div>
        </section>

        {/* ── Token cheat sheet ── */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-4">Token ในระบบ — คืออะไร?</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {CONCEPTS.map(c => {
              const cl = CONCEPT_COLOR[c.color];
              return (
                <div key={c.term} className={`rounded-2xl border p-5 ${cl.bg} ${cl.border}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{c.icon}</span>
                    <div>
                      <p className={`text-xs font-bold ${cl.text} opacity-60 uppercase tracking-wide`}>{c.term}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cl.badge}`}>= {c.simple}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 leading-6">{c.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Tools quick links ── */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-4">เครื่องมือในระบบ</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { to: "/explorer", icon: "🔭", title: "Traceability Explorer", body: "ค้นหาโครงการ แล้วดูว่า Credit นั้นผ่านขั้นตอนอะไรมาบ้าง มี tx hash พิสูจน์ได้ทุกก้าว", color: "sky" },
              { to: "/dao", icon: "🏛️", title: "DAO Governance", body: "โหวตเปลี่ยนกฎของระบบ เช่น ใครเป็น Verifier หรือค่าธรรมเนียมเท่าไหร่ ใช้ CGOV token", color: "violet" },
              { to: "/oracle", icon: "🌤️", title: "Oracle — NASA Data", body: "ดูข้อมูล climate จาก NASA POWER ที่ระบบใช้คำนวณ Risk Score ของแต่ละโครงการ", color: "amber" },
              { to: "/admin", icon: "📊", title: "Admin Dashboard", body: "ภาพรวมระบบ — จำนวนโครงการ, สถิติ risk, leaderboard ผู้ตรวจสอบ และสถานะ DAO", color: "gray" },
            ].map(t => (
              <Link
                key={t.to}
                to={t.to}
                className="group flex gap-4 bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-md hover:border-gray-300 transition-all"
              >
                <span className="text-3xl shrink-0">{t.icon}</span>
                <div>
                  <p className="font-semibold text-sm text-gray-900 group-hover:text-emerald-700 transition-colors">{t.title}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-5">{t.body}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
