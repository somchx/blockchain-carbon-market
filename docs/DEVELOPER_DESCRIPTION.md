# Developer Dashboard

> หน้า: `/developer`  

---

## Opening — เริ่มด้วยปัญหาจริง

> "ลองนึกภาพว่าคุณเป็นเกษตรกรหรือองค์กรที่ปลูกป่าชายเลน 250 ไร่ในสุราษฎร์ธานี  
> คุณอ้างว่ากักเก็บคาร์บอนได้ 820 ตัน CO₂ ต่อปี  
> คำถามคือ — ใครจะเชื่อคุณ?  
> และระบบจะรู้ได้อย่างไรว่าตัวเลข 820 นั้นไม่ได้โกง?"

ระบบคาร์บอนเครดิตแบบเดิมตอบคำถามนี้ด้วยการส่งเอกสาร รอผู้ตรวจสอบมา site visit และเชื่อตัวเลขที่บริษัทระบุมา — กระบวนการที่ใช้เวลานานและยังขาดกลไกที่ตรวจสอบได้

หน้า Developer Dashboard นี้แสดงให้เห็นว่าระบบของเราจัดการกระบวนการนี้ใหม่อย่างไร

---

## หน้านี้คืออะไร

**Developer Dashboard** คือจุดเริ่มต้นของวงจรชีวิตคาร์บอนเครดิตทั้งหมด

ผู้พัฒนาโครงการ (Project Developer) ใช้หน้านี้เพื่อ

1. ยื่นข้อมูลโครงการพร้อมรับผลประเมินจาก AI Risk Engine
2. ส่งโครงการขึ้น Ethereum blockchain
3. วางหลักประกัน (Stake) TCUT เพื่อค้ำประกันข้อมูล
4. Mint Carbon Credits เป็น ERC-1155 token และนำขึ้น Marketplace

ทุกขั้นตอนเชื่อมโยงกับ smart contract บน Sepolia จริง

---

## ทัวร์หน้าจอ — 2 Tab หลัก

### Tab 1: Submit Project — ยื่นโครงการ

> _ชี้ไปที่ฟอร์มด้านซ้าย_

ข้อมูลที่ Developer กรอก

| ฟิลด์ | ความหมาย |
|-------|---------|
| ชื่อผู้พัฒนา / ชื่อโครงการ | ระบุตัวตนและชื่อ |
| จังหวัด | ระบบใช้แปลงเป็นพิกัด GPS โดยอัตโนมัติ |
| ประเภทโครงการ | Forest / Mangrove / Solar / Biogas — มีผลต่อเพดานเครดิต |
| พื้นที่ (ไร่) | ใช้คำนวณเพดานตามมาตรฐาน TGO |
| Credits ที่ขอ | จำนวนที่ Developer อยากได้ |
| การลดคาร์บอนที่รายงานเอง | ตัวเลขที่ Developer อ้างว่าทำได้ |
| ปี Vintage | ปีที่เครดิตชุดนี้อ้างอิง |

**จุดสำคัญ: เพดาน TGO**

> _ชี้ไปที่ warning box สีส้มที่ขึ้นเมื่อ credits เกินเพดาน_

ระบบมี reference rate จาก **Thailand Greenhouse Gas Management Organization (TGO)** คือ

| ประเภท | อัตรา (tCO2/ไร่/ปี) |
|--------|-------------------|
| Forest | 3.5 |
| Mangrove | 6.0 |
| Solar | 8.0 |
| Biogas | 5.0 |

ถ้า Developer ขอ credits เกินสิ่งที่พื้นที่ขนาดนั้นควรทำได้ตามมาตรฐาน TGO — ระบบแจ้งเตือนทันที  
นี่คือการ cross-check เบื้องต้น **ก่อนที่จะส่งข้อมูลใดๆ ไปประเมิน**

---

## หัวใจของระบบ: AI Risk Engine ที่ใช้ข้อมูลดาวเทียมจริง

เมื่อ Developer กด **"Assess Risk →"** ระบบทำสิ่งต่อไปนี้พร้อมกันใน backend

### ดึงข้อมูลจาก 3 แหล่งภายนอก

**1. NASA MODIS — ดาวเทียมถ่ายภาพทุก 16 วัน ความละเอียด 250m**

- **NDVI (Normalized Difference Vegetation Index)** — วัดความเขียวของพืชพรรณที่พิกัด GPS จริงของจังหวัด
  - ถ้าโครงการอ้างว่าปลูกป่า แต่ NDVI ต่ำ → พื้นที่ไม่มีต้นไม้จริง → Risk สูง
- **Land Cover Type** — ดาวเทียมบอกว่าพื้นที่นั้น "จริงๆ แล้วเป็นอะไร"
  - ถ้าอ้างว่าเป็น forest แต่ดาวเทียมเห็นเป็น urban / cropland → ขัดแย้ง → Risk สูง

**2. NASA POWER API — ข้อมูลภูมิอากาศ historical**

- แสงอาทิตย์เฉลี่ย (W/m²) ทั้งปี
- ปริมาณฝน (mm/day) เฉลี่ย
- โครงการ Solar ที่ขอ credits สูงมากในพื้นที่ที่มีแสงน้อย → ไม่น่าเป็นไปได้ → Risk สูง

**3. OpenWeatherMap — สภาพอากาศ ณ วันที่ยื่นจริง**

- อุณหภูมิ, ความชื้น, เมฆปกคลุม ณ ตำแหน่งโครงการ

> "ข้อมูลเหล่านี้ไม่ได้ขอจาก Developer  
> ระบบไปดึงมาเองจากแหล่งข้อมูลอิสระที่ Developer ไม่สามารถแก้ได้  
> นั่นคือจุดสำคัญที่ทำให้การประเมินน่าเชื่อถือมากกว่าระบบ self-reported แบบเดิม"

---

## สูตรคำนวณ — ความโปร่งใสของ Risk Engine

> _คลิกที่ "ดูวิธีคำนวณ Risk Score และ Approved Credits" ใน project card_

ระบบไม่ได้ซ่อนการคำนวณ — Developer เห็นสูตรได้ทันที

### Blend Score (ความน่าเชื่อถือโดยรวม)

```
blend = NDVI×30% + LandCover×30% + NASA×25% + UserInput×15%
```

น้ำหนักบอกว่า "ข้อมูลดาวเทียมสำคัญกว่าคำบอกเล่าของผู้ยื่น"

### Risk Score

```
riskScore = 100 − blend + (anomaly × 0.45) − (additionality × 0.2)
```

- `anomaly` = ความต่างระหว่าง credits ที่ขอกับ reduction ที่รายงาน — ยิ่งห่างกันมาก ยิ่งน่าสงสัย
- `additionality` = โบนัสถ้าโครงการพิสูจน์ได้ว่าสร้างผลลัพธ์เพิ่มเติมจริง

### Approved Credits

```
reduction = selfReported × (blend/100) × ((100−risk)/100)
approvedCredits = min(requested, reduction)
```

> "Developer ขอ 900 credits แต่ถ้า Risk Score สูงและ NDVI ต่ำ  
> อาจได้รับอนุมัติแค่ 650 credits  
> ระบบไม่ได้ให้ตามที่ขอ แต่ให้ตามที่ข้อมูลรองรับ"

### Required Stake (หลักประกัน)

```
multiplier = 0.4 + (riskScore/100) × 1.8
requiredStake = max(100, approvedCredits × multiplier) TCUT
```

- Risk 0 → multiplier 0.4x (stake น้อย)
- Risk 60 → multiplier 1.48x (stake สูงขึ้น)
- Risk 100 → multiplier 2.2x (stake สูงมาก)

> "ยิ่งข้อมูลน่าสงสัยมากขึ้น ต้องวางเงินค้ำประกันมากขึ้น  
> นี่คือกลไก economic incentive ที่จูงใจให้ Developer ส่งข้อมูลที่จริงตั้งแต่แรก"

### ที่มาของสูตร — อะไรอ้างอิงมาตรฐานจริง อะไรออกแบบสำหรับ Prototype

สูตรในระบบนี้ผสมระหว่าง **methodology ที่มีฐานในมาตรฐานสากล** กับ **design choice สำหรับ prototype** ที่ยังต้องผ่าน calibration ในโลกจริง

**ส่วนที่อิง Standard จริง**

| องค์ประกอบ | มาตรฐานที่รองรับ |
|-----------|----------------|
| TGO Rate (3.5 / 6.0 / 8.0 / 5.0 tCO₂/ไร่/ปี) | Thailand Greenhouse Gas Management Organization — T-VER Methodology |
| NDVI จาก NASA MODIS | Verra VCS, Gold Standard, IPCC Good Practice Guidance — standard tool ใน land-use carbon accounting |
| Land Cover Classification (IGBP class 1–17) | UNFCCC CDM (Clean Development Mechanism) — ใช้ validate project type |

NDVI และ Land Cover ไม่ใช่สิ่งที่ระบบนี้คิดขึ้นมาเอง — เป็น methodology ที่ตลาดคาร์บอนโลกใช้อยู่แล้ว จุดที่ต่างคือระบบนี้ดึงข้อมูลเหล่านั้นมาคำนวณโดยอัตโนมัติ แทนที่จะให้ผู้ตรวจสอบทำ manual เอง

**ส่วนที่ออกแบบสำหรับ Prototype**

น้ำหนักในสูตร blend (30% / 30% / 25% / 15%) สะท้อก logic ที่ถูกต้องว่า "ดาวเทียมน่าเชื่อกว่าคำบอกเล่า" แต่ตัวเลขเหล่านี้ยังไม่ผ่าน empirical calibration กับข้อมูลโครงการจริง ค่า anomaly factor 0.45 และ additionality factor 0.2 ก็ถูกเลือกให้สมเหตุสมผลในทิศทาง แต่ไม่ได้ pin มาจากงานวิจัยเฉพาะ ในโปรดักชันจริงต้อง backtest กับ dataset ที่รู้ผลลัพธ์แล้ว (เช่น โครงการที่ TGO approve/reject ไปแล้ว) เพื่อ calibrate น้ำหนักเหล่านี้

> "สิ่งที่ทำให้ระบบน่าเชื่อถือไม่ใช่ตัวเลขในสูตรอย่างเดียว  
> แต่คือ data sources อิสระที่ Developer แก้ไขไม่ได้ และ audit trail ที่ถูก lock บน blockchain"

---

## ผลการประเมิน — 3 ระดับ

| ผล | Risk Score | ความหมาย |
|----|-----------|---------|
| 🟢 Low Risk (Approve) | < 45 | NASA + ดาวเทียมยืนยันตรงกัน — ผ่านเกณฑ์ |
| 🟡 Med Risk (Review) | 45–69 | มีความไม่สอดคล้อง — Verifier ต้องตรวจ evidence เพิ่ม |
| 🔴 High Risk (Reject) | ≥ 70 | ข้อมูลขัดแย้งกับ satellite ชัดเจน — ไม่ผ่านเกณฑ์ |

ผลนี้เป็น **recommendation ให้ Verifier** — ไม่ใช่การตัดสินใจสุดท้ายของระบบ Verifier ยังสามารถ override ได้หลังตรวจ evidence

---

## Tab 2: Project List — ติดตามสถานะแต่ละโครงการ

> _สลับไป tab Project List_

### Status-Aware UI — ระบบรู้ว่าโครงการอยู่ขั้นไหน

ระบบอ่าน status จาก smart contract จริงแล้วแสดง action ที่เหมาะสมกับขั้นตอนนั้น

```
Status 0 = Submitted    → แสดง "⏳ Waiting for Verifier"
Status 1 = Assessed     → แสดงปุ่ม "🔒 Deposit Stake →"
Status 2 = Staked       → แสดงปุ่ม "🌱 Mint"
Status 3 = Listed       → แสดง "🌱 Live on Marketplace!" + link ไป /buyer
Status 4 = Challenged   → แสดง "⚠️ Under Challenge"
Status 5 = Slashed      → แสดง "❌ Slashed — Stake ถูกยึด"
```

> "Developer ไม่ต้องจำว่าตัวเองอยู่ขั้นไหน — ระบบรู้เองจาก blockchain state"

---

## 6 ขั้นตอนของ Developer — เดินทีละ step

> _ชี้ไปที่ sidebar ขั้นตอนด้านขวา_

### ขั้น 1: กรอกข้อมูลและ Assess Risk

กรอกข้อมูลโครงการ → กด "Assess Risk"  
Backend เรียก NASA, MODIS, OWM และคำนวณ risk score  
ใช้เวลา 5–10 วินาที

### ขั้น 2: Submit On-Chain

> _กดปุ่ม "📝 Submit On-Chain"_

MetaMask popup ขึ้น — Developer กด Confirm  
ระบบเรียก `market.submitProject()` บน Ethereum Sepolia โดยส่ง

- `ipfsUri` — URI ที่ชี้ไปยัง metadata บน IPFS
- `sourceHash` — SHA256 hash ของข้อมูลทั้งชุด (ป้องกัน data tampering)
- `requestedCredits`
- `vintageYear`

เมื่อ transaction สำเร็จ smart contract emit event `ProjectSubmitted` พร้อม on-chain ID  
ระบบ frontend จับ event นั้นมาบันทึก ID ทันที

### ขั้น 3: อัปโหลดหลักฐาน (Evidence)

> _ชี้ไปที่ EvidenceUpload component_

Developer อัปโหลด PDF หรือรูปภาพหลักฐาน  
ไฟล์ถูกส่งไปที่ IPFS ผ่าน Pinata → ได้ CID กลับมา  
Verifier สามารถเปิดดูหลักฐานจาก IPFS ได้โดยตรง — ไฟล์ที่อยู่ IPFS แล้วแก้ไขไม่ได้

### ขั้น 4: รอ Verifier

Verifier เปิดหน้า `/verifier` เห็น risk score, signals, และหลักฐาน IPFS  
ถ้า approve → ระบบเรียก `assessProject()` บน chain  
Status ของโครงการเปลี่ยนเป็น `Assessed`

### ขั้น 5: Deposit Stake

> _กดปุ่ม "🔒 Deposit Stake →"_

Developer ต้องวาง TCUT เป็นหลักประกัน  
ระบบตรวจ allowance ของ TCUT → ถ้าน้อยกว่า stake ที่ต้องการ จะ approve ให้อัตโนมัติก่อน  
จากนั้นเรียก `depositProjectStake()` บน chain

> "นี่คือ skin in the game ของ Developer  
> ถ้าภายหลัง Challenger พิสูจน์ได้ว่าข้อมูลไม่จริง  
> Stake นี้สามารถถูก slash — Developer เสียเงินจริง"

### ขั้น 6: Mint & List

> _กดปุ่ม "🌱 Mint"_

ระบบเรียก `mintAndListCredits()` บน chain  
Carbon Credits ถูก mint เป็น **ERC-1155 token** จำนวนเท่ากับ `approvedCredits`  
ราคาต่อ credit ถูกตั้งบน smart contract  
สถานะเปลี่ยนเป็น `Listed` → ขึ้น Marketplace ให้ Buyer ซื้อได้ทันที

---

## ความแตกต่างจากระบบเดิม

| กระบวนการ | ระบบเดิม | ระบบนี้ |
|----------|---------|--------|
| ตรวจสอบตัวเลข | เชื่อเอกสารที่ Developer ส่งมา | NASA MODIS + NASA POWER + OWM ตรวจโดยอิสระ |
| ใครอนุมัติ | คณะกรรมการในองค์กร | Verifier บน chain — บันทึกไม่ลบได้ |
| หลักประกัน | เอกสารสัญญา | TCUT stake ที่ lock ใน smart contract จริง |
| ตรวจสอบย้อนหลัง | ต้องขอเอกสารจากผู้ดูแล | ดูได้จาก Explorer ตลอด 24/7 |
| Carbon Credits | ใบรับรองกระดาษหรือ database entry | ERC-1155 token บน Ethereum — โอนได้, ตรวจได้ |
| ป้องกัน double count | ตรวจสอบ registry แบบ manual | Token burn เมื่อ retire — ยอดลดลงบน chain จริง |
| ใช้เวลาอนุมัติ | หลายสัปดาห์ถึงหลายเดือน | Risk assessment 10 วินาที, on-chain ไม่กี่นาที |

---

## เหตุใด Staking จึงสำคัญมาก

> "ในระบบเดิม Developer มีแรงจูงใจอยู่ด้านเดียวคือ 'ขอให้ผ่าน'  
> เพราะถ้าโกงได้ก็ได้เงินจากการขาย credits โดยไม่มีต้นทุน  
>
> แต่ถ้าต้องวาง Stake 1,000 TCUT ก่อน  
> แล้ว Stake นั้นอาจถูกยึดถ้าข้อมูลไม่จริง  
> ตอนนี้ Developer มีต้นทุนจริงถ้าโกง  
>
> นี่คือหลักการ skin in the game ที่ blockchain ทำให้บังคับได้โดยอัตโนมัติ  
> ไม่ต้องพึ่งกฎหมาย ไม่ต้องมีศาล — code บังคับเอง"

**สูตร Stake สะท้อน Risk:**

- Low Risk (score 20) → multiplier 0.76x → Stake น้อย
- High Risk (score 70) → multiplier 1.66x → Stake สูง

Developer ที่ส่งข้อมูลดีจะเสีย stake น้อย แต่ถ้าข้อมูลน่าสงสัยต้องวางมากขึ้น — เป็น automatic penalty ที่ internal risk score กำหนด

---

## sourceHash — เทคนิคป้องกัน Data Tampering

> _ชี้ไปที่ hash ด้านล่าง project card_

ทุกโครงการมี `sourceHash` ที่เป็น SHA256 ของข้อมูล + signals ทั้งชุด

```
sourceHash = SHA256(input + nasa_data + weather_data + ndvi + timestamp)
```

Hash นี้ถูกส่งขึ้น blockchain ตอน `submitProject()`

ถ้าภายหลังมีคนอ้างว่า "assessment ครั้งนั้นบอกว่า risk น้อยกว่านี้" — สามารถเอาข้อมูลดั้งเดิมมา hash ใหม่แล้ว verify กับ on-chain hash ได้ทันที  
**ปลอมแปลงย้อนหลังไม่ได้**

---

## Demo Mode — แสดงภาพรวมทั้งระบบ

> _เปิด toggle "Demo Mode" มุมบนขวา_

เมื่อเปิด Demo Mode จะเห็น **ทุกโครงการ** ที่มีในระบบ ไม่ใช่เฉพาะของ wallet นั้น  
ใช้สำหรับ demo ให้อาจารย์หรือผู้ชมเห็นภาพรวมว่ามีโครงการหลายประเภท หลายสถานะ

---

## ตัวอย่าง Signals ที่แสดงในแต่ละโครงการ

> _ชี้ไปที่ grid signals ใน project card_

| Signal | แหล่ง | ความหมาย |
|--------|-------|---------|
| iotConfidence | 🛰️ NDVI | MODIS ดาวเทียม — ความเขียวพืช 0–100 |
| governmentConfidence | 🛰️ LC | MODIS Land Cover — ประเภทที่ดินตรงไหม |
| historicalConfidence | NASA | แสงแดด/ฝน historical เหมาะกับโครงการไหม |
| userInputConfidence | Input | ความสอดคล้องของตัวเลขที่กรอก |
| anomalyScore | Input | ช่องว่างระหว่าง requested กับ reported |
| nasa_solarIrradiance | NASA | แสงอาทิตย์ (W/m²) |
| nasa_precipitation | NASA | ปริมาณฝน (mm/day) |
| weather_temperature | OWM | อุณหภูมิ (°C) วันนี้ |
| ndvi | 🛰️ | ค่าพืชพรรณ -1 ถึง 1 |
| landCoverType | 🛰️ | IGBP class 1–17 |
| dataSource | ระบบ | "real" ถ้าดึงข้อมูลจริงได้ |

---

## สรุปคุณค่าของ Developer Dashboard

| ใคร | ได้อะไร |
|-----|--------|
| **Project Developer** | ได้ผล assessment ที่อิงข้อมูลดาวเทียมจริงในไม่กี่วินาที แทนรอเดือน |
| **Verifier** | เห็น risk signals ครบก่อนตัดสินใจ ไม่ต้องพึ่งแค่เอกสารที่ Developer ส่งมา |
| **Buyer** | มั่นใจว่า credits ที่ซื้อมาผ่าน AI screening + Verifier แล้ว |
| **ระบบ** | Stake mechanism สร้างแรงจูงใจให้ Developer ส่งข้อมูลที่จริงตั้งแต่แรก |

---

## ข้อจำกัด (พูดด้วยความซื่อสัตย์)

### 1. Verifier ยังเป็นมนุษย์

Risk Engine บอกได้ว่า "น่าสงสัยแค่ไหน" แต่การอนุมัติสุดท้ายยังขึ้นอยู่กับ Verifier  
ใน prototype นี้มี Verifier เดียว (deployer) ใน production ควรมีกลไก multi-sig หรือ DAO vote สำหรับ high-risk projects

### 2. NDVI เป็นค่า Province-Level ไม่ใช่ Parcel-Level

ค่า NDVI ที่ดึงมาใช้พิกัดกลางของจังหวัด ไม่ใช่พิกัดแปลงที่ดินจริง  
ใน production ต้องให้ Developer ส่ง GPS coordinates ของพื้นที่จริง เพื่อ NDVI ของแปลงนั้นโดยเฉพาะ  
(ฟิลด์ Optional lat/lon มีให้กรอกแล้ว — แต่ยังไม่บังคับ)

### 3. Mint Price ตายตัวที่ 100 TCUT

ในโปรโตไทป์นี้ราคาต่อ credit ถูก hardcode ที่ 100 TCUT ใน Mint step  
ใน production ควรให้ Developer กำหนดราคาเองหรือ DAO กำหนด price floor

### 4. Stake Slashing ต้องผ่าน Challenge Process

Stake ไม่ถูก slash อัตโนมัติ — ต้องมี Reviewer เปิด challenge ก่อน  
รายละเอียดใน Verifier Dashboard

---

## Closing

> "Developer Dashboard พิสูจน์ว่า  
> การนำโครงการสิ่งแวดล้อมเข้าสู่ระบบคาร์บอนเครดิต  
> ไม่จำเป็นต้องผ่านกระบวนการที่มืดทึบ, ใช้เวลานาน, และพึ่งความเชื่อใจเพียงอย่างเดียว
>
> เมื่อข้อมูลดาวเทียม, สูตรคำนวณ, หลักประกัน และ transaction  
> ถูก embed ไว้ใน smart contract ที่ทุกคนตรวจสอบได้  
> การ 'โกง' มีต้นทุนสูงขึ้นมาก และร่องรอยอยู่บน chain ตลอดกาล"

---

## Q&A — คำถามที่มักถูกถาม

**Q: ถ้า Risk Score สูงมาก Developer ยื่นใหม่ได้ไหม?**  
A: ได้ — แต่ถ้าข้อมูลโครงการไม่เปลี่ยน signals จาก NASA/MODIS ก็ยังเหมือนเดิม  
วิธีที่ถูกต้องคือปรับตัวเลขให้สมเหตุสมผลขึ้น หรือส่งหลักฐานเพิ่มให้ Verifier

**Q: ทำไม Stake ถึงเป็น TCUT ไม่ใช่ ETH?**  
A: TCUT คือ utility token ของระบบที่ออกแบบมาสำหรับ stake, buy, reward ภายในระบบนี้  
การแยก token ทำให้ ETH (ค่า gas) ไม่ปะปนกับ token ที่ใช้ค้ำประกัน  
CGOV เป็นอีก token หนึ่งที่ใช้สำหรับ governance โหวตเปลี่ยนกฎเท่านั้น

**Q: ถ้าโครงการถูก slash แล้ว Developer จะทำอะไรได้?**  
A: Stake ที่ถูก slash จะถูกโอนไปที่ Challenger (reward) และ treasury (platform)  
Developer ไม่สามารถ reclaim ได้ นี่คือ economic penalty ที่ออกแบบมาป้องกัน fraud

**Q: ทำไมต้อง ERC-1155 ไม่ใช่ ERC-20?**  
A: ERC-20 ทุกหน่วยเหมือนกันหมด เหมาะกับ currency  
ERC-1155 รองรับหลาย token ID ในสัญญาเดียว แต่ละ ID แทนหนึ่งโครงการ  
ทำให้ credits จากโครงการ A กับ B แยกกันชัดเจน และตามย้อนหลังได้ว่า credit นี้มาจากโครงการไหน

**Q: sourceHash ใช้ทำอะไรจริงๆ?**  
A: เป็น cryptographic proof ว่า "ณ เวลาที่ submit risk assessment ได้ค่าเหล่านี้"  
ถ้าภายหลังมีการเถียงว่า Verifier ได้เห็นข้อมูลอะไร — hash ที่บันทึกบน chain พิสูจน์ได้  
เปรียบเหมือน digital fingerprint ของ assessment ที่ถูกจับเวลาไว้บน blockchain
