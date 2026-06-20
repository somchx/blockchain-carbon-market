# แผนพัฒนา: High-Integrity Blockchain Carbon Credit Market

> **สถานะ:** วางแผน MVP — อ้างอิงจาก System Architecture Diagram  
> **เป้าหมาย:** ระบบต้นแบบที่ Demo ได้จริง ครบ flow ตั้งแต่ Submit → Verify → Mint → Trade → Traceability  
> **Timeline:** 8–10 สัปดาห์

---

## หลักการออกแบบจากบทความ (4 Steps → Mapped to This Project)

> มาจากบทความแนะนำ 4 ขั้นตอนการสร้างระบบ Carbon Credit บน Blockchain  
> แต่ละข้อ map กับสิ่งที่โปรเจกต์นี้ทำจริงไว้ด้านล่าง

### Step 1: กำหนดมาตรฐาน Token

**หลักการ:** 1 Carbon Token = 1 Carbon Credit  
**เลือก NFT หรือ ERC-20 ตามความเหมาะสม**

| ตัวเลือก | ข้อดี | ข้อเสีย | เหมาะกับ |
|---|---|---|---|
| ERC-20 | แลกเปลี่ยนง่าย, Fungible | ไม่ระบุ project ที่มา | Stablecoin จำลอง (PlatformToken) |
| ERC-721 (NFT) | ระบุ project ที่มาได้ชัดเจน | ซื้อขายครั้งละ 1 unit | ใบรับรองการ Retire |
| **ERC-1155** | **Fungible + Non-fungible, แยก batch ตาม project** | ซับซ้อนกว่า ERC-20 เล็กน้อย | **Carbon Credit Token ← เลือกอันนี้** |

**การตัดสินใจของโปรเจกต์นี้:**
- `CarbonCreditToken.sol` ใช้ **ERC-1155** — แต่ละ `tokenId` คือ 1 `projectId`
- 1 token = 1 carbon credit (ลดคาร์บอน 1 ตัน CO₂)
- ทำให้ Buyer สามารถซื้อ 10, 100, 500 credits จาก project เดียวกันได้
- ใน Marketplace แสดงราคาเป็น PLAT ต่อ 1 credit

```
ตัวอย่าง:
  projectId = 3 (ป่าชายเลนสุราษฎร์)
  tokenId   = 3
  balance   = 255  (มี 255 credits พร้อมขาย)
  price     = 100 PLAT per credit
```

---

### Step 2: เก็บเอกสารบน IPFS — Hash บน Blockchain

**หลักการ:** รูปปลูกป่า, ใบรับรอง, เอกสารโครงการ → เก็บบน IPFS → Hash บน Chain

**ทำไมไม่เก็บไฟล์บน Blockchain โดยตรง:**
- ไฟล์ PDF 1MB = gas ประมาณ $10,000+ (ไม่คุ้มค่าเลย)
- Blockchain เหมาะสำหรับ "ข้อพิสูจน์" ว่าไฟล์ไม่ถูกแก้ไข ไม่ใช่เก็บไฟล์เอง
- IPFS Hash (CID) ยาวแค่ 46 ตัวอักษร → gas ถูกมาก

**การ implement ในโปรเจกต์นี้:**

| Phase | วิธีเก็บ | เหตุผล |
|---|---|---|
| ~~MVP (ตอนนี้)~~ | ~~Base64 in-memory + mock hash~~ | ~~ยกเลิก — ทำจริงตั้งแต่ต้น~~ |
| **✅ Sprint 3 (ทำแล้ว)** | **Pinata API จริง** → CID กลับมาจาก IPFS network | Real IPFS pinning, URL เปิดได้จาก browser ทันที |

**Flow ที่ทำในระบบ:**
```
Developer อัปโหลดไฟล์ PDF
        ↓
Backend สร้าง mock IPFS hash = sha256(fileContent)[:46]
        ↓
Hash ถูกส่งไปกับ sourceDataHash ใน submitProject() on-chain
        ↓
ใครก็ตามสามารถ verify ได้ว่าไฟล์ตรงกับ hash บน blockchain
```

**ข้อมูลที่เก็บ on-chain (ใน `sourceDataHash`):**
```
IPFS_CID:QmXxx...  |  SHA256:abc123...  |  filename:evidence.pdf
```

---

### Step 3: Marketplace — Buy / Sell / Retire

**หลักการ:** ซื้อขาย Token ผ่าน Smart Contract ที่ควบคุมอัตโนมัติ

**สิ่งที่มีใน `CarbonMarket.sol` แล้ว:**
- `mintAndList()` — Seller ตั้งราคา + จำนวนที่ขาย
- `purchaseCredits()` — Buyer ซื้อด้วย PlatformToken (ERC-20)
- `CreditsPurchased` event — บันทึกทุก transaction บน blockchain

**สิ่งที่ต้องเพิ่ม (Retire):**
```solidity
// เพิ่มใน CarbonCreditToken.sol หรือ CarbonMarket.sol
function retireCredits(uint256 projectId, uint256 amount) external {
    // Burn token จาก wallet ของ buyer
    // Emit CreditsRetired(projectId, msg.sender, amount, block.timestamp)
    // บันทึกว่าคาร์บอนเครดิตถูก "ใช้" แล้ว (offset)
}
```

**ประเภท Order ใน Marketplace:**

| Action | ทำโดย | Smart Contract Function | เหมายเหตุ |
|---|---|---|---|
| **List (Sell)** | Developer | `mintAndList()` | ตั้งราคา + จำนวน |
| **Buy** | Buyer | `purchaseCredits()` | จ่าย PLAT, รับ Carbon Token |
| **Retire** | Buyer | `retireCredits()` (เพิ่มใหม่) | Burn token = ใช้ offset จริง |
| **Cancel** | Developer | ยังไม่มี → เพิ่มใน Phase 2 | ยกเลิก listing |

---

### Step 4: ทดสอบบน Testnet ก่อน Production

**หลักการ:** ทดสอบความเร็ว, ความปลอดภัย, UX บน Testnet ก่อน

**Testnet Strategy ของโปรเจกต์นี้:**

| Stage | Environment | วัตถุประสงค์ |
|---|---|---|
| **Development** | Hardhat local (`npx hardhat node`) | เร็วสุด, reset ได้ทุกเวลา, ไม่ต้องรอ block |
| **Testing** | Hardhat local + Jest unit tests | ทดสอบ contract logic ทุก function |
| **Demo / Staging** | Sepolia Testnet | ทดสอบ MetaMask UX, network latency, real wallet flow |
| **Production** | Polygon Mainnet หรือ Arbitrum (Phase 2) | Gas ถูก, throughput สูง |

**Checklist ก่อน Deploy ขึ้น Sepolia:**
- [ ] Unit tests ผ่านทุก contract function
- [ ] ทดสอบ flow ทั้งหมดบน Hardhat local
- [ ] ทดสอบ MetaMask UX ด้วย real account
- [ ] ตรวจสอบ gas estimate ทุก function
- [ ] ตรวจสอบว่า event ทุกอันถูก emit ถูกต้อง
- [ ] Frontend อ่าน Sepolia contract address ได้จาก `.env`

**การตั้งค่า Testnet ที่มีอยู่แล้ว:**
```bash
# Deploy ไป Sepolia
npm run deploy:sepolia -w contracts

# ดู deployment address
cat contracts/deployments/sepolia.frontend.env
```

**เปรียบเทียบ Polygon vs Ethereum Testnet:**

| | Polygon Mumbai (เก่า) / Amoy (ใหม่) | Sepolia (Ethereum) |
|---|---|---|
| Gas cost | ต่ำมาก (MATIC) | ปานกลาง (ETH) |
| Block time | ~2 วินาที | ~12 วินาที |
| MetaMask support | ดี | ดีมาก (native) |
| **แนะนำสำหรับ MVP** | Phase 2 | **Phase 1 ← ใช้อันนี้** |

---

## สิ่งที่มีอยู่แล้ว (Current State)

| Component | สถานะ | รายละเอียด |
|---|---|---|
| Smart Contract: `CarbonMarket.sol` | ✅ มีแล้ว | Submit, Stake, Mint, Buy, Challenge, Slash, Reward, **retireCredits** |
| Smart Contract: `CarbonCreditToken.sol` | ✅ มีแล้ว | ERC-1155 Carbon Token (1 tokenId = 1 project) |
| Smart Contract: `PlatformToken.sol` | ✅ มีแล้ว | ERC-20 Utility Token |
| Smart Contract: `RetireCertificate.sol` | ✅ เสร็จแล้ว | ERC-721 NFT — Mint เมื่อ Buyer retire credits |
| Backend: Risk Engine | ✅ Real APIs | NASA POWER จริง + OpenWeatherMap จริง → riskScore ต่างกันตาม province/type |
| Backend: REST API | ✅ มีแล้ว | assess, projects, leaderboard, evidence, **retire/certificate** |
| Backend: Certificate Service | ✅ เสร็จแล้ว | สร้าง SVG cert → upload Pinata IPFS → คืน tokenUri |
| Frontend: Role-based UI | ✅ เสร็จแล้ว | React + Vite + Tailwind + MetaMask + 3 Dashboards |
| Developer Dashboard | ✅ เสร็จแล้ว | Submit → Stake → Mint & List (status-aware panel) |
| Verifier Dashboard | ✅ เสร็จแล้ว | Pending list + Risk bar charts + IPFS evidence + Approve/Reject on-chain |
| Buyer Marketplace | ✅ เสร็จแล้ว | Browse → Buy → Portfolio → **Retire & Get NFT Certificate** |
| Traceability Explorer | ✅ เสร็จแล้ว | `/explorer` — search on-chain ID → full event timeline + IPFS evidence |
| Evidence Upload → Pinata IPFS | ✅ เสร็จแล้ว | Drop zone → Pinata API → CID + IPFS URL |
| PostgreSQL + Prisma | ✅ เสร็จแล้ว | Neon serverless PostgreSQL — data persist ถาวร |
| Seed Data | ✅ เสร็จแล้ว | 5 โครงการไทยจริง (ดอนสัก/โคราช/ขอนแก่น/เชียงใหม่/ภูเก็ต) — risk จาก real API |
| Deploy: Backend | ✅ Live | https://blockchain-carbon-market.onrender.com |
| Deploy: Frontend | ✅ Live | https://blockchain-carbon-market-frontend.vercel.app |
| Auth / Login System | ❌ ยังไม่มี | ตอนนี้ใช้ role selector + wallet address แทน |
| Sepolia Testnet Deploy | ❌ ยังไม่มี | Contracts ยังอยู่บน Hardhat local — on-chain tx ต้องรัน node เอง |
| DAO Governance | ❌ ยังไม่มี | GovernorDAO.sol + GovernanceToken.sol + voting UI |

---

## System Flow (ตาม Diagram)

```
1. Collect Data          2. Submit Data      3. Verify           4. Mint Credit
   IoT / Manual  ──────►  + Stake      ──►  (Oracle/DAO)  ──►  (Token)
                          [Developer]        [Verifier]          [System Auto]
                              │                  │                    │
                              ▼                  ▼                    ▼
5. Trade (DEX)          6. Settle           7. Reputation Update & Reward/Slash
   Marketplace     ──►  (Stablecoin)  ──►  Trust Score + Event Log
   [Buyer]              [Smart Contract]    [On-chain]
```

### รายละเอียดแต่ละขั้น

| ขั้นตอน | Actor | On-chain | Off-chain |
|---|---|---|---|
| **1. Collect Data** | Project Developer | ❌ | ✅ IoT Sensor API + Satellite API + Government API + Manual form |
| **2. Submit + Stake** | Project Developer | ✅ `submitProject()` + `depositStake()` | ✅ Risk Engine → requiredStake |
| **3. Verify** | Verifier/Oracle | ✅ `publishAssessment()` | ✅ Verifier Dashboard → Approve/Reject |
| **4. Mint Token** | System (Auto) | ✅ `mintAndList()` — ERC-1155 | ✅ บันทึก tx hash + metadata |
| **5. Trade** | Buyer | ✅ `purchaseCredits()` | ✅ Marketplace UI |
| **6. Settle** | Smart Contract | ✅ Transfer Stablecoin + Token | - |
| **7. Reputation** | System | ✅ trustScore on-chain | ✅ leaderboard off-chain |

---

## Full Scope — ทุกอย่างทำจริงทั้งหมด

1. **Submit Project** — Form กรอกข้อมูลโครงการ + Risk Assessment จาก Real Data Sources
2. **IoT Sensor Data** — ดึงข้อมูลจาก Real Sensor API (OpenWeatherMap / GISTDA / NASA POWER)
3. **Satellite Data** — ดึง NDVI / land cover จาก Copernicus Sentinel หรือ NASA EARTHDATA
4. **Government DB** — เชื่อม TGO API (อบก.) หรือ Carbon Market Registry จริง
5. **Evidence Upload** — อัปโหลดไฟล์ PDF/รูปภาพไปยัง IPFS จริง ผ่าน Pinata API
6. **Stake Collateral** — Developer stake Platform Token บน Blockchain จริง
7. **Verifier / Oracle** — Multi-sig Verifier หรือ Chainlink Oracle สำหรับ data feed
8. **DAO Governance** — Governor contract สำหรับ vote เปลี่ยน parameters + approve Verifier
9. **Mint Carbon Token** — Mint ERC-1155 หลัง Approve อัตโนมัติ
10. **Marketplace** — List / Buy / Retire ด้วย Stablecoin ERC-20 (USDC บน Testnet)
11. **Real Stablecoin** — ใช้ USDC จริงบน Sepolia Testnet หรือ deploy USDC-compatible token
12. **Transaction Traceability** — ดู full journey ของ token บน blockchain
13. **Trust Score** — คำนวณ on-chain + อัปเดตจาก real data signals
14. **Mobile App** — Progressive Web App (PWA) ที่ใช้ได้บนมือถือ
15. **Retire Certificate** — NFT ใบรับรองการ offset คาร์บอน (ERC-721)

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL DATA SOURCES                        │
│  OpenWeatherMap API │ NASA POWER API │ Copernicus Sentinel (NDVI)  │
│  TGO / อบก. API    │ GISTDA Satellite │ Carbon Registry API        │
└───────────────────────────────┬────────────────────────────────────┘
                                │ REST / HTTPS
┌───────────────────────────────▼────────────────────────────────────┐
│                    USER INTERFACES (React + PWA)                    │
│  Developer Dashboard │ Verifier Dashboard │ Buyer Marketplace       │
│  Admin Panel │ Traceability Explorer │ DAO Governance Portal        │
└───────────────────────────────┬────────────────────────────────────┘
                                │ HTTP / WebSocket
┌───────────────────────────────▼────────────────────────────────────┐
│                    BACKEND (Express/TypeScript)                      │
│  Auth & Session │ Risk Engine │ Real Data Aggregator               │
│  PostgreSQL Store │ IPFS Bridge (Pinata) │ Audit Log               │
│  Chainlink Oracle Relay │ Event Indexer                            │
└───────────────────────────────┬────────────────────────────────────┘
                                │ ethers.js / JSON-RPC
┌───────────────────────────────▼────────────────────────────────────┐
│                 BLOCKCHAIN (Hardhat Local / Sepolia / Polygon)       │
│  CarbonMarket.sol    │ CarbonCreditToken.sol (ERC-1155)            │
│  GovernorDAO.sol     │ RetireCertificate.sol (ERC-721 NFT)        │
│  USDC.sol (Testnet)  │ Events: tx hash + state changes            │
└────────────────────────────────────────────────────────────────────┘
                                │
┌───────────────────────────────▼────────────────────────────────────┐
│                         IPFS / FILECOIN                             │
│  Pinata API — Evidence Files (PDF, Images, Certificates)           │
│  CID stored on-chain as sourceDataHash                             │
└────────────────────────────────────────────────────────────────────┘
```

### On-chain vs Off-chain Data

| ข้อมูล | เก็บที่ | เหตุผล |
|---|---|---|
| Project submission | Off-chain (Backend store) | ข้อมูลใหญ่, เปลี่ยนบ่อย |
| Risk assessment result | Off-chain + hash on-chain | ตรวจสอบได้ แต่ไม่แพง gas |
| Stake amount | On-chain | ต้องการความน่าเชื่อถือ |
| Verification result | On-chain (Assessor publish) | หลักฐานถาวร |
| Token ownership | On-chain (ERC-1155) | core asset |
| Trade history | On-chain (Events) | immutable |
| Evidence files | IPFS จริง ผ่าน Pinata API (CID on-chain) | ไฟล์ใหญ่ = gas แพงมาก แต่ CID เก็บ on-chain ได้ |
| Trust score | On-chain | สำคัญสำหรับ reputation |
| Audit logs | Off-chain (Backend) | volume สูง |

---

## Database Schema (Off-chain — Backend Store)

โปรเจกต์จะใช้ **PostgreSQL** เป็น primary store ตั้งแต่ต้น  
ย้ายออกจาก in-memory store (`store.ts`) ใน Sprint แรก

### ตารางหลัก (PostgreSQL)

```typescript
// users — เพิ่มใหม่
{
  id: string          // uuid
  walletAddress: string  // lowercase
  role: "developer" | "verifier" | "buyer" | "admin"
  name: string
  email?: string
  createdAt: string
}

// carbon_projects — มีบางส่วนแล้วใน store
{
  id: string
  sellerId: string       // FK → users
  projectName: string
  province: string
  projectType: string
  landAreaRai: number
  requestedCredits: number
  selfReportedReduction: number
  vintageYear: number
  status: "pending" | "assessed" | "staked" | "verified" | "minted" | "rejected" | "slashed"
  onChainProjectId?: number   // ID จาก blockchain
  createdAt: string
}

// project_evidence — เพิ่มใหม่
{
  id: string
  projectId: string     // FK → carbon_projects
  fileName: string
  fileType: string
  ipfsCid: string       // จริง เช่น QmXxx... จาก Pinata API
  ipfsUrl: string       // https://gateway.pinata.cloud/ipfs/QmXxx...
  fileSizeBytes: number
  uploadedAt: string
}

// risk_assessments — เพิ่ม real data source fields
{
  id: string
  projectId: string
  approvedCredits: number
  approvedReduction: number
  riskScore: number
  trustScore: number
  requiredStake: number
  recommendation: string
  sourceDataHash: string
  // real data signals
  iotTemperature: number        // จาก OpenWeatherMap API
  iotHumidity: number           // จาก OpenWeatherMap API
  satelliteNdvi: number         // จาก Copernicus Sentinel
  satelliteLandCover: string    // จาก NASA EARTHDATA
  govRegistryStatus: string     // จาก TGO/อบก. API
  govCarbonQuota: number        // จาก Carbon Registry
  historicalBaselineReduction: number
  dataFetchedAt: string         // timestamp ที่ดึงข้อมูลจริง
  assessedAt: string
}

// verification_records — เพิ่มใหม่
{
  id: string
  projectId: string
  verifierId: string    // FK → users
  decision: "approved" | "rejected"
  comment: string
  txHash?: string       // on-chain tx
  decidedAt: string
}

// marketplace_orders — เพิ่มใหม่
{
  id: string
  projectId: string
  onChainProjectId: number
  sellerAddress: string
  pricePerCredit: number
  availableCredits: number
  status: "active" | "sold_out" | "cancelled"
  createdAt: string
}

// token_transactions — เพิ่มใหม่
{
  id: string
  txHash: string
  eventType: "mint" | "purchase" | "retire"
  projectId: string
  onChainProjectId: number
  fromAddress: string
  toAddress: string
  amount: number
  blockNumber: number
  timestamp: string
}

// dao_proposals — เพิ่มใหม่
{
  id: string
  proposalId: string    // on-chain proposal ID จาก GovernorDAO.sol
  proposerAddress: string
  title: string
  description: string
  proposalType: "add_verifier" | "remove_verifier" | "change_param" | "slash_project"
  targetAddress?: string
  status: "active" | "passed" | "rejected" | "executed"
  votesFor: number
  votesAgainst: number
  deadline: string
  txHash: string
  createdAt: string
}

// retire_certificates — เพิ่มใหม่
{
  id: string
  tokenId: number       // ERC-721 NFT token ID
  buyerAddress: string
  projectId: string
  onChainProjectId: number
  creditsRetired: number
  retiredAt: string
  txHash: string
  ipfsCertCid: string   // certificate PDF บน IPFS
  ipfsCertUrl: string
}

// audit_logs — เพิ่มใหม่
{
  id: string
  actorId: string
  action: string
  targetType: string
  targetId: string
  detail: object
  timestamp: string
}
```

---

## Smart Contracts (สรุปสิ่งที่มีและต้องเพิ่ม)

### มีแล้ว: `CarbonMarket.sol`

| Function | สถานะ | หมายเหตุ |
|---|---|---|
| `submitProject()` | ✅ | Developer submit project |
| `publishAssessment()` | ✅ | Assessor (Verifier) publish result |
| `depositStake()` | ✅ | Developer stake utility token |
| `mintAndList()` | ✅ | Mint ERC-1155 + set price |
| `purchaseCredits()` | ✅ | Buyer ซื้อ carbon token |
| `registerReviewer()` | ✅ | Register as challenger/reviewer |
| `openChallenge()` | ✅ | Open fraud challenge |
| `voteOnChallenge()` | ✅ | Vote fraud/valid |
| `finalizeChallenge()` | ✅ | Execute slash or clear |
| `issueReward()` | ✅ | Reward honest project |

### ต้องเพิ่ม / ปรับปรุง ใน `CarbonMarket.sol`

| Feature | Action |
|---|---|
| `retireCredits()` | Buyer burn ERC-1155 token + emit `CreditsRetired` event |
| Events สำหรับ Traceability | Emit event พร้อม projectId ทุก action |
| `getProjectsByStatus()` | Query helper สำหรับ Verifier Dashboard |

### ต้องสร้างใหม่

| Contract | วัตถุประสงค์ | มาตรฐาน |
|---|---|---|
| `GovernorDAO.sol` | DAO voting สำหรับ add/remove Verifier, เปลี่ยน parameter, slash project | OpenZeppelin Governor |
| `GovernanceToken.sol` | Token สำหรับ vote ใน DAO (1 token = 1 vote) | ERC-20 Votes |
| `RetireCertificate.sol` | Mint NFT ใบรับรองการ offset คาร์บอน เมื่อ Buyer retire credits | ERC-721 |
| `USDCTestnet.sol` | USDC-compatible ERC-20 สำหรับ Testnet (6 decimals เหมือน USDC จริง) | ERC-20 |

### Contract Architecture

```
GovernanceToken (ERC-20 Votes)
       │ vote weight
       ▼
GovernorDAO ──► execute proposals ──► CarbonMarket (change params)
                                  └──► add/remove Verifier role

CarbonMarket ──► CarbonCreditToken (ERC-1155, mint/burn)
             └──► RetireCertificate (ERC-721, mint on retire)
             └──► USDCTestnet (ERC-20, payment)
```

---

## Backend API — สิ่งที่มีและต้องเพิ่ม

### มีแล้ว

```
GET  /api/health
GET  /api/projects
GET  /api/projects/:id
GET  /api/leaderboard
POST /api/projects/assess
```

### ต้องเพิ่ม

```
# Auth
POST /api/auth/register          — register ด้วย wallet address
POST /api/auth/login             — login + assign role
GET  /api/auth/me                — get current user profile

# Evidence
POST /api/projects/:id/evidence  — upload evidence file
GET  /api/projects/:id/evidence  — list evidence ของ project

# Verification
GET  /api/verifier/pending       — list projects ที่รอ verify (role: verifier)
POST /api/verifier/:id/approve   — approve + call publishAssessment on-chain
POST /api/verifier/:id/reject    — reject + บันทึกเหตุผล

# Marketplace
GET  /api/marketplace/orders     — list active sell orders
POST /api/marketplace/buy        — record purchase (หลัง on-chain tx)

# Traceability
GET  /api/trace/:onChainId       — ดู full history ของ project → token → transactions

# Admin
GET  /api/admin/users            — list users
PUT  /api/admin/users/:id/role   — change user role
GET  /api/admin/audit-logs       — audit logs ทั้งหมด
POST /api/admin/slash/:projectId — trigger slash

# Blockchain Events (Sync)
POST /api/sync/events            — backend sync events จาก blockchain
```

---

## Frontend Pages — สิ่งที่มีและต้องสร้าง

### มีแล้ว (ปัจจุบัน)
- Single-page App ที่มี form submit + on-chain interaction เบื้องต้น

### ต้องสร้าง (แยกตาม Role)

```
pages/
├── auth/
│   ├── Login.tsx             — connect wallet + เลือก role
│   └── Register.tsx          — กรอกชื่อ + role
│
├── developer/
│   ├── SubmitProject.tsx     — form + risk assessment preview
│   ├── UploadEvidence.tsx    — อัปโหลดเอกสาร
│   ├── ProjectStatus.tsx     — ติดตามสถานะ: pending → verified → minted
│   └── MyTokens.tsx          — ดู token ที่ mint แล้ว
│
├── verifier/
│   ├── PendingProjects.tsx   — list รอ verify
│   ├── ProjectReview.tsx     — ดูรายละเอียด + evidence + risk score
│   └── ApproveReject.tsx     — modal ยืนยัน + comment
│
├── buyer/
│   ├── Marketplace.tsx       — list carbon tokens for sale
│   ├── BuyToken.tsx          — กด buy + MetaMask confirm
│   ├── Portfolio.tsx         — tokens ที่ถือ
│   └── RetireCredit.tsx      — burn token เพื่อ offset
│
├── admin/
│   ├── UserManagement.tsx    — จัดการ role
│   ├── AuditLogs.tsx         — activity log ทั้งหมด
│   ├── SlashProject.tsx      — slash fraudulent
│   └── SystemParams.tsx      — ตั้งค่า platform fee, bond, etc.
│
└── explorer/
    ├── TraceProject.tsx      — ค้นหา project → ดู token journey
    └── TxDetail.tsx          — ดู transaction detail + block
```

---

## User Flow แต่ละ Role

### Project Developer Flow
```
1. Connect MetaMask
2. Register (role: developer)
3. กรอกข้อมูลโครงการ (SubmitProject form)
4. ดู Risk Assessment preview (riskScore, trustScore, requiredStake)
5. อัปโหลดหลักฐาน (Evidence Upload)
6. Approve stake transaction บน MetaMask
7. Submit project (on-chain)
8. รอ Verifier ตรวจสอบ
9. เมื่อผ่าน → Token ถูก Mint อัตโนมัติ
10. Token ถูก List บน Marketplace
```

### Verifier Flow
```
1. Connect MetaMask (role: verifier — assigned โดย Admin)
2. เข้า Verifier Dashboard
3. เห็น list โครงการที่รอ verify
4. คลิก Review → ดูข้อมูล + evidence + risk signals
5. กด Approve หรือ Reject + ใส่ comment
6. ถ้า Approve → เรียก publishAssessment() on-chain (MetaMask)
7. ระบบ Mint Token อัตโนมัติหลัง approve
```

### Buyer Flow
```
1. Connect MetaMask (role: buyer)
2. เข้า Marketplace
3. ดู carbon tokens ที่ขายอยู่ (พร้อม project info + riskScore)
4. คลิก "Buy" → ใส่จำนวน
5. Approve Platform Token spending (MetaMask)
6. Confirm purchase (MetaMask)
7. Token เข้า Portfolio
8. (Optional) Retire credit เพื่อ carbon offset
```

### Admin Flow
```
1. Connect MetaMask (role: admin)
2. จัดการ user roles
3. ดู audit logs
4. Slash โครงการที่ถูก report ว่า fraud
5. ปรับ platform parameters
```

---

## Development Plan (12–16 สัปดาห์ — Full Real Implementation)

### ~~Sprint 1: Foundation — Database + Auth~~ → ✅ เสร็จแล้ว (ปรับแผน)

> **สิ่งที่ทำจริง (แทน Sprint 1 เดิม):**
> - ติดตั้ง **React Router v6** + **Tailwind CSS v4** (@tailwindcss/vite)
> - สร้าง **Role Selector** landing page — เลือก role + System flow diagram
> - สร้าง **Developer Dashboard** — Submit form, Risk results, Status tracking, Stake on-chain
> - สร้าง **Verifier Dashboard** — Pending list, Risk bar charts คลิกขยาย, Approve/Reject on-chain
> - สร้าง **Buyer Marketplace** — Browse listings, Buy credits (Approve+Buy), Portfolio view
> - สร้าง **WalletBar** component — sticky header, wallet status, balance, switch role
> - สร้าง **shared types.ts** — ProjectForm, StoredProject, OnChainProject, PROJECT_STATUS
> - เปลี่ยน App.tsx จาก single-page → Router ที่แยก 3 routes
> - Build ผ่านสะอาด, Dev server รันที่ http://localhost:5173

---

### ~~Sprint 2 (สัปดาห์ 2–3): Real Data Aggregator~~ → ✅ เสร็จแล้ว

**สิ่งที่ทำจริง:**
- [x] สร้าง `backend/src/dataAggregator.ts` — แทน mockSources.ts ทั้งหมด
- [x] **NASA POWER API** (ไม่ต้อง key) — ดึง solar irradiance + precipitation ต่อจังหวัด ✅ ทำงานจริง
  - ChiangMai: solar=4.83 W/m², precip=3.51 mm/day
  - SuratThani: solar=4.92 W/m², precip=6.48 mm/day (ฝนเยอะ เหมาะ mangrove)
  - Phuket: solar=5.33 W/m², precip=7.22 mm/day
- [x] **OpenWeatherMap API** — temperature, humidity, cloudCover ต่อจังหวัด ⏳ key pending activation (~2h)
- [x] Province → lat/lon mapping สำหรับ API calls (6 จังหวัดหลัก)
- [x] In-memory cache: weather 10 นาที, NASA 24 ชั่วโมง
- [x] **Partial real data** — ถ้า OpenWeatherMap ยัง 401, ใช้ NASA POWER จริง + fallback weather
- [x] Signal derivation ตาม project type จริง (forest/mangrove → humidity, solar → cloud cover, biogas → temp)
- [x] `riskEngine.ts` — เปลี่ยนเป็น `async/await`, import จาก dataAggregator
- [x] `routes.ts` — `await assessProject()` + try-catch
- [x] `types.ts` — DataSignals เพิ่ม weather_temperature, weather_humidity, nasa_solarIrradiance, nasa_precipitation, dataSource
- [x] Test สด: Phuket Solar → `nasa_solarIrradiance: 5.33`, `historicalConfidence: 74` จากข้อมูลจริง

**Output:** Risk Engine ใช้ NASA POWER จริง 100% — historicalConfidence ต่างกันตามจังหวัดและ project type จริง  
**Risk ที่เจอ:** Promise.all ทำให้ถ้า OpenWeather fail → NASA data หายด้วย → แก้เป็น Promise.allSettled แทน  

---

### ~~Sprint 3 (สัปดาห์ 3–4): Real IPFS Evidence Upload~~ → ✅ เสร็จแล้ว

**สิ่งที่ทำจริง:**
- [x] สมัคร Pinata API key + ตรวจสอบ Auth (HTTP 200 ✅)
- [x] สร้าง `backend/src/ipfsService.ts` — form-data + node-fetch → Pinata API → รับ CID กลับมา
- [x] สร้าง `backend/src/routes.ts` — multer (10MB limit, PDF/JPG/PNG/WEBP only) + `POST /api/projects/:id/evidence` + `GET /api/projects/:id/evidence`
- [x] เพิ่ม `saveEvidence()` / `listEvidence()` ใน `backend/src/store.ts`
- [x] สร้าง `frontend/src/components/EvidenceUpload.tsx` — drag-and-drop UI, loading spinner, IPFS gateway link
- [x] ฝัง `EvidenceUpload` ใน Developer Dashboard ใต้แต่ละ project card
- [x] Verifier Dashboard โหลด evidence ทุก project ใน parallel แล้วแสดงพร้อม IPFS link
- [x] Pinata test upload สำเร็จ: CID = `QmVRdnyTnddffyJFCaiwTDx8WiSoZZwmZNgEZVAheeFF1H`
- [x] Build ผ่านสะอาดทั้ง backend และ frontend

**Output:** อัปโหลดไฟล์ PDF/รูปภาพ → Pinata API จริง → เปิด IPFS URL ได้ทันที  
**Risk ที่เจอ:** TypeScript `req.params.id` typed เป็น `string | string[]` → fix ด้วย `as { id: string }`  

---

### Sprint 4 (สัปดาห์ 4–5): Developer Dashboard + Submit Flow
**งาน:**
- [ ] Developer Dashboard — SubmitProject form (ปรับจาก App.tsx เดิม)
- [ ] แสดง real data signals ที่ดึงมาจาก API (NDVI, weather, gov status)
- [ ] Project Status page (pending → assessed → staked → verified → minted)
- [ ] เชื่อม on-chain `submitProject()` + `depositStake()` กับ real wallet
- [ ] เพิ่ม `/api/projects/:id/evidence` endpoints

**Output:** Developer submit project ครบ flow พร้อม real data  
**Test:** Submit → ดู real signals → stake MetaMask → status = "Pending Verification"  
**Risk:** Gas estimate ต่างกันใน Hardhat vs Sepolia → ทดสอบทั้งสอง  

---

### Sprint 5 (สัปดาห์ 5–6): Verifier Dashboard
**งาน:**
- [ ] Verifier Dashboard — list pending projects
- [ ] Project Review page — ดู real signals, evidence (IPFS link), risk score
- [ ] Approve → Verifier sign `publishAssessment()` on-chain ด้วย wallet ตัวเอง
- [ ] Reject → บันทึก reason + อัปเดต status ใน PostgreSQL
- [ ] เพิ่ม `/api/verifier/*` endpoints
- [ ] WebSocket notification เมื่อ status เปลี่ยน (ใช้ Socket.IO)

**Output:** Verifier Approve/Reject ได้จริง, Mint token อัตโนมัติหลัง approve  
**Test:** Verifier approve on Sepolia → tx confirm → project status = "minted" → Developer เห็น token  
**Risk:** Verifier ต้องมี ETH บน Sepolia สำหรับ gas → เตรียม faucet ETH ล่วงหน้า  

---

### Sprint 6 (สัปดาห์ 6–7): USDC Stablecoin + Marketplace
**งาน:**
- [ ] Deploy `USDCTestnet.sol` (ERC-20, 6 decimals เหมือน USDC จริง) บน Sepolia
- [ ] หรือใช้ Circle Testnet USDC (ถ้ามี faucet บน Sepolia)
- [ ] ปรับ Marketplace ให้รองรับ USDC (6 decimals) แทน PlatformToken
- [ ] Marketplace page — list tokens + project info + real NDVI + IPFS evidence link
- [ ] Buy flow — approve USDC spending + `purchaseCredits()` on MetaMask
- [ ] Portfolio page — Buyer ดู tokens ที่ถือ
- [ ] เพิ่ม `/api/marketplace/*` endpoints

**Output:** Buyer ซื้อ Carbon Token ด้วย USDC-compatible stablecoin  
**Test:** Buyer buy 10 credits → USDC หัก, ERC-1155 token เข้า wallet  
**Risk:** Circle Testnet USDC อาจไม่มีบน Sepolia → deploy USDCTestnet.sol เอง  

---

### Sprint 7 (สัปดาห์ 7–8): Retire Credits + NFT Certificate
**งาน:**
- [ ] สร้าง `RetireCertificate.sol` (ERC-721) — Mint NFT เมื่อ Buyer retire credits
- [ ] เพิ่ม `retireCredits()` ใน `CarbonMarket.sol` — burn ERC-1155 + mint ERC-721
- [ ] สร้าง certificate PDF อัตโนมัติ (ชื่อ Buyer, จำนวน credits, project, วันที่) → upload IPFS
- [ ] Retire UI บน Portfolio page
- [ ] แสดง NFT Certificate ในรูป + download PDF

**Output:** Buyer retire credits → ได้ NFT certificate + PDF บน IPFS  
**Test:** Retire 10 credits → ERC-1155 burn, ERC-721 mint, PDF เปิดได้จาก IPFS link  
**Risk:** PDF generation ใน Node.js — ใช้ `pdfkit` หรือ `puppeteer`  

---

### Sprint 8 (สัปดาห์ 8–9): DAO Governance
**งาน:**
- [ ] Deploy `GovernanceToken.sol` (ERC-20 Votes) — distribute ให้ Verifier/Admin
- [ ] Deploy `GovernorDAO.sol` (OpenZeppelin Governor) บน Sepolia
- [ ] DAO proposals: add/remove Verifier, change platform fee, slash fraudulent project
- [ ] DAO Governance Portal UI — propose, vote, execute
- [ ] เชื่อม `/api/dao/*` endpoints กับ GovernorDAO contract

**Output:** Community vote เพิ่ม Verifier ใหม่ได้จริงผ่าน DAO  
**Test:** Admin propose "add verifier 0xAbc..." → Holders vote → pass → Verifier role ถูก grant on-chain  
**Risk:** Governor contract มีหลาย parameter ต้องปรับ (quorum, voting period, timelock) → ทดสอบบน Hardhat ก่อน  

---

### Sprint 9 (สัปดาห์ 9–10): Traceability Explorer
**งาน:**
- [ ] Event indexer ใน backend — sync events จาก blockchain ลง PostgreSQL (ไม่ใช่ in-memory)
- [ ] `token_transactions` table — บันทึก mint, purchase, retire ทุก event
- [ ] Traceability page — search project → ดู token journey
- [ ] แสดง: IPFS evidence, real data signals, tx hash, block, timestamp, current owner
- [ ] เพิ่ม `/api/trace/:id` endpoint

**Output:** ดู full lifecycle ของ Carbon Token ได้ตั้งแต่ collect data → retire  
**Test:** ค้นหา project → เห็น timeline → คลิก tx hash → เปิด Etherscan Sepolia ได้  
**Risk:** Event sync miss events เมื่อ backend offline → เพิ่ม from-block replay เมื่อ startup  

---

### Sprint 10 (สัปดาห์ 10–11): Admin + Staking/Slashing + PWA
**งาน:**
- [ ] Admin Dashboard — user management, audit logs
- [ ] Slash UI — trigger slash ผ่าน DAO proposal หรือ Admin direct (emergency)
- [ ] Trust Score dashboard — leaderboard real-time
- [ ] **PWA Setup** — Vite PWA Plugin, Service Worker, manifest.json
- [ ] ทดสอบบนมือถือ (iOS Safari + Android Chrome)
- [ ] WalletConnect integration สำหรับ mobile wallet

**Output:** Admin จัดการระบบได้, ใช้งานบนมือถือได้ผ่าน PWA  
**Test:** เปิดบน iPhone → Connect WalletConnect → ซื้อ token ได้  
**Risk:** WalletConnect v2 setup ซับซ้อน → ใช้ wagmi library ช่วย  

---

### Sprint 11 (สัปดาห์ 11–12): Multi-chain + Testnet Checklist
**งาน:**
- [ ] Deploy ทุก contract บน Polygon Amoy Testnet
- [ ] ปรับ frontend รองรับ chain switching (Sepolia ↔ Polygon Amoy)
- [ ] **Testnet Checklist ครบ:**
  - [ ] Unit tests ผ่านทุก contract function
  - [ ] Integration test: full flow บน Hardhat local
  - [ ] Gas estimate ทุก function บน Sepolia และ Polygon Amoy
  - [ ] Security check: reentrancy, overflow, access control
  - [ ] ตรวจสอบ event emit ทุกจุดผ่าน Etherscan / Polygonscan
  - [ ] ทดสอบ IPFS availability — unpin/repin test
  - [ ] ทดสอบ External API fallback เมื่อ API ล่ม

**Output:** ระบบทำงานได้บนสอง testnet พร้อม test coverage ครบ  
**Risk:** Polygon Amoy อาจมี bridge ที่ต้องใช้สำหรับ USDC → ทดสอบล่วงหน้า  

---

### Sprint 12 (สัปดาห์ 12–16): Polish, Security & Demo Prep
**งาน:**
- [ ] UI/UX polish — responsive, loading states, error messages ทุกหน้า
- [ ] Seed data — ตัวอย่างโครงการ 5 โครงการใน Thailand พร้อม real coordinates
- [ ] Security review — reentrancy guard, access control, input validation
- [ ] Performance test — API response time, blockchain tx latency
- [ ] End-to-end automated test (Playwright หรือ Cypress)
- [ ] เขียน demo script + presentation slides

**Output:** ระบบ Demo ได้ครบ flow จริงทุกขั้นตอน  
**Test Cases ครบ:**
  - [ ] Developer submit + IoT/satellite data pull + IPFS evidence upload + stake
  - [ ] Verifier review real signals + approve on Sepolia
  - [ ] System mint ERC-1155 token
  - [ ] Buyer ซื้อด้วย USDC-compatible token
  - [ ] Buyer retire + ได้ NFT certificate + PDF บน IPFS
  - [ ] Traceability แสดง full journey จาก data collection → retire
  - [ ] DAO vote เพิ่ม Verifier ใหม่
  - [ ] Admin slash fraudulent project

---

## Demo Script (สำหรับนำเสนอ)

```
1. เปิด Marketplace → เห็น carbon tokens จาก 3 โครงการใน Thailand
   (เช่น ป่าชายเลนสุราษฎร์, โซลาร์ฟาร์มนครราชสีมา, ก๊าซชีวภาพขอนแก่น)

2. Switch to Developer account
   → Submit "แปลงป่าชายเลน อ.ดอนสัก" 300 rai
   → ดู Risk Assessment: riskScore = 72, requiredStake = 500 PLAT
   → อัปโหลดหลักฐาน (PDF จำลอง)
   → Stake 500 PLAT → MetaMask confirm

3. Switch to Verifier account
   → เห็นโครงการใหม่ใน Pending list
   → Review: ดูข้อมูล + evidence + IoT confidence = 0.85
   → กด Approve → MetaMask confirm (publishAssessment)
   → ระบบ Mint 255 Carbon Credits อัตโนมัติ

4. Switch to Buyer account
   → เห็น "แปลงป่าชายเลน อ.ดอนสัก" ใน Marketplace
   → Buy 10 credits @ 100 PLAT each
   → MetaMask: approve + purchase
   → Portfolio: เห็น 10 Carbon Credits

5. Traceability Explorer
   → Search project "ดอนสัก"
   → เห็น timeline: Submit (Block 100) → Stake → Mint (Block 145) → Purchase (Block 210)
   → ดู tx hash ทุก event
   → ดู current owner ของ token

6. (Bonus) Admin slash fraudulent project
   → Switch to Admin
   → เลือกโครงการที่ flag ว่า fraud
   → Slash → stake ถูกตัด, token burn
```

---

## Tech Stack สรุป (Full Real Implementation)

| Layer | Technology | สถานะ | เหตุผล |
|---|---|---|---|
| Frontend | React + Vite + TypeScript | ✅ มีแล้ว | เร็ว, ecosystem ดี |
| PWA | Vite PWA Plugin + Service Worker | ❌ ต้องเพิ่ม | ใช้งานบนมือถือได้ |
| Styling | Tailwind CSS + shadcn/ui | ❌ ต้องเพิ่ม | เร็ว, clean, accessible |
| Blockchain | ethers.js v6 | ✅ มีแล้ว | — |
| Wallet | MetaMask + WalletConnect | ⚠️ MetaMask มีแล้ว | WalletConnect = mobile support |
| Backend | Express + TypeScript | ✅ มีแล้ว | — |
| Database | **PostgreSQL + Prisma ORM** | ❌ ต้องเพิ่ม | แทน in-memory store |
| Smart Contract | Solidity + Hardhat | ✅ มีแล้ว | — |
| Testnet | Hardhat local + **Sepolia** + **Polygon Amoy** | ⚠️ Sepolia config มีแล้ว | ทดสอบหลาย chain |
| **IPFS** | **Pinata API** (real IPFS pinning) | ✅ เสร็จแล้ว | Evidence upload จริง, CID verified |
| **IoT Data** | **OpenWeatherMap API + NASA POWER API** | ❌ ต้องเพิ่ม | Real environmental data |
| **Satellite Data** | **Copernicus Sentinel Hub API** หรือ **GISTDA** | ❌ ต้องเพิ่ม | NDVI + land cover จริง |
| **Government Data** | **TGO API** (อบก.) หรือ Carbon Registry endpoint | ❌ ต้องเพิ่ม | Carbon quota + project status |
| **DAO** | OpenZeppelin Governor + GovernanceToken | ❌ ต้องเพิ่ม | Decentralized governance |
| **Stablecoin** | USDC บน Testnet (Sepolia/Circle Faucet) หรือ deploy USDCTestnet.sol | ❌ ต้องเพิ่ม | แทน PlatformToken |
| **Retire NFT** | ERC-721 RetireCertificate.sol | ❌ ต้องเพิ่ม | ใบรับรอง carbon offset |
| Auth | Wallet address + JWT session | ❌ ต้องเพิ่ม | Stateless session |

---

## ความเสี่ยงหลักและการจัดการ

| ความเสี่ยง | ความน่าจะเป็น | Impact | การจัดการ |
|---|---|---|---|
| Gas cost สูงเกินไปบน Sepolia | กลาง | กลาง | ใช้ Hardhat local สำหรับ Demo หลัก |
| MetaMask UX ซับซ้อนสำหรับผู้ใช้ใหม่ | สูง | สูง | สร้าง guided tutorial + pre-approve |
| `publishAssessment()` ต้องการ assessor key | สูง | สูง | ให้ Verifier sign เอง หรือ backend sign ด้วย hardcoded key สำหรับ demo |
| In-memory store หายเมื่อ restart | สูง | กลาง | เพิ่ม persistence ง่ายๆ (JSON file) |
| Demo ใช้หลาย accounts | กลาง | สูง | เตรียม 4 MetaMask accounts ไว้ล่วงหน้า |

---

## ขั้นตอนถัดไปทันที (Next Actions)

### ✅ เสร็จแล้ว
- [x] React Router + Tailwind CSS
- [x] Role Selector Landing Page
- [x] Developer Dashboard (Submit + Stake on-chain)
- [x] Verifier Dashboard (Review + Approve/Reject on-chain)
- [x] Buyer Marketplace (Browse + Buy + Portfolio)
- [x] WalletBar component
- [x] **Evidence Upload** — drag-and-drop → Pinata API จริง → IPFS CID + URL
- [x] **IPFS Evidence ใน Verifier** — Verifier เห็นไฟล์ทุกอัน + ลิงก์ gateway.pinata.cloud
- [x] **Traceability Explorer** — `/explorer` page, search by on-chain ID → timeline of all events (ProjectSubmitted → ProjectAssessed → StakeDeposited → CreditsMinted → CreditsPurchased) พร้อม block number, tx hash, timestamp, IPFS evidence
- [x] **Mint Flow หลัง Approve** — Status-aware action panel ตาม project status: Pending(รอ) → Assessed(Stake) → Staked(Mint & List + price input) → Minted(View Marketplace) → Challenged/Slashed
- [x] **Real External APIs** — NASA POWER จริง (solar irradiance + precipitation ต่อจังหวัด) + OpenWeatherMap (key pending) แทน mockSources.ts ทั้งหมด

### 🔜 ถัดไป (ลำดับความสำคัญ)

1. ~~**PostgreSQL + Prisma**~~ ✅ เสร็จแล้ว
2. ~~**Deploy**~~ ✅ เสร็จแล้ว — Backend: Render · Frontend: Vercel
3. ~~**Retire Credits + NFT Certificate**~~ ✅ เสร็จแล้ว

### 🔜 ถัดไป (เลือกทำ)
4. **Deploy Contracts → Sepolia Testnet** — ให้ on-chain tx ทำงานบน deployed frontend ได้จริงโดยไม่ต้องรัน local node
5. **Seed Data** — สร้างโครงการตัวอย่าง 3–5 โครงการใน DB เพื่อ demo
6. **DAO Governance** — GovernorDAO.sol + GovernanceToken.sol + voting UI

### สมัคร API keys ที่ต้องใช้ก่อน Sprint 2:
- [ ] [Pinata API](https://www.pinata.cloud/) — IPFS pinning
- [ ] [OpenWeatherMap API](https://openweathermap.org/api) — free tier
- [ ] [NASA POWER API](https://power.larc.nasa.gov/) — ไม่ต้อง key
- [ ] [Copernicus Sentinel Hub](https://www.sentinel-hub.com/) — ต้องสมัคร

---

## ตารางสรุป: บทความ 4 Steps → โปรเจกต์นี้ (Real Implementation)

| Step | หลักการ | Implementation จริง | Sprint |
|---|---|---|---|
| **Step 1** | 1 Token = 1 Credit, เลือก ERC-1155 | ✅ มีแล้ว — `CarbonCreditToken.sol` ERC-1155 | — |
| **Step 2** | เก็บเอกสารบน IPFS, Hash บน Chain | ✅ Pinata API จริง → IPFS CID — Verifier เห็น evidence ได้ทันที | ✅ Sprint 3 เสร็จ |
| **Step 3** | Marketplace: Buy / Sell / **Retire** | Buy/Sell มีแล้ว + `retireCredits()` + ERC-721 NFT Certificate | Sprint 6–7 |
| **Step 4** | ทดสอบบน Testnet | Hardhat local → Sepolia → Polygon Amoy + full checklist | Sprint 11 |

---

*อัปเดตล่าสุด: 2026-06-21 — ครบ: PostgreSQL ✅ · Deploy ✅ · Retire NFT ✅ · Seed Data ✅ (5 โครงการ real API) · Next = Sepolia หรือ DAO*  
*Architect: Claude Code (claude-sonnet-4-6)*
