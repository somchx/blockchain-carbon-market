# Verifier Dashboard

> หน้า: `/verifier`  

---

## Opening — เริ่มด้วยจุดอ่อนของระบบเดิม

> "ในระบบคาร์บอนเครดิตที่มีอยู่ทั่วโลกตอนนี้  
> มีบทบาทหนึ่งที่ทรงอำนาจและ underrated มาก — คือ Verifier
>
> Verifier คือคนที่ต้องตัดสินว่า  
> 'โครงการนี้ลดคาร์บอนได้จริง 820 ตัน' — จริงหรือไม่
>
> แต่ในระบบเดิม Verifier ตัดสินจากอะไร?  
> จากเอกสารที่ Developer ส่งมาเอง  
> จาก site visit ที่ทำได้ปีละไม่กี่ครั้ง  
> และจากการตัดสินใจที่ไม่มีใครตรวจสอบย้อนหลังได้
>
> ถ้า Verifier ผิดพลาดหรือมีผลประโยชน์ทับซ้อน — ระบบทั้งหมดพังทันที"

Verifier Dashboard นี้สร้างขึ้นเพื่อเสริม Verifier ด้วยข้อมูลที่เป็นกลาง  
และบังคับให้ทุกการตัดสินใจของ Verifier ถูกบันทึกบน blockchain อย่างถาวร

---

## หน้านี้คืออะไร — และใครใช้

**Verifier Dashboard** คือ workspace ของ Verifier / Assessor ที่ใช้

- ดูรายการโครงการที่รอตรวจสอบ
- เปิดดู risk signals, ข้อมูล climate จากดาวเทียม และหลักฐาน IPFS
- อนุมัติหรือปฏิเสธโครงการบน Ethereum blockchain
- เปิด challenge โครงการที่น่าสงสัยหลัง mint แล้ว
- ลงคะแนน (vote) ร่วมกับ reviewer คนอื่น

---

## Verifier Access — ระบบ gating แบบมีหลักฐาน

> _ชี้ไปที่ screen ที่แสดง "Verifier Access Required" ถ้า wallet ไม่มีสิทธิ์_

ก่อนเห็นข้อมูลโครงการใดๆ ระบบตรวจสอบ 2 ชั้น

1. **Backend Check** — ระบบเรียก `GET /api/verifier-access/:wallet` เพื่อตรวจว่า wallet นี้ถูก approve แล้วหรือยัง
2. **On-chain Check** — ตรวจว่า wallet ลงทะเบียนเป็น Reviewer บน smart contract พร้อมวาง bond แล้วหรือยัง

> "ใน prototype นี้ใช้ auto-approve สำหรับ demo  
> ใน production จริงควรผ่านกระบวนการ vetting จาก DAO หรือองค์กรกำกับดูแล  
> เพราะ Verifier มีอำนาจ approve credit ได้โดยตรง — ต้องมีความรับผิดชอบ"

---

## Reviewer Registration — Skin in the Game ของ Verifier

> _ชี้ไปที่ Reviewer Registration Panel_

ก่อนจะ approve โครงการได้ Verifier ต้องผ่าน 2 เงื่อนไข

### เงื่อนไขที่ 1 — Register and Bond

```
market.registerReviewer() → lock TCUT bond ใน smart contract
```

Verifier ต้องวาง TCUT เป็นหลักประกัน ณ เวลา register

**Bond นี้เป็นสัญญาณของอะไร?**

> "การที่คุณยอมล็อก TCUT ไว้  
> หมายความว่าคุณพร้อมรับผิดชอบต่อการตัดสินใจของคุณ  
> ถ้าคุณ approve โครงการที่ fraud แล้วชุมชน challenge สำเร็จ  
> bond ของคุณอาจถูกหักด้วย"

### เงื่อนไขที่ 2 — Reputation Score (กำหนดโดย DAO)

```
ปัจจุบัน: ต้องมี reputation ≥ 50 คะแนนก่อน approve ได้
```

ค่านี้กำหนดโดย DAO — ผู้ถือ CGOV token โหวตเปลี่ยนได้  
Verifier ใหม่ที่เพิ่ง register จะมี reputation = 0  
ต้องสะสม reputation ก่อนจึงจะมีสิทธิ์ approve

**Reputation สะสมได้อย่างไร?**

| การกระทำ | Reputation เปลี่ยนแปลง |
|---------|---------------------|
| Challenge สำเร็จ (fraud confirmed) | เพิ่ม |
| Challenge ไม่สำเร็จ (ถูก reject) | ลด + bond ถูกหักบางส่วน |
| โหวตอยู่ฝั่งเสียงข้างมากที่ชนะ | (ขึ้นอยู่กับ implementation จริง) |

> "ระบบนี้สร้าง meritocracy ของ Verifier ขึ้นมา  
> Verifier ที่ตัดสินใจถูกบ่อยๆ จะมี reputation สูงขึ้น  
> และ reputation นั้นถูก track บน blockchain — โปร่งใสและ portable"

---

## ทัวร์หน้าจอหลัก

### Dashboard Stats — ภาพรวม 4 ตัวเลข

> _ชี้ไปที่ grid 4 กล่องด้านบน_

| ตัวเลข | ความหมาย |
|-------|---------|
| โปรเจคที่ตรวจได้ | ทั้งหมดที่ไม่ใช่ของ wallet ตัวเอง (ป้องกัน conflict of interest) |
| รอตรวจสอบ | submitted แล้วแต่ยังไม่ถูก approve |
| อนุมัติแล้ว | status 1, 2, หรือ 3 (Assessed, Staked, Listed) |
| Challenge / Slashed | status 4 หรือ 5 — ต้องจับตามอง |

**จุดสำคัญ:** ระบบ filter โครงการของตัวเองออกอัตโนมัติ  
Verifier ไม่สามารถ approve โครงการที่ตัวเองเป็น Developer ได้

---

### Project Card — ข้อมูลในทันที

> _กดเลือกโครงการหนึ่งเพื่อขยาย_

แต่ละ project card แสดง

- ชื่อโครงการ, Developer, จังหวัด, ขนาดพื้นที่
- **Risk badge** — Low / Medium / High Risk พร้อม score
- **Status badge** — อ่านจาก blockchain ตรงๆ ไม่ใช่จาก database

เมื่อกด expand เห็น 3 section

---

### Section 1 — หลักฐาน IPFS

> _ชี้ไปที่ evidence files section_

ไฟล์ที่ Developer อัปโหลดไว้ (PDF, รูปภาพ) แสดงพร้อม IPFS CID  
Verifier คลิกเปิดดูได้โดยตรงจาก IPFS gateway

**ทำไมนี่ถึงสำคัญ?**

ระบบเดิม: Developer ส่ง PDF ทาง email — ไฟล์ที่ส่งมาอาจถูกแก้ก่อนส่ง และหลัง Verifier ดูแล้ว ไม่มีทางพิสูจน์ว่า Verifier เห็นเอกสารฉบับไหน

ระบบนี้: CID ของไฟล์ถูก pin ไว้บน IPFS — ถ้าเนื้อหาเปลี่ยน CID เปลี่ยน  
และ CID นั้น hash ไว้ใน `sourceHash` ที่ submit ขึ้น blockchain แล้ว  
**มีหลักฐาน cryptographic ว่า Verifier เห็นเอกสารฉบับนั้นจริง**

---

### Section 2 — Risk Signals พร้อม Progress Bar

> _ชี้ไปที่ signal bars ด้านซ้าย_

ทุก signal แสดงเป็น progress bar สี

| สี | ความหมาย |
|----|---------|
| 🟢 เขียว | > 70 — น่าเชื่อถือ |
| 🟡 เหลือง | 40–70 — ปานกลาง |
| 🔴 แดง | < 40 — น่าสงสัย |

Verifier เห็นทันทีว่า signal ไหน "ดึงคะแนน" โครงการลง  
โดยไม่ต้องอ่านตัวเลขทีละตัว

**Signals ที่สำคัญที่สุดสำหรับ Verifier**

- **iotConfidence (NDVI)** — ดาวเทียม MODIS เห็นพืชพรรณจริงไหม
- **governmentConfidence (Land Cover)** — ดาวเทียมยืนยันประเภทที่ดินตรงกับที่อ้างไหม
- **historicalConfidence (NASA)** — สภาพอากาศ historical สอดคล้องกับโครงการไหม
- **anomalyScore** — ช่องว่างระหว่าง requested กับ reported — สูง = น่าสงสัย

---

### Section 3 — Assessment Summary

> _ชี้ไปที่ Assessment panel ด้านขวา_

| ข้อมูล | ความหมาย |
|-------|---------|
| Requested Credits | Developer ขอมาเท่าไร |
| Approved Credits | ระบบ AI คำนวณว่าควรได้เท่าไร |
| Approved Reduction | ปริมาณ tCO2 ที่ยืนยันได้ |
| Required Stake | TCUT ที่ Developer ต้องวาง |
| Trust Score | ความน่าเชื่อถือโดยรวม 0–100 |

Verifier เห็นทันทีว่า AI แนะนำให้ approve เท่าไร และ "ลดลง" จากที่ขอมากน้อยแค่ไหน

---

## การ Approve On-Chain — การตัดสินใจที่ลบไม่ได้

> _กดปุ่ม "✅ Approve On-Chain"_

เมื่อ Verifier กด Approve ระบบเรียก

```solidity
market.assessProject(
  onChainId,
  approvedCredits,
  riskScore,
  trustScore,
  requiredStake
)
```

Transaction นี้ทำ 3 อย่างพร้อมกัน

1. บันทึก `approvedCredits` ลงใน project state บน chain
2. เปลี่ยน status จาก `Submitted` → `Assessed`
3. Emit event `ProjectAssessed` พร้อม timestamp และ block number

**ทำไมนี่ถึง game-changing?**

| ระบบเดิม | ระบบนี้ |
|---------|--------|
| Verifier ส่ง report ทาง email | Transaction บน blockchain ระบุว่าใคร approve |
| ไม่รู้ว่า Verifier ดูข้อมูลอะไรก่อนตัดสิน | sourceHash พิสูจน์ว่า Verifier เห็นข้อมูลชุดนี้ |
| รายงานถูกแก้ไขได้ | Block ที่ confirm แล้วเปลี่ยนไม่ได้ |
| Verifier คนเดิม approve ตัวเองได้ | ระบบ filter project ของตัวเองออกอัตโนมัติ |
| ไม่มี accountability ระยะยาว | Reputation ติดตาม Verifier wallet ตลอดกาล |

---

## การ Reject — พร้อม Slash ทันที

> _กดปุ่ม "❌ Reject On-Chain"_

ระบบเรียก `market.rejectProject(onChainId, slashBps)` โดย `slashBps = 5000` = 50%

- ถ้า Developer ยังไม่ได้วาก Stake — Reject แต่ไม่มีอะไรถูก slash (ไม่มีอะไรให้หัก)
- ถ้า Developer วาก Stake ไว้แล้ว — Stake ถูกหัก 50% ทันที

> "นี่คือ enforced consequence — ไม่ใช่แค่ 'ถูก reject' แล้วก็จบ  
> Developer ที่ส่งข้อมูลไม่ดีและผ่านขั้นตอน stake ไปแล้ว  
> จะเสียเงินจริงทันที — โดยไม่ต้องผ่านศาล ไม่ต้องมีคดีความ"

---

## Challenge Mechanism — ชุมชน Reviewer ตรวจสอบแทน Verifier

> "แต่ระบบไม่ได้หยุดแค่ Verifier คนเดียว  
> แม้หลังโครงการ approve และ mint credits แล้ว  
> ชุมชน Reviewer ยังตรวจสอบต่อได้"

### ขั้นตอน Challenge

```
1. Reviewer ที่ register แล้วพบข้อมูลน่าสงสัย
   → กด "⚠️ Open Challenge" บนโครงการที่ status = Minted

2. ระบบบันทึก challenge บน chain พร้อม deadline
   → project status เปลี่ยนเป็น "Challenged"

3. Reviewer คนอื่น (ที่ไม่ใช่ Developer) มาลงคะแนน:
   → "✂️ เห็นควร Slash" (fraudDetected = true)
   → "✅ ไม่เห็นควร Slash" (fraudDetected = false)

4. เมื่อครบ 3 คะแนน ระบบตัดสินอัตโนมัติ

ผลลัพธ์:
→ Fraud confirmed: Developer stake ถูก slash 100% → Challenger ได้ reward
→ Challenge rejected: โครงการกลับ Minted + Challenger bond ถูกหักบางส่วน
```

### Countdown Timer แบบ Real-time

> _ชี้ไปที่ banner สีส้มที่แสดง countdown_

ระบบแสดง countdown แบบ real-time ว่าเหลือเวลาอีกกี่วัน กี่ชั่วโมง กี่นาที กี่วินาทีก่อน challenge deadline

นี่ไม่ใช่แค่ UI element — มันอ่าน `deadline` timestamp จาก blockchain แล้วคำนวณ `deadline - now()` แบบ live ทุกวินาที

**Demo Mode — demoResolveChallenge**

> _ชี้ไปที่ demo resolve panel สีเหลือง_

สำหรับ demo ระบบมีปุ่ม

- **"✂️ Challenge Upheld — Slash Project"** — slash stake ทั้งหมดทันที ให้รางวัล challenger
- **"✅ Challenge Rejected — Return to Minted"** — โครงการกลับ Minted, challenger ถูก penalize เล็กน้อย

> "ใน production จริงต้องรอครบ vote threshold และ deadline  
> แต่ใน demo เราสามารถแสดงผลลัพธ์ทั้งสองทางได้ทันที"

---

## ทำไม Challenge Mechanism ถึงสำคัญมาก

> "Verifier คนเดียวไม่มีทางรู้ทุกอย่าง  
> โครงการปลูกป่าในเชียงใหม่ 500 ไร่  
> บางทีคนในพื้นที่รู้ดีกว่า Verifier ที่อยู่กรุงเทพว่าป่านั้นเป็นยังไงจริงๆ
>
> Challenge Mechanism ให้ชุมชน — คนที่รู้จริง — มีกลไกกดดัน  
> แม้หลังจาก credits ขายไปแล้ว  
> และถ้า challenge สำเร็จ ผู้ที่ตรวจพบ fraud ได้ reward ทางการเงินจริง  
> นั่นคือ financial incentive ให้คนช่วยกันตรวจสอบ"

---

## เส้นแบ่งระหว่าง DAO กับ Verifier

> "สิ่งที่ DAO (CGOV holders) ควบคุม vs สิ่งที่ Verifier ตัดสินใจเอง"

| DAO ควบคุม (vote เปลี่ยนได้) | Verifier ตัดสินใจเอง |
|---------------------------|-------------------|
| `minimumVerifierReputationToApprove` | ว่าจะ approve หรือ reject โครงการนี้ไหม |
| `reviewerBond` — จำนวน TCUT ที่ต้องวาง | ว่าจะ open challenge ไหม |
| `challengeDuration` — ระยะเวลา challenge | ว่าจะโหวต Slash หรือ Valid |
| `voteThreshold` — จำนวน vote ขั้นต่ำ | ว่าจะ comment อะไรลงไป |
| `challengerPenaltyBps` — penalty ถ้า challenge แพ้ | |

> "DAO กำหนด rules of the game  
> Verifier และ Reviewer play the game ตาม rules นั้น  
> ไม่มีใครเดียวมีอำนาจเบ็ดเสร็จทั้งระบบ"

---

## ความแตกต่างจากระบบเดิม — สรุปภาพรวม

| มิติ | ระบบเดิม | ระบบนี้ |
|-----|---------|--------|
| ข้อมูลที่ Verifier เห็น | เอกสารที่ Developer ส่งมาเอง | Satellite data, NASA climate, AI risk score + หลักฐาน IPFS |
| การตัดสินใจถูกบันทึกไว้ไหม | Report ใน file — แก้ได้ | Transaction บน blockchain — ลบไม่ได้ |
| ป้องกัน conflict of interest | ขึ้นอยู่กับ code of ethics | ระบบ filter project ของตัวเองออกโดยอัตโนมัติ |
| ตรวจสอบหลัง approve แล้ว | ไม่มีกลไก | Challenge Mechanism + Reviewer Network |
| Financial incentive ตรวจสอบ | ไม่มี | Challenger ที่พบ fraud ได้ reward จาก slash |
| Verifier Accountability | Reputation ส่วนตัว | Reputation score บน chain + bond ที่อาจถูกหัก |
| DAO กำกับ Verifier | ไม่มี | DAO vote เปลี่ยน reputation threshold ได้ |

---

## ตัวอย่างสถานการณ์: Verifier ตรวจพบ anomaly

> "สมมติ Verifier เปิดโครงการ Solar ที่อ้างว่าลด 2,000 tCO2 ในเชียงราย  
> แต่เมื่อดู signals เห็นว่า:
>
> - `nasa_solarIrradiance = 3.1 W/m²` — แสงอาทิตย์ต่ำมากสำหรับ Solar project  
> - `iotConfidence = 22` — NDVI สูงผิดปกติสำหรับพื้นที่ Solar  
> - `anomalyScore = 78` — ตัวเลขที่ขอกับที่รายงานห่างกันมาก
>
> Verifier ไม่ต้องเดาทาง — ข้อมูลบอกแล้วว่ามีอะไรผิดปกติ  
> กด Reject → Developer เสีย stake ที่วางไว้  
> และ event ถูกบันทึกบน blockchain ว่า 'Rejected เพราะ risk score 82 ณ block ที่ X'"

---

## ข้อจำกัด (พูดตรงๆ)

### 1. Single Verifier ใน Prototype

ตอนนี้มี Verifier ได้เพียงคนเดียวคือ deployer address  
ใน production ต้องมีระบบ multi-verifier พร้อม weighted voting หรือ DAO approval สำหรับ high-risk projects

### 2. Auto-approve Verifier Access ใน Demo

Backend ตั้งให้ auto-approve ทุก wallet ที่ขอ verifier access  
ใน production ต้องผ่านกระบวนการ KYC, credential check หรือ DAO vote

### 3. Challenge Vote Threshold ต่ำ (3 คะแนน)

ใน prototype ใช้ 3 คะแนนเพื่อให้ demo ได้ง่าย  
Production จริงอาจต้องใช้ weighted votes ตาม reputation หรือ stake size  
และ Uniswap-style 7 วัน / Compound 3 วัน สำหรับ challenge period

### 4. Reputation ยังไม่ portable

Reputation ผูกกับ wallet address — ถ้าเปลี่ยน wallet ต้องเริ่มใหม่  
ใน production ควรมีกลไก delegate reputation หรือ SBT (Soulbound Token)

---

## Closing

> "ก่อนหน้านี้ Verifier คือ black box —  
> ไม่รู้ว่าดูข้อมูลอะไร ตัดสินใจยังไง และรับผิดชอบกับผลลัพธ์อย่างไร
>
> หน้านี้พิสูจน์ว่าเราสามารถ redesign role ของ Verifier ใหม่ได้  
> ให้เขาเป็น 'ผู้ตัดสินใจที่มีข้อมูลเพียงพอ, มี accountability, และถูกตรวจสอบได้'
>
> เมื่อ Verifier กด Approve บนหน้าจอนี้  
> เขากำลังลงนามด้วย private key ของตัวเอง  
> บนการตัดสินใจที่ทั้งโลกตรวจสอบได้  
> และ reputation ของเขาจะดีขึ้นหรือแย่ลงตามผลลัพธ์ที่ตามมา
>
> นั่นคือ accountability ที่แท้จริง"

---

## Q&A — คำถามที่มักถูกถาม

**Q: ถ้า Verifier approve โครงการที่ fraud — ใครรับผิดชอบ?**  
A: Verifier จะเสีย reputation score ที่สะสมมา และถ้า challenger พิสูจน์ fraud สำเร็จ bond ของ Verifier อาจถูกหักด้วย (ขึ้นอยู่กับ implementation ที่ extend ต่อไป) ปัจจุบัน slashing ไปที่ Developer ก่อน แต่ reputation ของ Verifier ที่ approve โครงการนั้นก็สะท้อนใน on-chain history

**Q: Reviewer กับ Verifier ต่างกันอย่างไร?**  
A: Verifier = บทบาทหลักที่ approve โครงการใหม่ ต้องผ่าน backend approval และ reputation threshold  
Reviewer = สมาชิกชุมชนที่ register แล้ว มีสิทธิ์ open challenge และ vote บนโครงการที่ mint แล้ว  
ใน prototype นี้บทบาทซ้อนทับกัน — wallet เดียวกันทำได้ทั้งสอง

**Q: ทำไมต้อง vote 3 คะแนนแต่ไม่ใช่ majority vote?**  
A: ระบบปัจจุบันใช้ threshold แบบ fixed ที่ 3 เพื่อ demo ง่าย  
ใน production ควรใช้ quorum percentage (เช่น 10% ของ registered reviewers) และ weighted ตาม reputation เพื่อป้องกัน sybil attack — คนสร้าง wallet ใหม่หลายอันเพื่อ swing vote

**Q: ทำไม Verifier ต้องวาง bond ด้วย?**  
A: Bond สร้าง skin in the game — ถ้า challenge โครงการแล้วแพ้ บางส่วนของ bond ถูกหัก  
ป้องกัน Reviewer เปิด challenge โดยไม่มีข้อมูล (ทำให้ระบบวุ่นวาย)  
และทำให้ Reviewer ที่ challenge ถูกได้ reward ที่มีความหมาย ไม่ใช่แค่ค่าแรง symbolic

**Q: DAO สามารถ ban Verifier ได้ไหม?**  
A: ทางอ้อม DAO โหวตเพิ่ม `minimumVerifierReputationToApprove` ได้  
ถ้าตั้งไว้สูงมาก Verifier ที่ reputation ต่ำ (เพราะตัดสินผิดบ่อย) จะ approve โครงการไม่ได้อีกต่อไป  
เหมือนระบบ demotion โดยไม่ต้อง ban โดยตรง
