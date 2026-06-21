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
  blue:    "bg-blue-100 text-blue-700 border-blue-200",
  purple:  "bg-purple-100 text-purple-700 border-purple-200",
  teal:    "bg-teal-100 text-teal-700 border-teal-200",
  amber:   "bg-amber-100 text-amber-700 border-amber-200",
  orange:  "bg-orange-100 text-orange-700 border-orange-200",
  rose:    "bg-rose-100 text-rose-700 border-rose-200",
};

// ─── Role steps ───────────────────────────────────────────────────────────────
type Step = { icon: string; title: string; body: string; tag?: string; link?: string; linkLabel?: string };

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
    icon: "🛒",
    title: "เลือก Carbon Credit ที่ต้องการ",
    body: "เข้า Marketplace ดู Carbon Credit ที่วางขายอยู่ แต่ละอันมีชื่อโครงการ, จังหวัด, ราคาต่อตัน และ Risk Badge บอกความน่าเชื่อถือ",
    tag: "ไม่ต้องใช้ MetaMask",
    link: "/buyer",
    linkLabel: "ไปหน้า Buyer",
  },
  {
    icon: "💳",
    title: "ซื้อ Credits",
    body: "กรอกจำนวนที่ต้องการ กด Buy Credits แล้วยืนยันใน MetaMask ระบบจะตัด TCUT Token และโอน Carbon Credit เข้ากระเป๋าให้อัตโนมัติ (Approve + Buy ในขั้นตอนเดียว)",
    tag: "ต้องใช้ MetaMask",
  },
  {
    icon: "💼",
    title: "ดู Portfolio",
    body: "แท็บ My Portfolio แสดงว่าคุณถือ Carbon Credit จากโครงการไหนบ้าง เท่าไหร่ตัน — เหมือนกระเป๋าหุ้น แต่เป็นเครดิตคาร์บอน",
    tag: "ต้องใช้ MetaMask",
  },
  {
    icon: "🔥",
    title: "Retire Credits เพื่อ Offset จริง",
    body: "เมื่อต้องการใช้ offset จริง กด Retire Credits ระบบจะเผา token นั้นทิ้งและออก NFT ใบรับรองให้ ใบรับรองนี้เป็นหลักฐานถาวรว่าคุณ offset จริงกี่ตัน",
    tag: "ต้องใช้ MetaMask",
  },
];

// ─── Concept cards ────────────────────────────────────────────────────────────
const CONCEPTS = [
  {
    icon: "🪙",
    term: "TCUT Token",
    simple: "เงินในระบบ",
    body: "ใช้ซื้อ Carbon Credit และวางหลักประกัน เหมือนเงินบาทในแพลตฟอร์มนี้ (ใช้บน Sepolia Testnet — ยังไม่มีมูลค่าจริง)",
    color: "amber",
  },
  {
    icon: "🌿",
    term: "Carbon Credit Token",
    simple: "ตั๋วลดคาร์บอน",
    body: "1 Credit = ลดคาร์บอน 1 ตัน ถือเป็น token ในกระเป๋า ขายต่อได้ หรือเผาทิ้งเพื่อ offset จริง",
    color: "emerald",
  },
  {
    icon: "📜",
    term: "NFT Certificate",
    simple: "ใบรับรองดิจิทัล",
    body: "เมื่อ retire credits ระบบออกใบรับรองเป็น NFT เก็บบน IPFS ตลอดไป ใครก็ตรวจสอบได้ว่า offset จริง",
    color: "rose",
  },
  {
    icon: "🗳️",
    term: "CGOV Token",
    simple: "สิทธิ์โหวต",
    body: "ใช้โหวตเปลี่ยนกฎของระบบ เช่น ใครเป็น Verifier, ค่าธรรมเนียมเท่าไหร่ เหมือนหุ้นที่มีสิทธิ์ออกเสียง",
    color: "purple",
  },
];

const CONCEPT_COLOR: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  amber:   { bg: "bg-amber-50",   border: "border-amber-200",   badge: "bg-amber-100 text-amber-700",   text: "text-amber-900" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-700", text: "text-emerald-900" },
  rose:    { bg: "bg-rose-50",    border: "border-rose-200",    badge: "bg-rose-100 text-rose-700",     text: "text-rose-900" },
  purple:  { bg: "bg-purple-50",  border: "border-purple-200",  badge: "bg-purple-100 text-purple-700", text: "text-purple-900" },
};

// ─── Issues ───────────────────────────────────────────────────────────────────
const ISSUES = [
  { q: "MetaMask ขึ้น Wrong Network", a: "กดปุ่ม Switch Network ในแถบด้านบนของหน้า แล้วเลือก Sepolia" },
  { q: "กด Buy แล้วขึ้น Error", a: "ตรวจว่า TCUT balance พอไหม — ดูยอดมุมขวาบนของหน้า Buyer" },
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
    verifier:  { label: "🔍 Verifier",  sub: "ตรวจสอบและอนุมัติ",          active: "bg-blue-600 text-white",    inactive: "bg-white text-gray-600 hover:bg-blue-50" },
    buyer:     { label: "🛒 Buyer",     sub: "ซื้อและใช้ Carbon Credits",   active: "bg-amber-500 text-white",   inactive: "bg-white text-gray-600 hover:bg-amber-50" },
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

        {/* ── What is this ── */}
        <section className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 border border-emerald-100 rounded-3xl p-7 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-500 mb-2">ระบบนี้คืออะไร</p>
          <h2 className="text-2xl font-bold text-gray-900 leading-snug">
            ตลาดซื้อขาย Carbon Credit<br />
            <span className="text-emerald-600">ที่ตรวจสอบได้ทุกขั้นตอน</span>
          </h2>
          <p className="mt-3 text-sm leading-7 text-gray-500 max-w-2xl">
            แพลตฟอร์มนี้ช่วยให้โครงการลดคาร์บอน (เช่น ปลูกป่า, พลังงานสะอาด) สามารถออก Carbon Credit เป็น Token ดิจิทัล
            แล้วขายให้กับบริษัทที่อยากลด carbon footprint — ทุกขั้นตอนถูกบันทึกถาวร ไม่มีใครแก้ไขหรือปลอมแปลงได้
          </p>

          {/* Why blockchain — simple analogy */}
          <div className="mt-5 grid sm:grid-cols-3 gap-3">
            {[
              { icon: "🔍", title: "โปร่งใส 100%", body: "ทุกการซื้อขายมี receipt ถาวร ตรวจสอบได้ตลอดเวลา" },
              { icon: "🤝", title: "ไม่มีตัวกลาง", body: "กฎทำงานอัตโนมัติ ไม่ต้องรอ broker หรือ admin" },
              { icon: "🛡️", title: "กันปลอม", body: "ใบรับรอง offset เป็น NFT ไม่มีใครสร้างปลอมได้" },
            ].map(c => (
              <div key={c.title} className="bg-white border border-gray-200 rounded-2xl p-4">
                <p className="text-2xl mb-2">{c.icon}</p>
                <p className="text-sm font-semibold text-gray-900">{c.title}</p>
                <p className="text-xs text-gray-500 mt-1 leading-5">{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Lifecycle flow ── */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-4">วงจรชีวิตของ Carbon Credit</p>

          {/* Flow diagram */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm overflow-x-auto">
            <div className="flex items-start gap-1 min-w-max mx-auto w-fit">
              {FLOW.map((step, i) => (
                <div key={step.label} className="flex items-start">
                  <div className="flex flex-col items-center gap-2 w-20">
                    <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center text-2xl shadow-sm ${FLOW_COLOR[step.color]}`}>
                      {step.icon}
                    </div>
                    <p className="text-xs font-semibold text-gray-800 text-center leading-4">{step.label}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${FLOW_COLOR[step.color]}`}>
                      {step.sub}
                    </span>
                  </div>
                  {i < FLOW.length - 1 && (
                    <div className="flex items-center mt-5 mx-0.5">
                      <div className="w-6 h-0.5 bg-gray-300" />
                      <div className="w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-8 border-l-gray-300" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Role Tabs + Steps ── */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-4">คู่มือตามบทบาท</p>

          {/* Tab buttons */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {(["developer", "verifier", "buyer"] as Role[]).map(r => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all shadow-sm ${
                  role === r ? roleConfig[r].active + " border-transparent shadow-md" : "border-gray-200 " + roleConfig[r].inactive
                }`}
              >
                {roleConfig[r].label}
                <span className={`ml-2 text-[11px] font-normal ${role === r ? "opacity-80" : "text-gray-400"}`}>
                  {roleConfig[r].sub}
                </span>
              </button>
            ))}
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex gap-4">
                {/* Number + icon */}
                <div className="flex flex-col items-center gap-1.5 shrink-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl border-2 ${
                    role === "developer" ? "bg-emerald-50 border-emerald-200" :
                    role === "verifier"  ? "bg-blue-50 border-blue-200" :
                                          "bg-amber-50 border-amber-200"
                  }`}>
                    {step.icon}
                  </div>
                  <span className={`text-[10px] font-bold ${
                    role === "developer" ? "text-emerald-400" :
                    role === "verifier"  ? "text-blue-400" : "text-amber-400"
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
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {step.tag.includes("MetaMask") ? "🦊 " : ""}{step.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1.5 leading-6">{step.body}</p>
                  {step.link && (
                    <Link
                      to={step.link}
                      className={`inline-flex items-center gap-1 mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                        role === "developer" ? "bg-emerald-600 text-white hover:bg-emerald-700" :
                        role === "verifier"  ? "bg-blue-600 text-white hover:bg-blue-700" :
                                              "bg-amber-500 text-white hover:bg-amber-600"
                      }`}
                    >
                      {step.linkLabel} →
                    </Link>
                  )}
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
                  title: "NASA POWER — ข้อมูล climate ปี 2023",
                  body: "ดึงค่าเฉลี่ยแสงอาทิตย์ (W/m²) และปริมาณฝน (mm/day) ทั้งปี 2023 ที่พิกัดจังหวัด ไม่ต้องใช้ API key — ฟรีและเปิดสาธารณะ",
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
              <p className="text-[11px] text-amber-600 mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                ⚠️ ระบบใช้พิกัดตัวเมืองของจังหวัด (ไม่ใช่พิกัดโครงการจริง) ดังนั้นถ้าโครงการอยู่นอกเมือง ค่า Land Cover อาจไม่ตรง — เป็น limitation ของ prototype นี้
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
              { to: "/dao",      icon: "🏛️", title: "DAO Governance",        body: "โหวตเปลี่ยนกฎของระบบ เช่น ใครเป็น Verifier หรือค่าธรรมเนียมเท่าไหร่ ใช้ CGOV token", color: "violet" },
              { to: "/oracle",   icon: "🌤️", title: "Oracle — NASA Data",   body: "ดูข้อมูล climate จาก NASA POWER ที่ระบบใช้คำนวณ Risk Score ของแต่ละโครงการ", color: "amber" },
              { to: "/admin",    icon: "📊", title: "Admin Dashboard",       body: "ภาพรวมระบบ — จำนวนโครงการ, สถิติ risk, leaderboard ผู้ตรวจสอบ และสถานะ DAO", color: "gray" },
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

        {/* ── Troubleshoot accordion ── */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-4">แก้ปัญหาที่พบบ่อย</p>
          <div className="space-y-2">
            {ISSUES.map((item, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <button
                  onClick={() => setOpenIssue(openIssue === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">❓</span>
                    <p className="text-sm font-semibold text-gray-800">{item.q}</p>
                  </div>
                  <span className={`text-gray-400 text-lg transition-transform ${openIssue === i ? "rotate-180" : ""}`}>▾</span>
                </button>
                {openIssue === i && (
                  <div className="px-5 pb-4 flex gap-3">
                    <span className="text-emerald-500 text-base shrink-0">✅</span>
                    <p className="text-sm text-gray-600 leading-6">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-7 text-white text-center shadow-lg">
          <p className="text-2xl mb-2">🌿</p>
          <h3 className="text-lg font-bold">พร้อมเริ่มใช้งานแล้วใช่ไหม?</h3>
          <p className="text-sm opacity-80 mt-1 mb-5">เชื่อม MetaMask แล้วเลือกบทบาทของคุณได้เลย</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-white text-emerald-700 font-semibold text-sm px-6 py-2.5 rounded-xl hover:bg-emerald-50 transition-colors shadow-sm"
          >
            เริ่มใช้งาน →
          </Link>
        </div>

      </main>
    </div>
  );
}
