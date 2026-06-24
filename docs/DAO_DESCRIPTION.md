# DAO Governance Portal

---

## 🎯 Opening Hook 

> **"ใครเป็นคนกำหนดกติกาของตลาด? และคุณมีสิทธิ์มีส่วนร่วมในการตัดสินใจนั้นมั้ย?"**

ในตลาดคาร์บอนเครดิตแบบดั้งเดิม คำตอบคือ **องค์กรส่วนกลาง** —  
Verra, Gold Standard, หรือ UNFCCC เป็นคนออกกฎ เปลี่ยนกฎ และบังคับใช้กฎ  
โดยไม่มีใครเห็นกระบวนการ และไม่มีใครมีสิทธิ์ vote

หน้านี้คือคำตอบที่แตกต่างออกไปโดยสิ้นเชิง

---

## 📌 ปัญหาของระบบ Governance แบบเดิม

| ปัญหา | ผลกระทบ |
|------|---------|
| ศูนย์กลางกำหนดกฎเอง | ผู้ซื้อ/ขาย/ผู้ตรวจสอบไม่มีสิทธิ์แสดงความคิดเห็น |
| กระบวนการไม่โปร่งใส | ไม่รู้ว่าใครตัดสิน ด้วยเหตุผลอะไร |
| เปลี่ยนกฎได้อย่างอิสระ | ค่าธรรมเนียม, เกณฑ์ตรวจสอบ เปลี่ยนได้โดยไม่แจ้ง |
| ไม่มีกลไก Accountability | ถ้ากติกาพัง ไม่มีใครรับผิดชอบ |

---

## ⛓️ Blockchain แก้ปัญหานี้ยังไง?

### 1. กติกาอยู่ใน Smart Contract ไม่ใช่ใน Policy Document

```
ก่อน:  PDF + อีเมลจากองค์กรส่วนกลาง → ใครจะเชื่อถือ?
หลัง:  code บน Ethereum → ทุกคนอ่านได้, audit ได้, ไม่มีใครแก้คนเดียว
```

**ค่าธรรมเนียม marketplace, reviewer bond, เกณฑ์ challenge** — ทุก parameter  
ถูกเก็บไว้ใน `CarbonMarket.sol` และจะเปลี่ยนได้ก็ต่อเมื่อผ่านการโหวตของ DAO เท่านั้น

---

### 2. ทุกการตัดสินใจมี proof บน-chain

```
Traditional:  "เราประชุมแล้วตัดสินใจเพิ่มค่าธรรมเนียม" → เชื่อได้ยังไง?
DAO:          Transaction 0x... บน Sepolia → ใครก็ verify ได้บน Etherscan
```

Proposal ทุกอัน, ผลโหวต, การ Execute — **บันทึกถาวรบน blockchain**  
ไม่มีใครแก้ไขย้อนหลังได้ และไม่มีใครปิดบังผลได้

---

### 3. Token-weighted Voting — สิทธิ์ตามการมีส่วนร่วม

**CGOV** (Carbon Governance Token) ไม่ใช่แค่หุ้น แต่คือ **สิทธิ์ในการกำหนดทิศทาง**

```
ยิ่งมี CGOV + Delegate to self → ยิ่งมี Voting Power
```

ผู้ที่ลงทุนในระบบมากที่สุด — ไม่ว่าจะเป็น developer, verifier, buyer —  
ย่อมมีแรงจูงใจให้ระบบทำงานได้ดีที่สุด และได้สิทธิ์โหวตตามสัดส่วน

---

### 4. CGOV ≠ TCUT — Token แยกหน้าที่ชัดเจน

> *"ระบบนี้มี token 2 ตัว ทำหน้าที่คนละอย่างโดยเจตนา"*

```
TCUT  =  Utility Token   →  ซื้อขายคาร์บอนเครดิต, วาง stake เป็น verifier, จ่าย bond ใน challenge
CGOV  =  Governance Token →  โหวต proposal, เสนอกติกา, กำกับทิศทางตลาด
```

**ทำไมต้องแยก?**  
ถ้า token เดียวทำทุกอย่าง — คนที่ซื้อเครดิตเยอะสุดก็ได้กำหนดกฎเอง  
ซึ่งคือ conflict of interest ที่ตลาดคาร์บอนเดิมมีอยู่แล้ว

การแยก token บังคับให้ผู้ที่จะมีอำนาจกำกับ ต้องถือ CGOV ซึ่งได้มาจาก **การมีส่วนร่วมกับระบบ**  
ไม่ใช่แค่การซื้อเครดิตเยอะ

---

### 5. CGOV Distribution — ใครควรได้ token และเท่าไร?

> *"ระบบ governance ที่ดี ต้องให้ token ไปอยู่กับคนที่มีส่วนได้ส่วนเสียจริง"*

กรอบ distribution ระยะยาวที่ออกแบบไว้:

| กลุ่ม | สัดส่วน | เหตุผล |
|-------|--------|--------|
| Community Treasury | 35% | สำรองสำหรับ grants, incentive, emergency |
| Community / Ecosystem | 20% | คนที่มีส่วนร่วมพัฒนาระบบ |
| Core Team / Contributors | 20% | ทีมพัฒนา |
| Verifier Incentive Pool | 15% | reward verifier ที่ทำงานถูกต้องสม่ำเสมอ |
| Liquidity / Public Access | 10% | เปิดให้ทุกคนเข้าถึงได้ |

💡 **Key Point:** Verifier ได้ CGOV จากการทำงานดี → verifier มี incentive รักษาระบบให้น่าเชื่อถือ  
เพราะถ้าระบบพัง CGOV ที่ถืออยู่ก็ไร้ค่า — นี่คือ **aligned incentive** ที่ออกแบบมาอย่างตั้งใจ

---

## 🔍 Demo Walkthrough — เดินผ่านหน้านี้ทีละส่วน

---

### ส่วนที่ 1: CGOV Token Holders Dashboard

> *"ก่อนอื่น ดูว่าตอนนี้มีใครเป็น stakeholder ในระบบนี้บ้าง"*

- แสดง **จำนวน holder** ทั้งหมด — บอกว่า community มีขนาดแค่ไหน
- **Top holder** — ใครมีอำนาจโหวตมากที่สุด
- **Total Minted** — เห็น supply distribution แบบ real-time
- **สัดส่วน %** — เห็นว่า power กระจุกตัวหรือกระจาย

💡 **Key Point:** ระบบนี้ไม่มี admin คนกลาง ใครถือ CGOV มาก ก็มีสิทธิ์มากตามหลักการ  
ซึ่งต่างจากระบบเดิมที่ CEO บริษัทตัดสินใจคนเดียว

---

### ส่วนที่ 2: รับ CGOV — Open Access to Governance

> *"ระบบนี้ออกแบบให้ทุกคน join ได้ ไม่ใช่ club ของคนรวย"*

- **Faucet (ฟรี)** — รับ 10,000 CGOV ได้ทุก 24 ชม. สำหรับทดสอบ  
  → ใน production จริง CGOV จะซื้อในตลาด หรือได้จาก contribution
- **ซื้อด้วย ETH** — 1 ETH = 10,000 CGOV การ "ลงทุน" ในระบบ governance

💡 **Key Point:** กติกาไม่ใช่ของใครคนหนึ่ง แต่เป็นของ **ทุกคนที่มีส่วนได้ส่วนเสีย**  
ซึ่ง incentivize ให้คนที่อยากให้ระบบดี เข้ามามีส่วนร่วม

---

### ส่วนที่ 3: Voting Power + Delegation

> *"แค่มี token ยังไม่พอ ต้อง Delegate ก่อน — เหมือนการลงทะเบียนเลือกตั้ง"*

```
ถือ CGOV → Delegate to Self → มี Voting Power → โหวตและ propose ได้
```

- **Delegate to Self** = ใช้สิทธิ์โหวตด้วยตัวเอง
- **Delegate to Others** = มอบสิทธิ์ให้คนที่ไว้วางใจ (เหมือน proxy voting ในบริษัทจดทะเบียน)

💡 **Key Point:** กลไก Delegation มีอยู่จริงในองค์กรใหญ่ (เช่น กองทุนที่ vote แทนผู้ถือหน่วย)  
ที่นี่ทำแบบเดียวกัน แต่ **transparent และ on-chain**

#### ⚡ Snapshot Voting — ป้องกัน Flash Loan Attack

> *"voting power ไม่ได้ใช้ balance ณ วินาทีที่โหวต แต่ใช้ snapshot ตอน proposal เริ่ม"*

```
proposal สร้าง block 100  →  voting power ของทุกคนถูก snapshot ณ block นั้น
ต่อให้ซื้อ CGOV เพิ่ม block 101   →  ไม่นับในการโหวต proposal นี้
```

**ทำไมต้องทำแบบนี้?**  
ป้องกันคนที่กู้ token จำนวนมหาศาลชั่วคราว (flash loan) เพื่อ dominate การโหวต  
แล้วคืน token หลังโหวตเสร็จ — เป็นช่องโหว่ที่เคยโดนใช้โจมตี DAO จริงๆ

---

### ส่วนที่ 4: Create Governance Proposal

> *"สมมติฉันเป็น verifier แล้วคิดว่า reviewer bond สูงเกินไป ทำให้คนไม่กล้า challenge  
> ฉันเสนอได้เลย ไม่ต้องรอให้ใครอนุมัติก่อน"*

#### พารามิเตอร์ที่ DAO กำกับดูแล:

| Parameter | ความหมาย | ทำไมสำคัญ |
|-----------|----------|-----------|
| Reviewer Bond | เงินที่ verifier ต้องวางเพื่อ challenge | สูงเกิน → คนไม่กล้า challenge, ต่ำเกิน → spam |
| Challenge Duration | เวลาที่เปิดให้ vote ใน challenge | สั้นเกิน → ไม่ยุติธรรม, ยาวเกิน → slow |
| Platform Fee | ค่าธรรมเนียมตลาด | กระทบราคาคาร์บอนเครดิต |
| Min Verifier Reputation | เกณฑ์ขั้นต่ำของ verifier | ควบคุมคุณภาพ |

#### Proposal Bond — กลไกป้องกัน Spam

> *"ก่อนจะเสนอ proposal ต้องวาง 500 CGOV เป็น bond ก่อน"*

```
✅ ถ้า proposal ผ่าน (>50% For) → bond คืนให้ผู้เสนอ
❌ ถ้า proposal แพ้ (Defeated)  → bond ถูก Slash ไปที่ treasury
```

💡 **Key Point:** นี่คือ **Economic Security** — ถ้าคุณเสนอของแย่ คุณเสียเงิน  
ทำให้คนที่จะ propose ต้องคิดให้ดีก่อน ไม่ใช่ spam เพื่อ disrupt ระบบ

---

### ส่วนที่ 5: Governance History — Proposal Cards

> *"ดูประวัติ proposal ทั้งหมดที่เคยถูกเสนอ"*

แต่ละ card บอก:
- **ชื่อ proposal + ค่าที่จะเปลี่ยน** (decode จาก calldata อัตโนมัติ)
- **สถานะ** (Pending / Active / Succeeded / Defeated / Executed)
- **กติกาการโหวต** — >50% For, quorum 4%, bond status
- **ผลโหวต real-time** — กราฟ For vs Against

#### Voting Rules ที่แสดงในแต่ละ proposal:
```
ต้องได้ >50% For จากทั้งหมดที่โหวต
ต้องถึง quorum 4% ของ supply
bond 500 CGOV วางไว้ (คืนถ้า Passed / Slash ถ้า Defeated)
โหวตแล้ว X/Y holders
```

💡 **Key Point:** ใน traditional system เราไม่รู้ว่าใครโหวตอะไร  
ที่นี่ **ทุกคนเห็นผลเหมือนกัน real-time บน-chain**

---

### ส่วนที่ 5b: Treasury — เงินไปไหน หลัง DAO ตัดสินใจ

> *"ทุกครั้งที่มีการซื้อขายคาร์บอนเครดิต, slash bond ใน challenge, หรือ proposal bond ถูกตัด  
> เงินส่วนหนึ่งไหลเข้า treasury ซึ่งอยู่ภายใต้การควบคุมของ DAO"*

**Treasury รับเงินจาก:**
```
Platform Fee (2% ของทุก transaction)  →  treasury
Slash จาก challenge ที่แพ้           →  treasury
Proposal Bond ที่ถูก Slash           →  treasury
```

**DAO โหวตใช้เงิน treasury เพื่อ:**
- จ่าย reward ให้ verifier ที่ตรวจงานถูกต้อง
- จ้าง security audit
- สนับสนุน ecosystem grant
- ค่า oracle / data infrastructure

💡 **Key Point:** treasury ไม่ใช่กระเป๋าเงินของ founder  
ทุก baht ที่จะใช้ต้องผ่านการโหวตของ CGOV holder  
— นี่คือ **DAO-controlled treasury** ที่ต่างจาก foundation แบบเดิมโดยสิ้นเชิง

---

### ส่วนที่ 6: Vote + Execute — Governance Loop จบครบ

```
Propose → Vote → Succeed → Execute → กติกาเปลี่ยนบน-chain ทันที
```

- ผู้ใช้ทั่วไป: เห็นปุ่ม **✅ Vote For** / **❌ Vote Against**
- เมื่อ proposal Succeeded: ปุ่ม **⚡ Execute Proposal** ปรากฏ
- Execute แล้ว: `CarbonMarket.setPlatformFeeBps()` ถูกเรียกอัตโนมัติ → **กติกาเปลี่ยนจริง**

💡 **Key Point:** ไม่มีคนกลาง ไม่มีขั้นตอน approval พิเศษ  
Smart contract execute ตามที่ community โหวตเลือก **อัตโนมัติ 100%**

---

## 💎 Value Proposition สรุป

```
┌─────────────────────────────────────────────────────────────┐
│              ระบบ Governance เดิม vs DAO                    │
├──────────────────────────┬──────────────────────────────────┤
│ เดิม                     │ DAO Governance Portal             │
├──────────────────────────┼──────────────────────────────────┤
│ องค์กรส่วนกลางตัดสิน    │ Community token holders ตัดสิน   │
│ กระบวนการปิดลับ          │ ทุกขั้นตอน on-chain ดูได้        │
│ เปลี่ยนกฎได้ตามใจ       │ ต้องผ่านโหวต >50% เท่านั้น       │
│ ไม่มี accountability     │ Bond system ป้องกัน spam         │
│ ใครมีอำนาจก็กำหนดกติกา  │ Voting power ตามการลงทุนจริง     │
│ Slow, manual process     │ Execute อัตโนมัติผ่าน smart contract │
└──────────────────────────┴──────────────────────────────────┘
```

---

## 🌍 ภาพใหญ่ — ทำไมถึงสำคัญต่อตลาดคาร์บอน

> **"คาร์บอนเครดิต จะมีความน่าเชื่อถือได้ ต้องมาจากกติกาที่น่าเชื่อถือ"**

ปัจจุบันตลาดคาร์บอนโลก (~$2 trillion by 2050) กำลังเผชิญวิกฤตความเชื่อมั่น:
- รายงาน Guardian (2023): เกือบ 90% ของ REDD+ credits ของ Verra ไม่มีคุณภาพจริง
- ไม่มีใครรู้ว่ากฎถูกกำหนดยังไง และใครได้ประโยชน์จากกฎนั้น

**DAO Governance** แก้ตรงนี้:
1. กฎทุกข้อถูก encode บน-chain — ไม่มีใครแก้ลับหลัง
2. ทุก stakeholder มีสิทธิ์เสนอและโหวต — market ปรับตัวได้ตามความเป็นจริง
3. Economic incentive ตรงกัน — คนที่มีส่วนได้ส่วนเสียมากที่สุดคือคนที่โหวต

---

## ⚠️ ข้อจำกัดของ Demo นี้ — และของจริงต้องทำยังไง

> *"ระบบที่เห็นอยู่นี้ใช้ architecture เดียวกับ DeFi ใหญ่ทั่วโลก  
> แต่มีบางส่วนที่ปรับให้สั้นลงเพื่อให้พรีเซนต์ได้ภายในเวลาจำกัด"*

---

### 1. Quorum 4% — หมายความว่าอะไร?

```
ถ้า CGOV supply ทั้งหมด = 1,000,000
quorum 4% = ต้องมีคนออกมาโหวตรวมกันอย่างน้อย 40,000 CGOV
ถ้าโหวตไม่ถึง 40,000 → proposal ไม่ผ่าน แม้ทุกคนที่โหวตจะ For ก็ตาม
```

**ทำไมต้องมี quorum?**  
ป้องกันการผ่าน proposal ด้วยคน 2–3 คน ขณะที่ holder ส่วนใหญ่ไม่ได้ออกมาโหวต  
เหมือนกฎหมายที่ต้องมีผู้มาใช้สิทธิ์ขั้นต่ำ ไม่งั้นผลโหวตไม่ชอบธรรม

| DAO | Quorum |
|-----|--------|
| Uniswap | 4% of total supply |
| Compound | 4% of total supply |
| ENS | 1% |
| **ระบบนี้** | **4% (เท่า Uniswap)** |

---

### 2. Voting Period — ของจริงใช้เวลานานกว่านี้มาก

```
ระบบนี้  →  30 blocks  ≈  6 นาที    ← เพื่อ demo เท่านั้น
Compound →  ~3 วัน                   ← ให้คนทั่วโลกมีเวลา research + vote
Uniswap  →  ~7 วัน                   ← มูลค่าโหวตหลายพันล้าน ต้องรอบคอบ
```

**ทำไม real DAO ถึงใช้เวลานาน?**
- Token holder กระจายอยู่ทั่วโลก ต้องให้เวลาทุก timezone
- Proposal ซับซ้อน ต้องให้คน research ก่อนโหวต
- หน่วยงาน institutional ต้องขอ internal approval ก่อน vote

**ของเรา:** ถ้าใช้ใน production จริง → เปลี่ยน `votingPeriod` จาก 30 เป็น **50,400 blocks (~7 วัน)**  แค่บรรทัดเดียวใน constructor

---

### 3. Timelock — ของจริงต้องมี แต่เราตัดออกเพื่อ demo

**Timelock คืออะไร?**

```
proposal ผ่านแล้ว → รอ 2 วัน (timelock) → execute จริง
```

ช่วง 2 วันนี้คือ "เวลาฉุกเฉิน" — ถ้า community เพิ่งรู้ว่า proposal นั้น malicious  
คนที่ไม่เห็นด้วยมีเวลาถอนเงิน/สินทรัพย์ออกก่อนที่กฎจะมีผล

**ตัวอย่างที่สอน:** Tornado Cash governance attack (2023)  
— attacker ผ่าน malicious proposal แล้ว execute ทันที ก่อนชุมชนจะรับรู้  
ถ้ามี Timelock จะมีเวลา react

| DAO | Timelock |
|-----|----------|
| Uniswap | 2 วัน |
| Compound | 2 วัน |
| Aave | 1 วัน |
| **ระบบนี้ (demo)** | **ไม่มี — execute ทันที** |

**วิธีเพิ่ม:** ใช้ `TimelockController` ของ OpenZeppelin ต่อเข้ากับ Governor  
เป็น 1 contract เพิ่มเติม ไม่ต้อง rewrite อะไร

---

### 4. `demoExecute` / `demoDefeat` — ไม่ควรมีในของจริง

```solidity
function demoExecute(...) external onlyOwner { ... }  // bypass กฎทั้งหมด
```

สิ่งนี้มีเพื่อ **demo เท่านั้น** เพราะถ้าต้องรอ vote จริง 7 วัน  
จะโชว์ผลลัพธ์ในห้องพรีเซนต์ไม่ทัน

**ใน production จริง:** function นี้ต้องถูกลบออก  
เพราะ owner ที่ bypass vote ได้ = centralization จุดเดียวที่ทำลาย trust ทั้งระบบ  
DeFi protocol หลายเจ้าโดน hack เพราะ `onlyOwner` backdoor พวกนี้

---

### 5. Proposal Threshold — ต้องมี CGOV ถึงจะ propose ได้

```
ระบบนี้: ต้องมี 1,000 CGOV delegated ก่อนถึงจะเสนอ proposal ได้
```

**ทำไมต้องมี threshold?**
- ป้องกัน spam proposal จากคนที่ไม่มีส่วนได้ส่วนเสียจริง
- ใน Uniswap ต้องมี 2.5M UNI (~$10M) ถึงจะ propose ได้ — ต้นทุนสูงมาก

**ของเรา:** 1,000 CGOV ต่ำมาก เหมาะสำหรับ demo  
Production จริงควรปรับตามมูลค่าที่ต้องการป้องกัน

---

### สรุปความแตกต่าง Demo vs Production

| ข้อจำกัด | Demo (ตอนนี้) | Production จริง | แก้ยังไง |
|---------|--------------|----------------|---------|
| Voting Period | 30 blocks (~6 นาที) | 7 วัน | เปลี่ยน constructor parameter |
| Timelock | ไม่มี | 2 วัน | เพิ่ม TimelockController |
| demoExecute | มี (owner bypass) | ต้องลบออก | remove function |
| Proposal Threshold | 1,000 CGOV | ขึ้นกับ tokenomics | ปรับใน settings |
| Quorum | 4% | 4% (เท่า Uniswap แล้ว ✓) | — |

> **Core architecture เหมือนกัน 100%**  
> สิ่งที่ต้องเปลี่ยนสำหรับ production คือ parameter และเพิ่ม Timelock  
> ไม่ต้อง rewrite ระบบใหม่

---

## 🗺️ Roadmap — ระบบอยู่ Phase ไหน และยังขาดอะไร

> *"สิ่งที่เห็นอยู่นี้เป็นแค่จุดเริ่มต้น มีแผนงานที่วางไว้อีก 5 Phase"*

```
Phase A ✅  CGOV Token + Distribution       →  เสร็จแล้ว (Faucet + Sale + Delegation)
Phase B ✅  Full Vote Lifecycle              →  เสร็จแล้ว (Propose → Vote → Execute)
Phase C ⚠️  Timelock Governance             →  ยังขาด TimelockController
Phase D ⏳  Treasury Governance             →  ยังไม่มี treasury UI / spending proposal
Phase E ⏳  Verifier Policy Governance      →  ยังไม่มี grant/revoke verifier ผ่าน DAO
```

---

### Phase C — Timelock Governance ⚠️

**Timelock คืออะไร?**

ตอนนี้ถ้า proposal ผ่าน → กด Execute → กติกาเปลี่ยนทันที  
ของจริงต้องมีช่วงรอ "2 วัน" ก่อน execute เรียกว่า **Timelock**

```
ตอนนี้:  proposal ผ่าน  →  execute ทันที
จริง:    proposal ผ่าน  →  รอ 2 วัน  →  execute
```

**ทำไมต้องรอ?**  
สมมติ attacker แอบผ่าน proposal ที่ malicious ตอนกลางดึกขณะคนส่วนใหญ่ไม่ได้ดู  
ถ้า execute ทันที — เสียหายไปแล้วก่อนใครจะรู้  
ถ้ามี Timelock 2 วัน — community มีเวลาตรวจสอบ, alert กัน, และถอนทรัพย์สินออกก่อน

**ที่สำคัญกว่านั้น:** ใน production จริง `CarbonMarket.owner` จะต้องเปลี่ยนจาก deployer wallet → `TimelockController`  
ผลคือ **admin wallet เปลี่ยนกฎเองไม่ได้อีกต่อไป** ต้องผ่านโหวต DAO เท่านั้น  
นี่คือจุดที่ระบบเปลี่ยนจาก "admin คุม" → "DAO คุม" อย่างแท้จริง

---

### Phase D — Treasury Governance ⏳

**ตอนนี้ treasury มีอยู่แล้ว แต่ยังไม่มี UI และยัง govern ไม่ได้**

เงินในระบบไหลเข้า treasury จาก 3 แหล่ง:
```
ทุก transaction ซื้อขายเครดิต  →  platform fee 2%  →  treasury
challenger แพ้ challenge        →  bond ถูก slash   →  treasury
proposer ถูก defeat             →  proposal bond    →  treasury
```

แต่ตอนนี้เงินเข้าไปแล้วไม่มีใครเห็น และ DAO ยังโหวตสั่งใช้ไม่ได้

**Phase D จะเพิ่ม:**
- หน้า treasury dashboard — balance, inflow, outflow แบบ real-time
- proposal template "ขอใช้เงิน treasury X เพื่อ Y" เช่น จ้าง auditor, จ่าย verifier reward, ecosystem grant
- DAO โหวตอนุมัติ → execute → โอนเงินออกอัตโนมัติ

💡 **Key Point:** treasury ที่ govern โดย DAO ≠ กระเป๋าเงินของ founder  
ทุกบาทที่ใช้มี transaction proof บน-chain และต้องผ่านโหวตก่อน

---

### Phase E — Verifier Policy Governance ⏳

**ตอนนี้ admin เป็นคนตัดสินว่าใครเป็น verifier ได้**

ใน production จริง DAO ควรเป็นคนตัดสิน:

```
grant verifier(address)     →  DAO โหวตรับคนใหม่เป็น verifier
revoke verifier(address)    →  DAO โหวตถอนสิทธิ์คนที่ทำผิด
suspend verifier(address)   →  DAO โหวตพักสิทธิ์ชั่วคราว
```

รวมถึงกำหนด policy ว่าใครมีสิทธิ์สมัครเป็น verifier:
- `open_access` — ใครก็สมัครได้ (demo ปัจจุบัน)
- `reputation_gated` — ต้องมี reputation ถึงเกณฑ์ก่อน
- `dao_gated` — ต้องผ่านโหวต DAO ก่อนถึงจะเป็น verifier ได้

**ทำไม Phase E สำคัญ?**  
verifier คือคนที่ตัดสินว่าคาร์บอนเครดิตชิ้นนั้น "จริง" หรือ "ปลอม"  
ถ้าใครก็เป็น verifier ได้โดยไม่มี governance → คุณภาพของตลาดทั้งหมดขึ้นอยู่กับ admin คนเดียว  
การย้ายสิ่งนี้ขึ้น DAO คือการทำให้ "ใครเป็น verifier" กลายเป็นคำถามของ **ชุมชน** ไม่ใช่ของ **บริษัท**

### สิ่งที่จงใจ *ไม่* ย้ายขึ้น governance ในรอบแรก:

ไม่ใช่ทุกอย่างต้องให้ DAO ตัดสิน บางอย่างซับซ้อนเกินไปหรือ governance อาจช้าเกินจำเป็น:
- Risk score formula (ต้องการ expertise ไม่ใช่ majority vote)
- Oracle source selection (technical ล้วน)
- Project-level discretionary slash logic ที่ซับซ้อน

💡 **Key Point:** DAO ที่ดีไม่ใช่ DAO ที่ governance ทุกอย่าง  
แต่คือ DAO ที่ **governance สิ่งที่ stakeholder ต้องมีสิทธิ์ร่วมตัดสิน**  
และ delegate ส่วนที่เป็น technical expertise ให้ผู้เชี่ยวชาญ

---

## 🎤 Closing Statement

> *"หน้านี้ไม่ใช่แค่ voting interface  
> มันคือ **กระบวนการกำกับดูแลตลาดคาร์บอนที่โปร่งใส, กระจายอำนาจ, และ trustless**  
> ทุกกฎ ทุกการเปลี่ยนแปลง ทุกผลโหวต — ถูกบันทึกบน Ethereum ตลอดไป  
> และทุกคนที่มีส่วนได้ส่วนเสียในตลาดนี้ มีสิทธิ์เป็นส่วนหนึ่งของการตัดสินใจ"*

---

*สคริปต์นี้ใช้เวลาพรีเซนต์ประมาณ 10–15 นาที  
สามารถตัดส่วน Demo Walkthrough เหลือ 3 ส่วนหลักถ้าต้องการบีบให้เหลือ 7 นาที*
