import { Link } from "react-router-dom";
import { getContractConfig } from "../lib/web3";

const setupSteps = [
  {
    step: "0.1",
    title: "ติดตั้ง MetaMask และเปิด Sepolia",
    body: "ติดตั้ง MetaMask บน Chrome, Brave หรือ Edge แล้วสลับเครือข่ายเป็น Sepolia Testnet เพราะระบบนี้ deploy และทดสอบบนเครือข่ายนี้เป็นหลัก",
  },
  {
    step: "0.2",
    title: "เตรียม Sepolia ETH สำหรับค่า gas",
    body: "wallet ที่จะกด submit, approve, stake, buy, retire หรือ vote ต้องมี Sepolia ETH เล็กน้อยไว้ยืนยันธุรกรรมใน MetaMask",
  },
  {
    step: "0.3",
    title: "เชื่อม wallet และตรวจ network badge",
    body: "เมื่อเข้าแต่ละ dashboard ให้เชื่อม MetaMask แล้วดูที่แถบด้านบนว่าระบบอ่าน wallet และ network ถูกต้อง หากขึ้น wrong network ให้กดสลับเครือข่ายก่อน",
  },
  {
    step: "0.4",
    title: "เตรียมไฟล์หลักฐานสำหรับ demo",
    body: "ใช้ไฟล์ PDF หรือรูปภาพสำหรับ evidence upload ได้เลย เช่น ใบรับรองโครงการ, ภาพพื้นที่, เอกสารสรุปการลดคาร์บอน หรือ mock report สำหรับการนำเสนอ",
  },
];

const expectedSignals = [
  "Risk Score card แสดงค่าความเสี่ยงของโครงการ mangrove ในสุราษฎร์ธานี",
  "เห็น climate fields เช่น nasa_solarIrradiance ประมาณ 4.92 และ nasa_precipitation ประมาณ 6.48",
  "Data Source badge เป็น Real APIs เมื่อ NASA POWER ตอบกลับสำเร็จ",
  "Required Stake ถูกคำนวณให้อัตโนมัติตาม risk/trust ของโครงการ",
];

const developerSteps = [
  {
    step: "1.1",
    title: "Assess Project",
    body: "เข้า Developer Dashboard แล้วกรอกข้อมูลโครงการ เช่น ชื่อโครงการ, จังหวัด, ประเภทโครงการ, requested credits, self-reported reduction และ vintage year จากนั้นกดประเมินความเสี่ยง",
  },
  {
    step: "1.2",
    title: "ตรวจ Risk Score และ Required Stake",
    body: "ระบบ backend จะดึง climate signals จาก NASA POWER และ OpenWeatherMap เมื่อมี key จากนั้นคำนวณ risk score, trust score, approved credits และ required stake ให้ทันที",
  },
  {
    step: "1.3",
    title: "Submit On-Chain",
    body: "เมื่อผลประเมินโอเค ให้กด submit on-chain เพื่อเรียก submitProject() บันทึก metadata ของโครงการและ source data hash ลงบน blockchain",
  },
  {
    step: "1.4",
    title: "Approve และ Deposit Stake",
    body: "กด approve utility token ก่อนหนึ่งครั้ง แล้วจึงกด deposit stake เพื่อวางหลักประกันให้ครบตาม required stake หากข้อมูลภายหลังถูกพิสูจน์ว่า fraud ระบบสามารถใช้ stake นี้เป็นฐานสำหรับ slashing ได้",
  },
  {
    step: "1.5",
    title: "Upload Evidence ไป IPFS",
    body: "ลากไฟล์ลงใน evidence panel ระบบจะอัปโหลดผ่าน Pinata และคืน CID/IPFS URL เพื่อใช้เป็นหลักฐานประกอบการตรวจสอบ ทั้ง verifier และ explorer จะเปิดลิงก์นี้ได้",
  },
  {
    step: "1.6",
    title: "Mint & List หลังผ่านการตรวจสอบ",
    body: "หลัง verifier/assessor approve แล้ว action panel จะเปิดให้ตั้งราคาต่อเครดิตและกด mintAndListCredits() เพื่อ mint ERC-1155 แยกตาม projectId และลงขายใน marketplace",
  },
];

const verifierSteps = [
  {
    step: "2.1",
    title: "เปิด Pending Projects",
    body: "เข้า Verifier Dashboard เพื่อดูโครงการที่ถูก submit และรอการประเมิน on-chain พร้อมสถานะ, risk bars และข้อมูลประกอบจาก backend",
  },
  {
    step: "2.2",
    title: "ตรวจ signals และ evidence",
    body: "ดู risk score, trust score, approved credits, climate-derived signals และเปิด evidence จาก IPFS เพื่อตรวจว่าข้อมูลโครงการสอดคล้องกับคำอธิบายที่ developer ส่งมาหรือไม่",
  },
  {
    step: "2.3",
    title: "Approve หรือ Reject",
    body: "ถ้าผ่าน ให้กด approve เพื่อเรียก assessProject() บน contract หากไม่ผ่านสามารถ reject ใน workflow ของหน้า verifier เพื่อหยุด flow ก่อน mint",
  },
  {
    step: "2.4",
    title: "ผลลัพธ์หลัง approve",
    body: "เมื่อ assessment ถูกเขียน on-chain แล้ว project จะมี approved credits, trust score และ required stake พร้อมสำหรับให้ developer กลับไป mint และ list ในตลาด",
  },
];

const buyerSteps = [
  {
    step: "3.1",
    title: "Browse Marketplace",
    body: "เข้า Buyer Marketplace เพื่อดู carbon credit cards ที่ถูก mint แล้ว โดยแต่ละ card จะแสดงชื่อโครงการ, จังหวัด, price per credit, risk badge และ trust badge",
  },
  {
    step: "3.2",
    title: "Approve Token แล้ว Buy Credits",
    body: "กรอกจำนวนเครดิตที่ต้องการซื้อ จากนั้นกด approve utility token และซื้อผ่าน buyCredits() เมื่อธุรกรรมสำเร็จ token ERC-1155 จะถูกโอนเข้ากระเป๋าของผู้ซื้อ",
  },
  {
    step: "3.3",
    title: "ดู Portfolio",
    body: "แท็บ portfolio จะแสดงเครดิตที่ buyer ถืออยู่แยกตาม projectId ทำให้รู้ว่าถือ offset จากโครงการใดบ้างและเหลือปริมาณเท่าไร",
  },
  {
    step: "3.4",
    title: "Retire Credits และรับ NFT Certificate",
    body: "หากต้องการใช้ offset จริง ให้กด retire จำนวนเครดิตที่ต้องการ ระบบจะสร้าง certificate, อัปโหลดไป IPFS, burn เครดิตจาก wallet และ mint ERC-721 certificate กลับมาเป็นหลักฐานถาวร",
  },
];

const supportViews = [
  {
    title: "Traceability Explorer",
    description: "ค้นหา project ID เพื่อดู timeline ของ ProjectSubmitted, ProjectAssessed, StakeDeposited, CreditsMinted, CreditsPurchased และ CreditsRetired แบบพร้อม tx hash",
    to: "/explorer",
  },
  {
    title: "DAO Governance Portal",
    description: "ใช้ CGOV token เพื่อ delegate, สร้าง proposal, vote และ execute parameter changes ของระบบ เช่น assessor address หรือ platform fee",
    to: "/dao",
  },
  {
    title: "Oracle Page",
    description: "ใช้ดู flow การดึงข้อมูล NASA POWER สำหรับ demo oracle integration ซึ่งปัจจุบันอยู่ในโหมด simulated fetch และ owner fulfill",
    to: "/oracle",
  },
  {
    title: "Admin Dashboard",
    description: "ดูภาพรวมระบบ เช่น total projects, evidence count, risk distribution, leaderboard และ proposals ในหน้าเดียว",
    to: "/admin",
  },
];

const commonIssues = [
  {
    title: "MetaMask ขึ้น Wrong network",
    body: "กดปุ่ม switch network ใน wallet bar แล้วเลือก Sepolia ให้ตรงกับ contract deployment ของ frontend",
  },
  {
    title: "ธุรกรรมค้างหรือปุ่มหมุนไม่จบ",
    body: "ตรวจใน MetaMask ว่ามี transaction pending อยู่หรือไม่ บางครั้งต้องรอ block confirm ก่อน หรือ reject รายการค้างแล้วกดใหม่เพียงครั้งเดียว",
  },
  {
    title: "ซื้อหรือ stake ไม่ได้",
    body: "มักเกิดจากยังไม่ได้ approve utility token, token balance ไม่พอ หรือ wallet ยังไม่ใช่ account ที่เกี่ยวข้องกับ action นั้น",
  },
  {
    title: "อัปโหลด evidence ไม่สำเร็จ",
    body: "ตรวจว่าไฟล์เป็น PDF, JPG, PNG หรือ WEBP และขนาดไม่เกินที่ backend กำหนด รวมถึงเช็กว่าการเชื่อมต่อ Pinata และ backend ยังทำงานปกติ",
  },
  {
    title: "ไม่เห็นโปรเจกต์ใน Marketplace",
    body: "โปรเจกต์จะขึ้นขายได้ก็ต่อเมื่อผ่าน assessment, วาง stake ครบ, และ developer กด mint & list แล้วเท่านั้น",
  },
];

const faq = [
  "ระบบนี้ใช้ utility token ของแพลตฟอร์มสำหรับ demo flow ปัจจุบัน ยังไม่ใช่ stablecoin production",
  "ข้อมูล climate ตอนนี้พึ่ง NASA POWER เป็นหลัก และใช้ OpenWeatherMap เมื่อมี API key พร้อมใช้งาน",
  "Satellite NDVI, registry ภาครัฐ และ PWA ยังเป็น planned scope ยังไม่ใช่ของที่เชื่อมจริงทั้งหมดใน repo ตอนนี้",
  "ทุก transaction สำคัญสามารถตรวจสอบต่อบน explorer และ Etherscan ได้จาก tx hash ที่หน้า dashboard แสดง",
];

export default function ManualPage() {
  const config = getContractConfig();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-xl">📘</div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-none">คู่มือการใช้งาน</h1>
              <p className="text-xs text-gray-500">Thailand Carbon Market · ทีละขั้นตอน</p>
            </div>
          </div>
          <Link
            to="/"
            className="text-sm bg-white text-gray-700 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium transition-colors"
          >
            กลับหน้าหลัก
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5 text-gray-700">
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
          <h2 className="text-base font-bold text-gray-900">ระบบนี้คืออะไร</h2>
          <p className="text-sm leading-7 text-gray-600">
            ระบบนี้คือแพลตฟอร์มต้นแบบสำหรับออก, ซื้อขาย และ retire carbon credits บน blockchain โดยมี
            การประเมินความเสี่ยงจาก climate data, การเก็บหลักฐานบน IPFS, marketplace สำหรับซื้อขาย,
            และ NFT certificate สำหรับยืนยันการ offset จริง
          </p>
          <div className="grid sm:grid-cols-3 gap-2 mt-3 text-xs">
            <div className="border rounded-lg px-3 py-2 bg-emerald-50 border-emerald-200 text-emerald-700">
              <p className="font-bold">Project Developer</p>
              <p className="opacity-80">ส่งโครงการ, stake, upload evidence, mint & list</p>
            </div>
            <div className="border rounded-lg px-3 py-2 bg-blue-50 border-blue-200 text-blue-700">
              <p className="font-bold">Verifier / Assessor</p>
              <p className="opacity-80">ตรวจ risk signals และ approve assessment บน chain</p>
            </div>
            <div className="border rounded-lg px-3 py-2 bg-amber-50 border-amber-200 text-amber-700">
              <p className="font-bold">Buyer</p>
              <p className="opacity-80">ซื้อ credits, ถือใน portfolio, retire และรับ certificate</p>
            </div>
          </div>
          <div className="text-xs border rounded-lg px-3 py-2 bg-gray-50 border-gray-200 text-gray-600">
            Network ที่ใช้งานหลักตอนนี้คือ <strong>{config.rpcLabel}</strong> และ flow สำคัญทั้งหมดใช้ MetaMask ในการยืนยันธุรกรรม
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
          <h2 className="text-base font-bold text-gray-900">ขั้นที่ 0 — เตรียมความพร้อมก่อนเริ่ม</h2>
          {setupSteps.map((item) => (
            <div key={item.step} className="flex gap-3">
              <div className="shrink-0 w-10 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                {item.step}
              </div>
              <div className="text-sm leading-relaxed">
                <p className="font-semibold text-gray-900">{item.title}</p>
                <div className="text-gray-600 mt-0.5 leading-7">{item.body}</div>
              </div>
            </div>
          ))}
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
          <h2 className="text-base font-bold text-gray-900">ขั้นที่ 1 — Developer ส่งโครงการและเตรียมเครดิต</h2>
          {developerSteps.map((item) => (
            <div key={item.step} className="flex gap-3">
              <div className="shrink-0 w-10 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">
                {item.step}
              </div>
              <div className="text-sm leading-relaxed">
                <p className="font-semibold text-gray-900">{item.title}</p>
                <div className="text-gray-600 mt-0.5 leading-7">{item.body}</div>
              </div>
            </div>
          ))}
          <div className="text-xs border rounded-lg px-3 py-2 bg-emerald-50 border-emerald-200 text-emerald-800">
            ลำดับที่ควรทำจริงบนหน้า Developer คือ: Assess Project → Submit On-Chain → Approve PLAT → Deposit Stake → Upload Evidence → กลับมารอ Verifier approve
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-900">สิ่งที่ควรเห็นหลังจากกด Assess Project</p>
            <ul className="list-disc ml-5 mt-2 text-sm text-gray-600 space-y-1 leading-6">
              {expectedSignals.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-gray-200 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-gray-900">สิ่งที่ควรเห็นหลังจากกด Submit / Stake / Upload</p>
            <ul className="list-disc ml-5 mt-2 text-sm text-gray-600 space-y-1 leading-6">
              <li>หลัง Submit On-Chain จะมีข้อความยืนยันว่า submitted เป็น Project #X พร้อม tx hash</li>
              <li>หลัง Approve PLAT จะมีข้อความว่าอนุมัติ token allowance สำเร็จ</li>
              <li>หลัง Deposit Stake สถานะโครงการจะพร้อมเข้าสู่ช่วงรอ verifier approve</li>
              <li>หลัง Upload Evidence จะได้ IPFS URL ที่เปิดดูไฟล์จาก browser ได้ทันที</li>
            </ul>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
          <h2 className="text-base font-bold text-gray-900">ขั้นที่ 2 — Verifier ตรวจสอบและอนุมัติ</h2>
          {verifierSteps.map((item) => (
            <div key={item.step} className="flex gap-3">
              <div className="shrink-0 w-10 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                {item.step}
              </div>
              <div className="text-sm leading-relaxed">
                <p className="font-semibold text-gray-900">{item.title}</p>
                <div className="text-gray-600 mt-0.5 leading-7">{item.body}</div>
              </div>
            </div>
          ))}
          <div className="rounded-xl border border-gray-200 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-gray-900">สิ่งที่ verifier ควรชี้ให้ผู้ชมดู</p>
            <ul className="list-disc ml-5 mt-2 text-sm text-gray-600 space-y-1 leading-6">
              <li>Pending project ที่เพิ่ง submit ปรากฏในรายการรอตรวจสอบ</li>
              <li>Risk bar chart แสดง confidence หลายมิติ เช่น IoT, Government, Historical และ anomaly</li>
              <li>Evidence link เปิดไฟล์บน IPFS ได้จริง</li>
              <li>หลัง approve สถานะโครงการเปลี่ยน และ developer จะกลับไปเห็น action panel สำหรับ mint</li>
            </ul>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
          <h2 className="text-base font-bold text-gray-900">ขั้นที่ 3 — Buyer ซื้อและ retire เครดิต</h2>
          {buyerSteps.map((item) => (
            <div key={item.step} className="flex gap-3">
              <div className="shrink-0 w-10 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">
                {item.step}
              </div>
              <div className="text-sm leading-relaxed">
                <p className="font-semibold text-gray-900">{item.title}</p>
                <div className="text-gray-600 mt-0.5 leading-7">{item.body}</div>
              </div>
            </div>
          ))}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-900">สิ่งที่ควรเห็นหลัง Buy และ Retire</p>
            <ul className="list-disc ml-5 mt-2 text-sm text-gray-600 space-y-1 leading-6">
              <li>หลัง Buy สำเร็จ buyer จะถือ 10 credits ของ Project #X ใน portfolio</li>
              <li>หลัง Retire 5 credits ระบบจะสร้าง certificate, อัปโหลดขึ้น IPFS, และ mint NFT certificate ให้ buyer</li>
              <li>จำนวนเครดิตคงเหลือใน portfolio จะลดลงตามที่ retire ไปจริง</li>
              <li>ลิงก์ certificate ควรเปิด SVG certificate ที่มีชื่อโครงการและจำนวนเครดิตที่ใช้ offset</li>
            </ul>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
          <h2 className="text-base font-bold text-gray-900">ขั้นที่ 4 — หน้าประกอบสำหรับตรวจสอบและบริหารระบบ</h2>
          <div className="space-y-3">
            {supportViews.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-start justify-between gap-3 border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 hover:bg-white hover:border-gray-300 transition-colors"
              >
                <div>
                  <p className="font-semibold text-gray-900">{item.title}</p>
                  <p className="text-sm text-gray-600 leading-6 mt-1">{item.description}</p>
                </div>
                <span className="text-gray-300">→</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
          <h2 className="text-base font-bold text-gray-900">แก้ปัญหาที่พบบ่อย</h2>
          <div className="space-y-3">
            {commonIssues.map((item) => (
              <div key={item.title} className="text-sm">
                <p className="font-semibold text-gray-900">• {item.title}</p>
                <p className="text-gray-600 ml-3 leading-6">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
          <h2 className="text-base font-bold text-gray-900">ข้อควรรู้</h2>
          <ul className="list-disc ml-5 text-sm space-y-1 text-gray-600 leading-7">
            {faq.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <div className="text-center">
          <Link
            to="/"
            className="inline-flex bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 font-medium text-sm transition-colors"
          >
            กลับไปเริ่มใช้งาน
          </Link>
        </div>
      </main>
    </div>
  );
}
