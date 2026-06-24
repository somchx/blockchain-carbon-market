# Backend API

> Base URL (production): `https://blockchain-carbon-market.onrender.com/api`  
> Local: `http://localhost:4000/api`  
> Framework: Express.js — ทุก route ขึ้นต้นด้วย `/api`  
> Auth: ไม่มี — ทุก endpoint เปิดเป็น public (demo mode)

---

## Health

### `GET /api/health`

ตรวจสอบว่า backend ทำงานอยู่

**Response**
```json
{ "ok": true }
```

---

## Projects

### `GET /api/projects`

ดึงโครงการทั้งหมดที่ผ่านการประเมินแล้ว (เรียงจากใหม่ไปเก่า)

**Response** `StoredProject[]`
```json
[
  {
    "id": "P-1234567890",
    "createdAt": "2026-06-22T10:00:00.000Z",
    "onChainId": 1,
    "creatorAddress": "0xabc...",
    "input": { ... },
    "assessment": { ... }
  }
]
```

---

### `GET /api/projects/:id`

ดึงโครงการเดียวตาม ID

**URL Params**
- `id` — Project ID เช่น `P-1234567890`

**Response** `StoredProject` หรือ `404 { "message": "Project not found" }`

---

### `POST /api/projects/assess`

ยื่นโครงการและรับผลประเมินความเสี่ยง

Backend จะเรียก NASA POWER, OpenWeatherMap, MODIS จริง แล้วคำนวณ risk score และบันทึกลง PostgreSQL

**Request Body**
```json
{
  "sellerName": "Siam Green Energy",
  "projectName": "Surat Mangrove Restoration",
  "province": "SuratThani",
  "landAreaRai": 250,
  "projectType": "mangrove",
  "requestedCredits": 900,
  "selfReportedReduction": 820,
  "vintageYear": 2026,
  "creatorAddress": "0xabc...",
  "lat": 9.14,
  "lon": 99.33
}
```

| Field | Type | Required | หมายเหตุ |
|-------|------|----------|---------|
| `sellerName` | string | ✅ | ชื่อองค์กร/บุคคล |
| `projectName` | string | ✅ | ชื่อโครงการ |
| `province` | string | ✅ | จังหวัด (ภาษาอังกฤษ) |
| `landAreaRai` | number | ✅ | ขนาดพื้นที่ (ไร่) |
| `projectType` | enum | ✅ | `"forest"` / `"solar"` / `"biogas"` / `"mangrove"` |
| `requestedCredits` | number | ✅ | จำนวนเครดิตที่ขอ |
| `selfReportedReduction` | number | ✅ | ปริมาณ tCO2 ที่รายงานเอง |
| `vintageYear` | number | ✅ | ปี ค.ศ. (2020–2100) |
| `creatorAddress` | string | ❌ | wallet address ของ developer |
| `lat` / `lon` | number | ❌ | override พิกัด (ถ้าไม่ส่ง ระบบหาพิกัดจากจังหวัด) |

**Response** `201 Created`
```json
{
  "id": "P-1234567890",
  "createdAt": "2026-06-22T10:00:00.000Z",
  "input": { ... },
  "assessment": {
    "approvedReduction": 810,
    "approvedCredits": 810,
    "riskScore": 28,
    "trustScore": 72,
    "requiredStake": 1296,
    "recommendation": "approve",
    "sourceHash": "sha256:...",
    "tgoWarning": null,
    "signals": {
      "userInputConfidence": 91.1,
      "iotConfidence": 78.4,
      "governmentConfidence": 82.0,
      "historicalConfidence": 80.5,
      "anomalyScore": 12.2,
      "additionalityScore": 80.3,
      "weather_temperature": 28.4,
      "weather_humidity": 79,
      "weather_cloudCover": 40,
      "nasa_solarIrradiance": 5.21,
      "nasa_precipitation": 4.1,
      "ndvi": 0.67,
      "landCoverType": 2,
      "dataSource": "real"
    }
  }
}
```

**Errors**
- `400` — Validation failed (Zod errors)
- `500` — Assessment failed (external API error)

---

### `PATCH /api/projects/:id/on-chain`

ผูก on-chain project token ID เข้ากับ project record ใน database

เรียกหลัง `mintAndListCredits()` สำเร็จบน blockchain

**Request Body**
```json
{ "onChainId": 1 }
```

**Response** `200`
```json
{ "ok": true, "onChainId": 1 }
```

**Errors**
- `400` — `onChainId` ไม่ใช่ integer หรือน้อยกว่า 1
- `404` — Project not found

---

## Evidence Files

### `GET /api/projects/:id/evidence`

ดึงไฟล์หลักฐานทั้งหมดของโครงการ

**Response** `EvidenceFile[]`
```json
[
  {
    "id": "E-1234567890",
    "projectId": "P-1234567890",
    "fileName": "project_doc.pdf",
    "mimeType": "application/pdf",
    "fileSizeBytes": 204800,
    "ipfsCid": "QmXyz...",
    "ipfsUrl": "https://gateway.pinata.cloud/ipfs/QmXyz...",
    "uploadedAt": "2026-06-22T10:00:00.000Z"
  }
]
```

**Errors**
- `404` — Project not found

---

### `POST /api/projects/:id/evidence`

อัปโหลดไฟล์หลักฐานไปยัง IPFS ผ่าน Pinata

**Content-Type** `multipart/form-data`  
**Form Field** `file`

| Constraint | ค่า |
|-----------|-----|
| Max size | 10 MB |
| Allowed types | `application/pdf`, `image/jpeg`, `image/png`, `image/webp` |

**Response** `201 Created`
```json
{
  "id": "E-1234567890",
  "projectId": "P-1234567890",
  "fileName": "photo.jpg",
  "mimeType": "image/jpeg",
  "fileSizeBytes": 51200,
  "ipfsCid": "QmXyz...",
  "ipfsUrl": "https://gateway.pinata.cloud/ipfs/QmXyz...",
  "uploadedAt": "2026-06-22T10:00:00.000Z"
}
```

**Errors**
- `400` — ไม่มีไฟล์ หรือ file type ไม่รองรับ
- `404` — Project not found
- `502` — IPFS upload ล้มเหลว (Pinata)

---

## Retirement Certificate

### `POST /api/retire/certificate`

สร้าง NFT metadata สำหรับใบรับรอง carbon offset

Backend สร้าง SVG certificate image แล้วอัปโหลดทั้ง image และ metadata JSON ขึ้น IPFS  
ส่งคืน `tokenUri` เพื่อใช้ใน `retireCredits()` บน smart contract

**Request Body**
```json
{
  "buyerAddress": "0xabc...",
  "projectId": 1,
  "projectName": "Surat Mangrove Restoration",
  "province": "SuratThani",
  "projectType": "mangrove",
  "vintageYear": 2026,
  "creditsRetired": 50
}
```

**Response** `201 Created`
```json
{
  "cid": "QmXyz...",
  "url": "https://gateway.pinata.cloud/ipfs/QmXyz...",
  "tokenUri": "ipfs://QmXyz..."
}
```

**Errors**
- `400` — Validation failed
- `502` — IPFS upload ล้มเหลว

---

## Leaderboard

### `GET /api/leaderboard`

ดึงรายชื่อโครงการเรียงตาม `trustScore` จากมากไปน้อย

**Response**
```json
[
  {
    "rank": 1,
    "id": "P-1234567890",
    "sellerName": "Siam Green Energy",
    "projectName": "Surat Mangrove Restoration",
    "trustScore": 85,
    "riskScore": 15,
    "approvedCredits": 810
  }
]
```

---

## Verifier Access

### `GET /api/verifier-access/:walletAddress`

ตรวจสอบว่า wallet มีสิทธิ์ verifier หรือไม่

**URL Params**
- `walletAddress` — Ethereum address `0x` + 40 hex chars

**Response**
```json
{
  "walletAddress": "0xabc...",
  "status": "approved",
  "hasAccess": true,
  "requestedAt": "2026-06-22T10:00:00.000Z",
  "approvedAt": "2026-06-22T10:00:00.000Z",
  "approvalMode": "demo_auto"
}
```

**Errors**
- `400` — Invalid wallet address format

---

### `POST /api/verifier-access/request`

ขอสิทธิ์ verifier (auto-approve ในโหมด demo)

**Request Body**
```json
{ "walletAddress": "0xabc..." }
```

**Response** `201 Created`
```json
{
  "walletAddress": "0xabc...",
  "status": "approved",
  "hasAccess": true,
  "requestedAt": "2026-06-22T10:00:00.000Z",
  "approvedAt": "2026-06-22T10:00:00.000Z",
  "approvalMode": "demo_auto",
  "message": "Auto-approved for demo"
}
```

**Errors**
- `400` — Invalid wallet address

---

## Admin

### `GET /api/admin/stats`

ดูสถิติภาพรวมของระบบ (ไม่มี auth)

**Response**
```json
{
  "totalProjects": 12,
  "totalEvidence": 35,
  "riskLow": 5,
  "riskMed": 4,
  "riskHigh": 3
}
```

| Field | หมายเหตุ |
|-------|---------|
| `riskLow` | `riskScore < 35` |
| `riskMed` | `35 ≤ riskScore < 60` |
| `riskHigh` | `riskScore ≥ 60` |

---

## Oracle

### `GET /api/oracle/climate?lat=&lon=`

ดึงข้อมูลภูมิอากาศจาก NASA POWER API แบบ real-time  
ใช้สำหรับ Oracle Dashboard และ simulation การส่งข้อมูลขึ้น blockchain

**Query Params**
- `lat` — Latitude
- `lon` — Longitude

**Response**
```json
{
  "lat": "9.14",
  "lon": "99.33",
  "solar": 5.21,
  "precip": 4.1,
  "solarScaled": 521,
  "precipScaled": 410
}
```

`solarScaled` และ `precipScaled` คือค่า × 100 เพื่อส่งขึ้น Chainlink (integer format)

**Errors**
- `400` — `lat` หรือ `lon` ไม่ได้ส่งมา
- `502` — NASA POWER API ไม่ตอบสนอง

---

## Data Models

### StoredProject
```typescript
{
  id: string;               // "P-{timestamp}"
  createdAt: string;        // ISO 8601
  onChainId?: number;       // blockchain token ID (optional)
  creatorAddress?: string;  // wallet address (optional, lowercased)
  input: ProjectInput;
  assessment: RiskAssessment;
}
```

### RiskAssessment
```typescript
{
  approvedReduction: number;   // tCO2 อนุมัติแล้ว
  approvedCredits: number;     // credits อนุมัติ (= min(requested, approvedReduction))
  riskScore: number;           // 5–95 (สูง = เสี่ยงมาก)
  trustScore: number;          // 10–95 (สูง = น่าเชื่อถือมาก)
  requiredStake: number;       // TCUT ที่ developer ต้องวาง
  recommendation: "approve" | "review" | "reject";
  sourceHash: string;          // SHA256 hash สำหรับ on-chain verification
  tgoWarning?: string;         // คำเตือนถ้าเกินค่า TGO standard
  signals: DataSignals;
}
```

### DataSignals
```typescript
{
  userInputConfidence: number;       // 35–90
  iotConfidence: number;             // 20–92
  governmentConfidence: number;      // 15–90
  historicalConfidence: number;      // 30–92
  anomalyScore: number;              // 5–95
  additionalityScore: number;        // 20–90
  weather_temperature?: number;      // °C
  weather_humidity?: number;         // 0–100
  weather_cloudCover?: number;       // 0–100
  nasa_solarIrradiance?: number;     // W/m²
  nasa_precipitation?: number;       // mm/day
  ndvi?: number | null;              // -1 ถึง 1 (ค่าพืชพรรณ)
  landCoverType?: number | null;     // IGBP class 1–17
  dataSource: "real" | "fallback";
}
```

---

## External Services ที่ Backend ใช้

| Service | หน้าที่ | Auth |
|---------|--------|------|
| NASA POWER API | Solar irradiance, precipitation | ไม่ต้อง |
| OpenWeatherMap | อุณหภูมิ, ความชื้น, เมฆ | API Key |
| NASA MODIS | NDVI, land cover type | ไม่ต้อง |
| Pinata IPFS | เก็บไฟล์ evidence และ NFT metadata | JWT |
| PostgreSQL | ฐานข้อมูลหลัก | Connection string |

## Environment Variables

| Variable | Required | หมายเหตุ |
|----------|----------|---------|
| `PORT` | ❌ | default: 4000 |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `DATABASE_URL_DIRECT` | ✅ | Direct connection (Prisma migrations) |
| `OPENWEATHER_API_KEY` | ❌ | fallback ถ้าไม่มี จะใช้ค่า simulated |
| `PINATA_JWT` | ✅ | ต้องมีสำหรับ evidence upload และ certificate |
| `PINATA_GATEWAY` | ❌ | default: `https://gateway.pinata.cloud/ipfs` |
