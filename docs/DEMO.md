# Demo Script — Thailand Blockchain Carbon Credit Market

> **URL:** https://blockchain-carbon-market-frontend.vercel.app  
> **Network:** Sepolia Testnet (ETH)  
> **เวลานำเสนอที่แนะนำ:** 10–15 นาที

---

## เตรียมก่อนเริ่ม Demo

| สิ่งที่ต้องเตรียม | รายละเอียด |
|---|---|
| MetaMask Extension | ติดตั้งบน Chrome / Brave |
| Deployer Wallet | `0x2910A663A02c055a84F1d95904318ac265F50135` (import private key) |
| Sepolia ETH | ≥ 0.05 ETH (จาก https://faucets.chain.link/sepolia) |
| PLAT Token | กด Faucet ใน Developer Dashboard ถ้าหมด |
| ไฟล์ PDF ตัวอย่าง | ใช้ไฟล์ใดก็ได้ (หลักฐานจำลอง) |

---

## ขั้นที่ 1 — เปิดหน้าแรก (Role Selector)

**URL:** `/`

**พูด:**
> "นี่คือระบบซื้อขาย Carbon Credit บน Ethereum Blockchain  
> ทุก transaction ถูกบันทึกบน Sepolia Testnet จริง ผ่าน Smart Contract 7 ตัว"

**ชี้ให้ดู:**
- System Flow diagram ด้านล่าง (7 ขั้นตอน Submit → Reputation)
- Network badge: `Sepolia` มุมขวาบน
- 3 Role + 4 link: Explorer, DAO, Oracle, Admin

---

## ขั้นที่ 2 — Developer Dashboard

**คลิก:** Project Developer → เข้า `/developer`  
**Connect MetaMask:** Deployer wallet บน Sepolia

**2.1 Submit Project**
- กรอก form:
  - ชื่อโครงการ: `แปลงป่าชายเลน อ.ดอนสัก สุราษฎร์ธานี`
  - Province: `SuratThani`
  - ประเภท: `mangrove`
  - พื้นที่: `320 ไร่`
  - Credits ขอ: `800`
  - Reduction: `720 tCO₂`
  - ปี: `2026`
- คลิก **Assess Project**

**พูด:**
> "ระบบดึงข้อมูลจริงจาก NASA POWER API — solar irradiance และ precipitation ของสุราษฎร์ธานี  
> แล้วคำนวณ Risk Score และ Required Stake โดยอัตโนมัติ"

**ชี้ให้ดู:**
- Risk Score card (ต่ำ = ดี สำหรับ mangrove ริมทะเล)
- `nasa_solarIrradiance: 4.92 W/m²`, `nasa_precipitation: 6.48 mm/day`
- Required Stake ที่คำนวณออกมา
- Data Source badge: `🌐 Real APIs`

**2.2 Submit On-Chain**
- คลิก **Submit On-Chain** → MetaMask confirm
- รอ tx confirm (~15 วินาที)
- ชี้: `ProjectSubmitted` event + tx hash ลิงก์ไป Etherscan

**2.3 Stake Collateral**
- คลิก **Approve PLAT** → MetaMask confirm
- คลิก **Deposit Stake** → MetaMask confirm

**พูด:**
> "Stake เป็นกลไก Incentive — ถ้าโครงการ fraud จะถูก Slash"

**2.4 Upload Evidence**
- ลาก PDF ใส่ drop zone
- รอ upload → เห็น IPFS URL (gateway.pinata.cloud/ipfs/Qm...)
- คลิก link เปิดใน tab ใหม่

**พูด:**
> "ไฟล์เก็บบน IPFS ผ่าน Pinata API — CID จะถูก Hash และเก็บบน Blockchain ถาวร"

---

## ขั้นที่ 3 — Verifier Dashboard

**คลิก:** Back → Verifier → `/verifier`

**3.1 Review**
- เห็นโครงการที่ Submit อยู่ใน Pending list
- คลิก Risk bar chart แสดง: IoT Confidence, Gov Confidence, Historical, Anomaly
- ดู IPFS Evidence link ที่ Verifier เห็น

**3.2 Approve On-Chain**
- คลิก **Approve** → MetaMask confirm
- รอ tx confirm
- สถานะเปลี่ยนเป็น ✅ Approved

**พูด:**
> "Verifier call `publishAssessment()` บน Smart Contract  
> หลัง Approve ระบบ Mint Carbon Credit Token อัตโนมัติ"

---

## ขั้นที่ 4 — กลับ Developer: Mint & List

**คลิก:** Developer Dashboard

- Action panel เปลี่ยนเป็น "Mint & List" (เพราะ status = Staked + Verified)
- กรอก Price: `100 PLAT per credit`
- คลิก **Mint & List** → MetaMask confirm

**พูด:**
> "`mintAndListCredits()` ออก ERC-1155 Token 800 units  
> แต่ละ tokenId = projectId — ทำให้ trace กลับไปถึงโครงการต้นทางได้ทันที"

---

## ขั้นที่ 5 — Buyer Marketplace

**คลิก:** Buyer → `/buyer`

**5.1 Browse**
- เห็น Carbon Credit cards พร้อม Trust Score badge, Risk badge, ราคา

**5.2 Buy Credits**
- ใส่จำนวน: `10 credits`
- คลิก **Buy** → MetaMask: Approve PLAT → Confirm purchase

**5.3 Portfolio**
- แสดงใน Portfolio: `10 CBON (Project #X)`

**5.4 Retire Credits**
- คลิก **Retire & Get NFT**
- ใส่จำนวน: `5`
- MetaMask confirm
- ได้รับ NFT Certificate ERC-721
- คลิก IPFS link → เห็น SVG Certificate พร้อมชื่อโครงการ

**พูด:**
> "Retire คือการ 'ใช้' carbon offset จริง — token ถูก burn ถาวร ไม่สามารถขายต่อได้  
> NFT Certificate เป็นหลักฐาน offset บน Blockchain"

---

## ขั้นที่ 6 — Traceability Explorer

**คลิก:** Explorer → `/explorer`

- ค้นหา Project ID ที่เพิ่ง mint
- เห็น Timeline:
  - 📋 ProjectSubmitted (block, tx hash)
  - 🔍 ProjectAssessed (risk score, approved credits)
  - 🔒 StakeDeposited (amount)
  - 🪙 CreditsMinted (800 credits)
  - 🛒 CreditsPurchased (buyer address, 10 credits)
  - ♻️ CreditsRetired (5 credits, cert tokenId)

**พูด:**
> "ทุก event บน Blockchain มี tx hash สามารถตรวจสอบบน Etherscan ได้ทันที  
> ใครก็ตามสามารถ verify full journey ของ Carbon Credit ได้ — ไม่มีการปลอมแปลง"

---

## ขั้นที่ 7 — DAO Governance

**คลิก:** DAO → `/dao`

- แสดง CGOV balance + Voting Power
- คลิก **Delegate to Self**
- สร้าง Proposal: Change Assessor Address
- ใส่ address ใหม่, description
- คลิก **Create Proposal** → MetaMask confirm
- แสดง Proposal พร้อม Vote For/Against/Abstain

**พูด:**
> "DAO ใช้ OpenZeppelin Governor — parameter ทุกอย่างในระบบเปลี่ยนได้ผ่าน vote  
> ไม่มี admin คนเดียวที่ควบคุมทั้งระบบ"

---

## ขั้นที่ 8 — Chainlink Oracle

**คลิก:** Oracle → `/oracle`

- เห็น sunset banner (Chainlink Functions testnet sunset June 15, 2026)
- เห็นโครงการที่ submit on-chain
- คลิก **Simulate Oracle — Fetch Real NASA POWER Data**
- Backend ดึง NASA climatology API → ownerFulfill on-chain
- เห็น: `☀️ Solar: 4.92 kWh/m²/day`, `🌧️ Precip: 6.48 mm/day`

**พูด:**
> "Architecture ของ Chainlink Functions ยังคงสมบูรณ์ใน contract  
> ข้อมูล NASA POWER จริง ถูก store บน Blockchain ถาวร  
> ในระบบ production ใช้ Chainlink Runtime Environment (CRE) แทน"

---

## ขั้นที่ 9 — Admin Dashboard

**คลิก:** Admin → `/admin`

- Stats cards: Total Projects, Total Evidence, Active Market
- Bar chart: Risk Distribution (Low/Med/High)
- Tab: Projects table — Risk Score, Trust Score, Trace link
- Tab: Leaderboard — ranked by trust score
- Tab: DAO Proposals — vote bars

---

## สรุประบบ (สำหรับปิด Demo)

| Component | Technology | จำนวน |
|---|---|---|
| Smart Contracts | Solidity 0.8.24 + Hardhat | 7 contracts on Sepolia |
| Token Standards | ERC-1155 + ERC-20 + ERC-721 | 3 token types |
| IPFS | Pinata API | real CID pinning |
| Risk Engine | NASA POWER API + OpenWeatherMap | real climate data |
| Frontend | React + Vite + TypeScript + Tailwind | 8 pages |
| Backend | Express + Prisma + Neon PostgreSQL | deployed Render.com |
| DAO | OpenZeppelin Governor | on-chain governance |
| Oracle | Chainlink Functions architecture | ownerFulfill demo mode |

**Contract Addresses (Sepolia):**
```
PlatformToken:    0xe51A5687ad95b737D6DF0DF89CD2419375214ec5
CarbonMarket:     0x604058B4a9b04D9973B4BA547C4e7aedeCc71e4b
RetireCertificate: 0xF63997bD192Ae1E33FC671E0C88AD39748354f44
GovernanceToken:  0x856D3bec8E3108CA0E2B36F7aC354Ab2D387FbcB
GovernorDAO:      0x7F208C3b6c756FBE1eD392FE3D889B28Ca3A79Db
RiskOracle:       0xaa6D3708FFE79b7EEE9c5f2CC631d74dfb7C52c6
```

---

## Q&A Cheat Sheet

**Q: ทำไมไม่ใช้ Polygon แทน Ethereum?**  
A: Sepolia Testnet เป็น official Ethereum testnet ที่รองรับ MetaMask ดีที่สุด — production สามารถ deploy บน Polygon ได้โดยเปลี่ยนแค่ network config

**Q: Chainlink Oracle ทำงานจริงไหม?**  
A: Contract architecture ถูกต้องสมบูรณ์ — Chainlink Functions Sepolia testnet sunset June 15, 2026 จึงใช้ ownerFulfill() สำหรับ demo แทน, ข้อมูล NASA POWER ยังเป็น real data

**Q: IPFS ข้อมูลหายได้ไหม?**  
A: CID ถูก pin บน Pinata — ไม่หาย ตราบที่ subscription active hash บน blockchain verify ได้เสมอแม้ IPFS gateway เปลี่ยน

**Q: รองรับ real USDC ได้ไหม?**  
A: PlatformToken (PLAT) ใช้เป็น utility token แบบ ERC-20 — production เปลี่ยนเป็น USDC (Circle) ได้ทันทีโดยเปลี่ยน address ใน constructor

**Q: Trust Score คำนวณจากอะไร?**  
A: `trustScore = 100 - riskScore + 8` โดย riskScore มาจาก blend: IoT confidence (30%) + Government confidence (30%) + Historical confidence (25%) + User input (15%) พร้อม anomaly penalty และ additionality bonus
