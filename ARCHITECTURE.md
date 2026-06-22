# สถาปัตยกรรมระบบ Thailand Carbon Credit Market บน Blockchain

> **Research Prototype** — Sepolia Testnet | มิถุนายน 2026  
> เปรียบเทียบสิ่งที่วางแผนไว้ vs สิ่งที่ implement จริง พร้อม tech stack และ API ที่ใช้

---

## ภาพรวมระบบ

ระบบนี้คือ **ต้นแบบตลาดซื้อขายคาร์บอนเครดิตบน Blockchain** ที่ทำให้ Carbon Credit ตรวจสอบได้ โปร่งใส และลดปัญหาเครดิตปลอม/ใช้ซ้ำ โดยใช้ Ethereum Sepolia Testnet เป็นฐาน

---

## 1. สถาปัตยกรรมที่วางแผน vs ที่ implement จริง

### Users / Stakeholders

| กลุ่ม | วางแผน | ที่ทำจริง |
|---|---|---|
| Project Developer | ✅ | ✅ มีหน้า `/developer` ครบ: submit, stake, mint |
| Verifier / Oracle | ✅ | ✅ มีหน้า `/verifier` — Assessor wallet approve on-chain |
| Buyer | ✅ | ✅ มีหน้า `/buyer` — ซื้อ, portfolio, retire, NFT |
| Regulator / Observer | ✅ | ✅ มีหน้า `/explorer` (Traceability) และ `/admin` |
| Community / DAO | ✅ | ✅ มีหน้า `/dao` — Governor contract, CGOV token |

### Data Input

| แหล่งข้อมูล | วางแผน | ที่ทำจริง |
|---|---|---|
| IoT / Sensors | ✅ วางแผน | ⚠️ **แทนด้วย NASA MODIS NDVI** (ดาวเทียมวัดความเขียวพืช 250m ทุก 16 วัน) |
| External Data / ดาวเทียม | ✅ | ✅ MODIS NDVI + MODIS Land Cover + NASA POWER API + OpenWeatherMap |
| Manual Input / เอกสาร | ✅ | ✅ อัปโหลดไฟล์ PDF/รูปขึ้น IPFS ผ่าน Pinata |

> **หมายเหตุ:** IoT sensor จริงยังไม่ได้ต่อเข้ามา ใช้ดาวเทียม MODIS เป็น proxy แทน ให้ค่าใกล้เคียงกว่า weather API ทั่วไป

### Blockchain System Core — 6 ขั้น

| ขั้น | วางแผน | ที่ทำจริง |
|---|---|---|
| Data Submission & Staking | ✅ | ✅ Developer กรอกฟอร์ม → ระบบประเมิน risk → submit on-chain → deposit TCUT stake |
| Verification | ✅ | ✅ Assessor wallet เรียก `assessProject()` on-chain ผ่าน MetaMask |
| Mint Carbon Credit | ✅ | ✅ ERC-1155 (ไม่ใช่ ERC-20 ตามแผน) — 1 token = 1 tCO₂, แยก tokenId ตาม projectId |
| Trading | ✅ | ✅ Marketplace ใน contract (ไม่ใช่ DEX ภายนอก) — list ราคา, ซื้อด้วย TCUT |
| Staking & Slashing | ✅ | ✅ `depositProjectStake()`, `openChallenge()`, `finalizeChallenge()` ใน contract |
| Reputation | ✅ | ✅ trustScore บน chain, Trust Leaderboard ใน `/admin` |

### สิ่งที่ตัดออกจากแผนเดิม

| รายการ | เหตุผล |
|---|---|
| DEX ภายนอก (Uniswap-style) | ใช้ marketplace ใน contract แทน — เรียบง่ายกว่า เหมาะกับ prototype |
| Stablecoin (USDC/THB Coin) | ใช้ TCUT (ERC-20 utility token) แทน — ไม่ต้อง integrate payment gateway ภายนอก |
| Standards & Registry (Verra/Gold Standard) | ไม่ integrate — เป็น prototype, ไม่ได้ขอรับรองมาตรฐานจริง |
| Mobile App | ไม่ได้ทำ — web dashboard เพียงพอสำหรับ prototype |
| Challenge Period แบบ 3 วัน (ผ่าน UI) | contract มีอยู่ แต่ UI ไม่ได้เปิดใช้ เพราะรอ 3 วันไม่เหมาะกับ demo |

---

## 2. Tech Stack จริงที่ใช้

### Smart Contracts (Blockchain Layer)

| Contract | มาตรฐาน | หน้าที่ | Deploy Address (Sepolia) |
|---|---|---|---|
| `CarbonMarket.sol` | Custom | Core logic ทั้งหมด: submit, assess, stake, mint, buy, retire | `0x604058B4...4e4b` |
| `PlatformToken.sol` | ERC-20 | TCUT token — ใช้เป็น utility token ทั้งระบบ | `0xe51A5687...4ec5` |
| `CarbonCreditToken.sol` | ERC-1155 | Carbon Credit Token — แยก tokenId ต่อโปรเจกต์ | `0x7117D4fc...ec07` |
| `RetireCertificate.sol` | ERC-721 | NFT ใบรับรองการ offset — mint เมื่อ retire credits | `0xF63997bD...f44` |
| `GovernanceToken.sol` | ERC-20 (Votes) | CGOV token — ใช้โหวตใน DAO | `0x856D3bec...cB` |
| `GovernorDAO.sol` | OpenZeppelin Governor | DAO governance — propose, vote, execute | `0x7F208C3b...9Db` |
| `RiskOracleConsumer.sol` | Chainlink Functions | Oracle สำหรับดึง NASA POWER data on-chain | `0xaa6D3708...2c6` |

**Framework:** Hardhat v2.24 + Solidity ^0.8.24  
**Library:** OpenZeppelin Contracts v5.0.2, Chainlink Contracts v1.4.0  
**Testing:** 51+ unit tests (Hardhat + Jest)  
**Network:** Ethereum Sepolia Testnet (Chain ID: 11155111)

---

### Backend (API Layer)

**Runtime:** Node.js + TypeScript  
**Framework:** Express v4.21  
**Deploy:** [Render.com](https://render.com) (free tier, auto-deploy จาก GitHub)  
**URL:** `https://blockchain-carbon-market.onrender.com/api`

#### API Endpoints

| Method | Path | หน้าที่ |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/projects` | ดึงรายการโครงการทั้งหมด |
| `GET` | `/projects/:id` | ดึงโปรเจกต์เดี่ยว |
| `POST` | `/projects/assess` | ประเมิน risk score (เรียก NASA APIs + คำนวณ) |
| `POST` | `/projects/:id/evidence` | อัปโหลดไฟล์หลักฐาน → IPFS → บันทึก DB |
| `GET` | `/projects/:id/evidence` | ดูรายการ evidence files |
| `GET` | `/leaderboard` | Trust leaderboard ของ Developer |
| `GET` | `/admin/stats` | สถิติโครงการทั้งหมด |
| `GET` | `/oracle/climate` | ดึง climate data ณ lat/lon ที่ระบุ |
| `POST` | `/retire/certificate` | สร้างไฟล์ PDF ใบรับรองการ retire |

#### Middleware & Libraries

| Package | Version | ใช้ทำอะไร |
|---|---|---|
| `express` | v4.21 | HTTP server |
| `multer` | v2.2 | รับไฟล์ upload (PDF/รูป, max 10MB) |
| `zod` | v3.23 | Validate request body |
| `@prisma/client` | v6.19 | ORM สำหรับ PostgreSQL |
| `node-fetch` | v3.3 | เรียก NASA/MODIS/OpenWeatherMap APIs |
| `form-data` | v4.0 | ส่งไฟล์ไปยัง Pinata IPFS |

---

### Database

**Provider:** [Neon](https://neon.tech) — PostgreSQL Serverless  
**ORM:** Prisma v6.19  
**Schema:** 2 tables

```
CarbonProject   — เก็บข้อมูลโครงการ + risk assessment
EvidenceFile    — เก็บ metadata ของไฟล์ที่อัปโหลด (ไฟล์จริงอยู่บน IPFS)
```

---

### Frontend (UI Layer)

**Framework:** React v18.3 + TypeScript + Vite v5.4  
**CSS:** Tailwind CSS v4.3  
**Routing:** React Router DOM v7.18  
**Blockchain:** ethers.js v6.15  
**Deploy:** [Vercel](https://vercel.com) (auto-deploy จาก GitHub main branch)  
**URL:** `https://blockchain-carbon-market-frontend.vercel.app`

#### หน้าทั้งหมด

| Path | หน้าที่ |
|---|---|
| `/` | Landing page — เลือก role, system flow |
| `/manual` | คู่มือการใช้งาน — visual flow, อธิบาย risk score |
| `/developer` | Submit โครงการ, ดู assessment, stake, mint |
| `/verifier` | ตรวจสอบ signals, approve on-chain |
| `/buyer` | Marketplace, ซื้อ credit, portfolio, retire |
| `/explorer` | Traceability — event log ทุก transaction บน Sepolia |
| `/dao` | DAO Governance — propose, vote, execute |
| `/oracle` | Oracle monitor — NASA POWER data on-chain |
| `/admin` | Admin dashboard — risk distribution, leaderboard |

---

### IPFS Storage

**Provider:** [Pinata](https://pinata.cloud)  
**ใช้เก็บ:** ไฟล์ evidence (PDF/รูป) ของแต่ละโปรเจกต์  
**Gateway:** `https://gateway.pinata.cloud/ipfs/{CID}`  
**ทำงานยังไง:** Frontend ส่งไฟล์ → Backend รับ (multer) → อัปโหลดไปยัง Pinata API → ได้ CID กลับมา → บันทึก CID ใน Neon DB → Frontend แสดง link

---

## 3. External APIs ที่ใช้จริง

### NASA MODIS — ORNL DAAC API
**URL:** `https://modis.ornl.gov/rst/api/v1`  
**ต้องการ API Key:** ❌ ฟรี ไม่ต้องลงทะเบียน  
**ใช้ทำอะไร:** 2 products

| Product | Resolution | Period | ใช้คำนวณ |
|---|---|---|---|
| MOD13Q1 (NDVI) | 250m | ทุก 16 วัน | `iotConfidence` — วัดความเขียวพืชว่าสอดคล้องกับ project type ไหม |
| MCD12Q1 (Land Cover) | 500m | รายปี (IGBP) | `governmentConfidence` — cross-validate ว่าพื้นที่จริงเป็น forest/urban/crop |

**ตัวอย่าง NDVI logic:**
- Forest/Mangrove: NDVI สูง (> 0.5) → iotConfidence สูง
- Solar: NDVI ต่ำ (< 0.2, พื้นโล่ง) → iotConfidence สูง
- ChiangMai city center (IGBP class 13 = Urban) → governmentConfidence ต่ำสำหรับ forest claim

### NASA POWER API
**URL:** `https://power.larc.nasa.gov/api/temporal/monthly/point`  
**ต้องการ API Key:** ❌ ฟรี ไม่ต้องลงทะเบียน  
**ใช้ทำอะไร:** ดึงข้อมูลเฉลี่ยรายปีที่พิกัด lat/lon ของโครงการ

| Parameter | ใช้คำนวณ |
|---|---|
| ALLSKY_SFC_SW_DWN (W/m²) | Solar irradiance → `historicalConfidence` สำหรับ solar project |
| PRECTOTCORR (mm/day) | ปริมาณฝน → `historicalConfidence` สำหรับ forest/biogas |

### OpenWeatherMap API
**URL:** `https://api.openweathermap.org/data/2.5/weather`  
**ต้องการ API Key:** ✅ ใช้ OPENWEATHER_API_KEY ใน backend `.env`  
**ใช้ทำอะไร:** ดึงข้อมูล weather ปัจจุบัน ณ วันที่ submit

| Field | ใช้คำนวณ |
|---|---|
| temp (°C) | weather_temperature |
| humidity (%) | weather_humidity → ส่งผลต่อ anomaly detection |
| clouds (%) | weather_cloudCover → quality flag สำหรับ NDVI |

### Chainlink Functions (Oracle)
**Network:** Sepolia  
**ใช้ทำอะไร:** ดึง NASA POWER data on-chain ผ่าน `RiskOracleConsumer.sol`  
**สถานะ:** Deploy แล้ว แต่ subscription LINK ยังไม่ได้ fund — ใช้ backend API ทำงานแทนในปัจจุบัน

---

## 4. Risk Assessment Engine

หัวใจของระบบ — คำนวณใน `backend/src/riskEngine.ts` โดยใช้ข้อมูลจาก `dataAggregator.ts`

### แหล่งข้อมูล 4 ทาง

```
iotConfidence        ← NASA MODIS NDVI          weight: 30%
governmentConfidence ← NASA MODIS Land Cover    weight: 30%
historicalConfidence ← NASA POWER API           weight: 25%
userInputConfidence  ← ข้อมูลที่กรอกเอง        weight: 15%
```

### สูตรคำนวณ

```
confidenceBlend = iot×30% + government×30% + historical×25% + userInput×15%

riskScore = clamp(100 − blend + (anomalyScore × 0.45) − (additionalityScore × 0.2), 5, 95)

approvedReduction = selfReported × (blend/100) × ((100 − risk)/100)
approvedCredits   = min(requestedCredits, approvedReduction)

stakeMultiplier = 0.4 + (riskScore/100) × 1.8
requiredStake   = max(100, approvedCredits × multiplier)  [หน่วย TCUT]
```

### TGO Rate Validation

ตรวจสอบว่า credits ที่ขอไม่เกินขีดจำกัดของ Thailand GHG Organization:

| ประเภทโครงการ | สูงสุด (tCO₂/ไร่/ปี) |
|---|---|
| Forest | 3.5 |
| Mangrove | 6.0 |
| Solar | 8.0 |
| Biogas | 5.0 |

### Risk Level

| Risk Score | ระดับ | ความหมาย |
|---|---|---|
| < 45 | 🟢 Low Risk | ข้อมูลน่าเชื่อถือ — ผ่านได้ |
| 45–69 | 🟡 Med Risk | มีความไม่สอดคล้อง — Verifier ควรตรวจเพิ่ม |
| ≥ 70 | 🔴 High Risk | ขัดแย้งชัดเจน — ไม่ผ่านเกณฑ์ |

---

## 5. System Flow จริงที่ทำงานบน Sepolia

```
1. Developer กรอกฟอร์ม (province, type, area, credits)
         ↓
2. Backend ดึง NASA MODIS + NASA POWER + OpenWeatherMap
   คำนวณ Risk Score + Required Stake + TGO validation
         ↓
3. Developer กด "Submit On-Chain"
   → MetaMask ① → market.submitProject() → Pending
         ↓
4. Developer อัปโหลด evidence → Pinata IPFS → CID บันทึกใน Neon
         ↓
5. Developer กด Approve Token + Deposit Stake
   → MetaMask ② (approve TCUT) → MetaMask ③ (depositStake) → Staked
         ↓
6. Verifier ตรวจ signals + evidence IPFS
   Assessor wallet กด "Approve On-Chain"
   → MetaMask ④ → market.assessProject() → Assessed
         ↓
7. Developer กด "Mint & List"
   → MetaMask ⑤ → market.mintAndListCredits() → Minted
   → ERC-1155 Carbon Credit Token mint บน chain
         ↓
8. Buyer เข้า Marketplace → กด Buy
   → MetaMask ⑥ (approve TCUT) → MetaMask ⑦ (buyCredits) → ได้ token
         ↓
9. Buyer กด Retire
   → MetaMask ⑧ → market.retireCredits() → burn ERC-1155 → mint ERC-721 NFT
   → Backend สร้าง PDF certificate → upload IPFS
         ↓
10. Traceability Explorer
    อ่าน event logs จาก Sepolia ผ่าน Tenderly RPC
    แสดง full journey ของทุก credit พร้อม tx hash
```

---

## 6. การ Deploy

### Smart Contracts
```bash
cd contracts
npx hardhat run scripts/deploy.ts --network sepolia
```
- Deploy ครั้งเดียว ได้ address ทั้ง 7 contracts
- บันทึก addresses ใน `contracts/deployments/sepolia.json`
- Auto-generate `sepolia.frontend.env` สำหรับ copy ไปใส่ Vercel

### Backend
- **Platform:** Render.com (Web Service, free tier)
- **Auto-deploy:** push ไป GitHub main → Render build ใหม่อัตโนมัติ
- **Build command:** `npm run build` (tsc compile)
- **Start command:** `node dist/server.js`
- **Environment Variables ใน Render:**
  - `DATABASE_URL` — Neon PostgreSQL connection string
  - `DATABASE_URL_DIRECT` — Neon direct connection
  - `OPENWEATHER_API_KEY` — OpenWeatherMap API key
  - `PINATA_JWT` — Pinata JWT token
  - `PINATA_GATEWAY` — Pinata gateway URL

### Frontend
- **Platform:** Vercel
- **Auto-deploy:** push ไป GitHub main → Vercel build ใหม่อัตโนมัติ
- **Build command:** `npm run build` (Vite)
- **Environment Variables ใน Vercel (VITE_ prefix, baked at build time):**
  - `VITE_API_BASE_URL` — Render backend URL
  - `VITE_MARKET_ADDRESS` — CarbonMarket contract address
  - `VITE_UTILITY_TOKEN_ADDRESS` — TCUT token address
  - `VITE_CARBON_TOKEN_ADDRESS` — ERC-1155 address
  - `VITE_RETIRE_CERTIFICATE_ADDRESS` — ERC-721 address
  - `VITE_GOVERNANCE_TOKEN_ADDRESS` — CGOV address
  - `VITE_GOVERNOR_ADDRESS` — GovernorDAO address
  - `VITE_ORACLE_ADDRESS` — Chainlink oracle address
  - `VITE_ASSESSOR_ADDRESS` — Assessor wallet address
  - `VITE_CHAIN_ID` — 11155111 (Sepolia)

---

## 7. DAO Governance

**Contract:** OpenZeppelin Governor (standard)  
**Voting Token:** CGOV (GovernanceToken.sol) — total supply 1,000,000 CGOV

**Flow:**
1. Proposer สร้าง proposal (ระบุ target contract + calldata ที่จะ execute)
2. Voting period — ผู้ถือ CGOV vote FOR/AGAINST/ABSTAIN
3. ถ้าผ่าน quorum + majority → execute ได้
4. CarbonMarket ownership โอนไปยัง GovernorDAO แล้ว — admin calls ต้องผ่าน DAO vote

**ตัวอย่าง parameter ที่ DAO ควบคุมได้:**
- `setAssessor(address)` — เปลี่ยนผู้ตรวจสอบ
- `setTreasury(address)` — เปลี่ยน treasury
- `setReviewerBond(uint256)` — เปลี่ยนค่า bond ของ reviewer
- `platformFeeBps` — ค่าธรรมเนียมแพลตฟอร์ม (ปัจจุบัน 2%)

---

## 8. Limitation ของ Prototype นี้

| รายการ | Limitation |
|---|---|
| Network | Sepolia Testnet — ไม่ใช่ Mainnet, token ไม่มีมูลค่าจริง |
| TCUT Token | ไม่มี faucet อัตโนมัติ — ต้องโอนให้ผู้ใช้ด้วยมือ |
| IoT Sensor | ใช้ MODIS ดาวเทียมแทน — พิกัดอาจไม่ตรงพื้นที่จริงถ้าไม่กรอก GPS |
| Challenge System | Contract พร้อม แต่ UI ไม่ได้เปิด เพราะรอ deadline 3 วัน |
| Chainlink Oracle | Deploy แล้วแต่ยังไม่ได้ fund LINK subscription |
| Standards | ไม่ได้ integrate Verra / Gold Standard จริง |
| Scalability | Backend บน Render free tier — cold start ~30 วินาที |

---

## 9. Repository Structure

```
blockchain_project/
├── contracts/          # Solidity contracts + Hardhat
│   ├── src/            # 7 Solidity files
│   ├── scripts/        # deploy.ts, deploy-oracle.ts, redeploy-market.ts
│   ├── test/           # unit tests
│   └── deployments/    # address JSON + frontend.env
├── backend/            # Express API server
│   ├── src/
│   │   ├── server.ts           # Express entry point
│   │   ├── routes.ts           # API routes
│   │   ├── riskEngine.ts       # Risk score calculation
│   │   ├── dataAggregator.ts   # NASA/MODIS/OWM API calls
│   │   ├── store.ts            # DB read/write (Prisma)
│   │   ├── ipfsService.ts      # Pinata upload
│   │   └── certificateService.ts # PDF generation
│   └── prisma/schema.prisma    # DB schema
└── frontend/           # React + Vite app
    └── src/
        ├── pages/      # 8 pages (developer, verifier, buyer, etc.)
        ├── components/ # WalletBar, EvidenceUpload
        └── lib/        # web3.ts, contracts.ts (ABI), storage.ts
```

---

*อัปเดตล่าสุด: มิถุนายน 2026*
