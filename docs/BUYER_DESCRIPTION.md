# สคริปต์พรีเซนต์: Carbon Credit Marketplace (Buyer)

> หน้า: `/buyer`  

---

## Opening — เริ่มด้วยปัญหาที่องค์กรเผชิญอยู่จริง

> "บริษัทใหญ่หลายแห่งในโลกตอนนี้ประกาศว่าตัวเอง 'Carbon Neutral'  
> แต่คุณรู้ไหมว่าคาร์บอนเครดิตที่พวกเขาซื้อมา — มาจากโครงการอะไร?  
> ผ่านการตรวจสอบจริงไหม? หรือแค่กระดาษใบหนึ่งที่ซื้อขายกัน?
>
> ปี 2023 มีรายงานจาก The Guardian ว่า Verra — registry คาร์บอนที่ใหญ่ที่สุดในโลก  
> มีเครดิตกว่า 90% ในหมวด rainforest protection ที่ไม่ได้ลดคาร์บอนจริง
>
> ปัญหาไม่ได้อยู่ที่ความตั้งใจขององค์กรที่ซื้อ  
> แต่อยู่ที่ระบบที่ไม่มีกลไกพิสูจน์ความจริงที่ Buyer สามารถตรวจสอบได้เอง"

Marketplace หน้านี้คือต้นแบบตอบคำถามว่า ถ้าออกแบบตลาดคาร์บอนเครดิตใหม่บน Blockchain — Buyer จะมีข้อมูลอะไรบ้าง และสามารถตรวจสอบเองได้มากน้อยแค่ไหน

---

## หน้านี้คืออะไร — และใครใช้

**Carbon Credit Marketplace** คือหน้าที่ Buyer ใช้

1. ดูรายการ Carbon Credits ที่ขายอยู่ พร้อม trust score และ risk score ของแต่ละโครงการ
2. ซื้อ Credits ด้วย TCUT token (ERC-20)
3. ดูพอร์ตโฟลิโอ credits ที่ถือครองอยู่ใน wallet
4. Retire credits เพื่อ offset carbon จริง และรับ NFT certificate บน IPFS

ทุกขั้นตอนทำงานผ่าน MetaMask บน Ethereum Sepolia

---

## สิ่งที่ Buyer เห็นก่อนซื้อ — ข้อมูลที่ระบบเดิมไม่มี

> _ชี้ไปที่ project cards ในหน้า Marketplace_

แต่ละ card แสดง

| ข้อมูล | มาจากไหน | ระบบเดิมมีไหม |
|-------|---------|-------------|
| ชื่อโครงการ / จังหวัด / ปี vintage | Backend + Blockchain | ✅ (แต่ไม่ verified) |
| **Trust Score** (High / Medium / Low) | AI risk engine + on-chain | ❌ ไม่มี |
| **Risk Score (0–100)** | NASA + MODIS + OWM คำนวณ | ❌ ไม่มี |
| Available Credits เหลืออยู่ | อ่านจาก ERC-1155 balance จริง | ❌ ไม่แน่ใจว่าอัปเดต |
| ราคาต่อ Credit | ตั้งโดย Developer บน smart contract | ✅ (แต่ centralized) |
| Source Hash | SHA256 ของ assessment data | ❌ ไม่มี |

**จุดที่สำคัญที่สุด: Trust Score และ Risk Score**

> "Buyer ทั่วไปในระบบเดิมซื้อเครดิตโดยไม่รู้เลยว่า  
> โครงการนั้นน่าเชื่อถือแค่ไหน  
> ข้อมูลที่มีคือชื่อโครงการ, ตำแหน่ง, และเอกสารยืนยันจากบริษัทเดียวกัน  
>
> ในระบบนี้ Trust Score และ Risk Score คำนวณมาจากดาวเทียม NASA และ AI  
> ไม่ใช่จากคำบอกเล่าของ Developer  
> Buyer เห็นตัวเลขนี้ก่อนตัดสินใจซื้อทุกครั้ง"

---

## ทัวร์หน้าจอ — Tab 1: Marketplace

### ขั้นตอนที่ 1 — Enable TCUT (ครั้งแรกครั้งเดียว)

> _ชี้ไปที่ banner สีส้มด้านบน_

ก่อนซื้อครั้งแรก Buyer ต้อง "Enable TCUT" หนึ่งครั้ง

**ทำไมต้อง Enable?**

นี่คือมาตรฐาน ERC-20 — smart contract ไม่สามารถดึง token จาก wallet ของใครโดยไม่ได้รับอนุญาต  
Buyer ต้องเรียก `token.approve(marketAddress, MaxUint256)` ก่อน  
หลังจากนั้น `CarbonMarket` สามารถเรียก `transferFrom()` หัก TCUT ได้เลยทุกครั้งที่ซื้อ

**ทำไม MaxUint256?**

เพื่อไม่ต้อง approve ซ้ำทุกครั้งที่ซื้อ — จะ approve เท่าไรก็ได้ แต่ `MaxUint256` เป็น convention ในวงการ DeFi สำหรับ "approve ไม่มีกำหนด"  
ระบบ frontend ตรวจ allowance อัตโนมัติ — ถ้า allowance > 999,999 TCUT ถือว่า enable แล้ว ปุ่มหายไปเอง

> _ชี้ไปที่ banner สีเขียว "✅ TCUT เปิดใช้แล้ว"_

---

### ขั้นตอนที่ 2 — เลือกโครงการ เลือกจำนวน ซื้อ

> _ชี้ไปที่ project card + input จำนวน + ปุ่ม Buy_

1. Buyer ดู card แต่ละโครงการ — เปรียบเทียบ Trust Score, Risk Score, ราคา, credits เหลือ
2. พิมพ์จำนวน credits ที่ต้องการ — ระบบคำนวณราคารวม TCUT ทันที
3. กด "🛒 Buy Credits" → MetaMask popup → Confirm

เบื้องหลังระบบเรียก

```solidity
market.buyCredits(projectId, amount)
```

Smart contract ทำ 3 อย่างใน transaction เดียว

1. ตรวจ allowance ของ Buyer ว่าพอไหม
2. เรียก `TCUT.transferFrom(buyer, market, totalCost)` — หัก TCUT จาก Buyer
3. เรียก `CarbonCreditToken.safeTransferFrom(market, buyer, projectId, amount)` — โอน ERC-1155 token ให้ Buyer

> "ทั้งหมดนี้เกิดขึ้นใน 1 transaction — atomic  
> ไม่มีสถานการณ์ที่จ่าย TCUT ไปแล้วแต่ไม่ได้ carbon credit  
> หรือได้ carbon credit โดยไม่จ่าย TCUT  
> Blockchain enforces ทั้งสองด้านพร้อมกัน"

---

## Source Hash — ลายนิ้วมือของ Assessment

> _ชี้ไปที่ text `Source: sha256:...` ใต้แต่ละ card_

ตัวเลข hash ที่เห็นใต้ทุก card คือ SHA256 ของข้อมูล assessment ทั้งชุด  
รวมถึง NASA data, NDVI, weather ณ วันที่ประเมิน

**Buyer ใช้มันทำอะไรได้?**

ถ้า Buyer สงสัยว่า "โครงการนี้ถูกประเมิน risk อย่างไร?"  
สามารถเอา hash นี้ไป verify กับข้อมูลใน Explorer ได้  
ถ้า hash ตรงกัน แสดงว่าข้อมูลที่ใช้ประเมินยังไม่ถูกแก้ไข  
ถ้าไม่ตรง — มีบางอย่างเปลี่ยน

> "มันเหมือนเลขทะเบียนที่ไม่ซ้ำกันของใบรับรองแต่ละโครงการ  
> แต่แทนที่จะเป็นเลขที่คนกำหนด — มันถูกสร้างจากเนื้อหาข้อมูลเอง  
> ถ้าข้อมูลเปลี่ยนแม้แต่ตัวเดียว hash จะเปลี่ยนทันที"

---

## ทัวร์หน้าจอ — Tab 2: My Portfolio

> _สลับไป tab Portfolio_

### Summary: Total Carbon Credits Held

> _ชี้ไปที่ banner สีเขียวด้านบน_

```
Total Carbon Credits Held: 150
= 150 tCO₂ offset potential
```

ตัวเลขนี้อ่านจาก **ERC-1155 balanceOf** โดยตรง  
ระบบ loop ผ่าน project ID 1 ถึง maxId และเรียก `carbonToken.balanceOf(wallet, projectId)` ทุกตัว  
ได้ยอดจริงที่อยู่ใน wallet ณ ปัจจุบัน — ไม่ใช่ยอดจาก database

**ทำไมต้อง loop ผ่าน ERC-1155 โดยตรง?**

เพราะ credits ที่ Buyer ถือครองอยู่คือ **token ที่มีอยู่จริงใน wallet บน blockchain**  
ไม่ใช่แค่ record ใน database ที่ใครก็แก้ได้  
ถ้าโอน credits ให้คนอื่น balance ใน portfolio ก็จะลดลงทันที

---

### Retire Credits — การ Offset Carbon จริง

> _ชี้ไปที่ retire panel ใน portfolio_

นี่คือขั้นตอนสุดท้าย — เมื่อ Buyer ต้องการ "ใช้" credits เพื่อ offset carbon จริง

**กระบวนการเกิดขึ้น 3 ขั้น**

```
ขั้น 1: ระบบสร้าง NFT Certificate บน IPFS
         → Backend รับข้อมูล (project, จำนวน, wallet, vintage)
         → สร้าง SVG certificate image (gradient background, รายละเอียดโครงการ)
         → อัปโหลด image ขึ้น IPFS → ได้ image CID
         → สร้าง ERC-721 metadata JSON (name, description, traits, image)
         → อัปโหลด metadata ขึ้น IPFS → ได้ tokenUri

ขั้น 2: Transaction บน Blockchain
         → market.retireCredits(projectId, amount, tokenUri)
         → ERC-1155 credits ถูก burn จาก wallet Buyer
         → RetireCertificate.mint(buyer, tokenUri) → ERC-721 NFT สร้างให้ Buyer

ขั้น 3: ยืนยันผลลัพธ์
         → portfolio แสดง credits ที่เหลือลดลง
         → link IPFS certificate ปรากฏขึ้น — กดเปิดดูได้ทันที
```

> _กดปุ่ม "🔥 Retire & Get NFT Certificate"_

> "สังเกตว่าระบบแจ้ง 2 status ระหว่างรอ  
> 'Generating certificate on IPFS...'  
> แล้วค่อย 'Certificate pinned to IPFS. Sending retire transaction...'  
> เพราะ IPFS ต้องมาก่อน — tokenUri ต้องมีอยู่ก่อน transaction จะ mint NFT ได้"

---

## ทำไม ERC-1155 + ERC-721 ถึงเป็น Combination ที่ถูกต้อง

| Token | ใช้ทำอะไร | ทำไม |
|-------|---------|-----|
| **ERC-1155** | Carbon Credits | แต่ละ projectId มีหลายหน่วย แต่แยกโครงการกันชัดเจน |
| **ERC-721** | Retirement Certificate | แต่ละใบไม่เหมือนกัน — ระบุ Buyer, โครงการ, จำนวน, เวลา |

> "ERC-1155 เหมาะกับ carbon credit เพราะ  
> 50 credits จากโครงการเดียวกัน เหมือนกันทุกหน่วย  
> แต่ต่างโครงการต้องแยกกัน
>
> ERC-721 เหมาะกับ certificate เพราะ  
> ใบรับรองของคุณกับของฉันไม่ซ้ำกัน  
> แม้จะ offset จากโครงการเดียวกัน"

---

## Anti-Double Counting — หัวใจของระบบ

> "ปัญหา double counting คือ nightmare ของตลาดคาร์บอนทั่วโลก  
> เครดิตหน่วยเดิมถูกนับ offset ให้หลายองค์กรพร้อมกัน
>
> ระบบนี้แก้ปัญหานี้ด้วยวิธีที่ไม่ต้องพึ่งคนกลาง"

เมื่อ Buyer เรียก `retireCredits()` ระบบทำ

```
carbonToken.burn(buyer, projectId, amount)
```

**token ถูกทำลายออกจาก supply จริง**  
`balanceOf(buyer, projectId)` ลดลงทันที  
ไม่มีใครนำ credit หน่วยนั้นไป offset ซ้ำได้อีก  
เพราะ token นั้นไม่มีอยู่แล้วบน blockchain

> "ใน registry แบบเดิม การป้องกัน double counting พึ่งคนดูแล database  
> ถ้า database มีปัญหา หรือคนดูแลทำผิดพลาด หรือมีผลประโยชน์ทับซ้อน  
> double counting เกิดได้  
>
> แต่ถ้า token ถูก burn — ไม่มีใครในโลกยืน token คืนมาได้  
> นี่คือ guarantee จากคณิตศาสตร์ ไม่ใช่จากองค์กร"

---

## NFT Certificate — ใบรับรองที่ถาวรและ portable

> _ชี้ไปที่ certificate link หลัง retire_

NFT Certificate ที่ได้คือ **ERC-721 token** ที่

- อยู่ใน wallet ของ Buyer ตลอดไป
- มี metadata บน IPFS ที่แก้ไขไม่ได้ (Content-Addressed)
- แสดงชื่อโครงการ, จังหวัด, ประเภท, vintage year, จำนวน tCO₂ offset, wallet address ของผู้ offset

**Buyer ใช้ certificate ทำอะไรได้?**

- แสดงในรายงาน CSR ขององค์กร
- verify บน blockchain explorer ว่า offset จริง
- ส่งให้ third party auditor ตรวจสอบ
- ใน future อาจใช้ใน DeFi protocol หรือ insurance ได้

> "ใบรับรองนี้ไม่ใช่ PDF ที่ใครพิมพ์ให้  
> มันคือ digital asset ที่ provably เป็นของคุณ  
> และ provably แสดงว่าคุณ offset carbon หน่วยนั้นจริง  
> ไม่มีใครสร้างซ้ำได้ และไม่มีใครเอาไปจากคุณได้"

---

## ความแตกต่างจากระบบเดิม

| ประสบการณ์ Buyer | ระบบเดิม | ระบบนี้ |
|----------------|---------|--------|
| รู้ข้อมูลก่อนซื้อ | ชื่อโครงการ, เอกสาร PDF จาก Developer | Trust Score, Risk Score, satellite data, source hash |
| มั่นใจ credits จริงไหม | เชื่อ registry กลาง | ตรวจยอด ERC-1155 บน chain เองได้ |
| ป้องกัน double count | ต้องพึ่ง registry lock | Token burn — ไม่มีอยู่แล้วจริงๆ |
| ใบรับรอง | PDF ที่พิมพ์ได้ | ERC-721 NFT บน IPFS ที่โปร่งใสและถาวร |
| ตรวจสอบย้อนหลัง | ต้องขอจาก registry | Explorer เปิดดู token journey ได้เสมอ |
| เวลาซื้อ | วันหรือสัปดาห์ (bureaucratic process) | ไม่กี่วินาที (1 transaction) |

---

## Token Flow ของ Buyer — เข้าใจง่ายๆ

```
[ต้องการ Offset Carbon]
        ↓
รับ Sepolia ETH (สำหรับค่า gas)
        ↓
Claim TCUT ฟรีผ่าน TCUTSale.claimFaucet()
หรือ ซื้อ TCUT ด้วย ETH ผ่าน TCUTSale.buyTokens()
        ↓
Enable TCUT — approve MaxUint256 ให้ CarbonMarket (ครั้งเดียว)
        ↓
ดูโครงการใน Marketplace → เลือกซื้อตาม Trust/Risk Score
        ↓
buyCredits() → TCUT ออกจาก wallet + ERC-1155 เข้า wallet
        ↓
ถือ credits ไว้ หรือ
        ↓
retireCredits() → ERC-1155 ถูก burn + ERC-721 NFT Certificate เข้า wallet
        ↓
[Carbon Offset สำเร็จ — มีหลักฐาน NFT บน Blockchain]
```

---

## ตัวอย่างสถานการณ์: องค์กรต้องการ offset 100 tCO₂

> **ระบบเดิม (ใช้เวลา 2–4 สัปดาห์)**  
> ติดต่อ broker → ขอ quote → ตรวจสอบเอกสาร → รอ approval → โอนเงิน → ได้ PDF certificate  
> ไม่รู้ว่าโครงการถูกตรวจสอบอย่างไร  
> ไม่รู้ว่าเครดิตนั้นถูกขายซ้ำให้ใครหรือไม่  
> ไม่มีทางตรวจสอบย้อนหลังโดยไม่ผ่านบริษัทกลาง
>
> **ระบบนี้ (ใช้เวลา 5 นาที)**  
> 1. รับ TCUT ฟรีจาก faucet  
> 2. Enable TCUT ครั้งเดียว  
> 3. ดู Marketplace — เลือกโครงการ trust score ≥ 70  
> 4. กด Buy 100 credits → confirm ใน MetaMask → ได้ ERC-1155 ทันที  
> 5. ไป Portfolio → Retire 100 credits → ได้ NFT certificate พร้อม link IPFS  
> 6. เปิด Explorer ตรวจสอบว่า credits ถูก burn จริง → token journey ยืนยัน

---

## สรุปคุณค่าของ Marketplace

| ผู้ได้รับประโยชน์ | ได้อะไร |
|----------------|--------|
| **Buyer / องค์กร** | เห็นข้อมูลที่ verified ก่อนซื้อ, ตรวจสอบได้เอง, ได้ certificate ถาวร |
| **ตลาดคาร์บอน** | ความโปร่งใสสูงขึ้น, ลด information asymmetry ระหว่าง Developer และ Buyer |
| **สิ่งแวดล้อม** | Double counting ถูกป้องกันจากโครงสร้าง — credits ถูก offset ครั้งเดียวจริงๆ |
| **Regulator** | ตรวจสอบ volume of retirement, ประวัติ transaction โดยไม่ต้องขอข้อมูลจากบริษัท |

---

## ข้อจำกัด (พูดตรงๆ)

### 1. TCUT ไม่ใช่ Stablecoin — ราคาผันผวน

TCUT เป็น utility token ที่ไม่ผูกกับ fiat currency  
ราคา carbon credit จึงผันผวนตาม sentiment ของ TCUT ไม่ใช่ราคาตลาดคาร์บอนจริง  
ใน production ควรใช้ stablecoin เช่น USDC หรือ THB-pegged token แทน

### 2. Portfolio Loading ช้าถ้ามีโครงการเยอะ

ระบบ loop ตรวจ `balanceOf` ทุก project ID ทีละตัว  
ถ้ามี 1,000 โครงการ ต้องเรียก RPC 1,000 ครั้ง — ช้ามาก  
ใน production ควรใช้ ERC-1155 transfer event index หรือ The Graph

### 3. Certificate SVG เป็น basic design

Certificate ที่สร้างออกมาเป็น SVG พื้นฐาน  
ใน production ควรออกแบบ certificate ให้มี visual identity ของแพลตฟอร์ม และอาจมี QR code link กลับไปที่ blockchain

### 4. ยังไม่มีตลาดซื้อขาย Secondary

ปัจจุบัน Buyer ซื้อจาก Developer โดยตรง ยังไม่มี peer-to-peer trading  
ใน production ควรมี order book หรือ AMM สำหรับ secondary market

---

## Closing

> "ลองนึกภาพว่าคุณเป็น CFO ขององค์กรที่ประกาศว่า Carbon Neutral ภายในปี 2030  
> ทุกปีคุณต้องรายงานต่อ Board ว่า offset carbon ไปเท่าไร และมีหลักฐานอะไร
>
> ถ้าคุณซื้อจากระบบนี้ คุณสามารถเปิดหน้า Explorer ให้ Board ดูได้เลย  
> เห็น transaction hash, block number, timestamp  
> เห็นว่า token ถูก burn จริง — ไม่มีทางนำกลับมาใช้ซ้ำ  
> เห็น NFT certificate ที่อยู่ใน wallet ขององค์กร  
> และเห็นว่า source hash ของ assessment นั้นตรงกับข้อมูลใน blockchain
>
> นั่นไม่ใช่แค่ 'ซื้อ carbon credit' —  
> นั่นคือ 'ซื้อ accountability'"

---

## Q&A — คำถามที่มักถูกถาม

**Q: ทำไมต้องใช้ TCUT ไม่ใช่ ETH โดยตรง?**  
A: ETH เป็น native gas token — ถ้าใช้ ETH ซื้อ carbon credit โดยตรง สัญญาต้องเป็น payable function และยุ่งยากกว่ามาก  
TCUT เป็น ERC-20 ที่แยกออกมาทำให้จัดการ decimal, allowance, และ transfer logic ได้ง่ายกว่า  
และยังแยก "ค่า gas" ออกจาก "ราคาสินค้า" ชัดเจน

**Q: ถ้า Buyer ซื้อแล้วโครงการถูก Challenge ทีหลังล่ะ?**  
A: Credits ที่ Buyer ถือไว้ไม่ได้รับผลจาก challenge โดยตรง  
Challenge ไปกระทบ Developer (stake ถูก slash) และ status ของโครงการ  
แต่ credits ที่ถูก mint และโอนไปแล้ว ยังคงอยู่ใน wallet Buyer  
อย่างไรก็ตาม ใน production อาจต้องมี policy ว่า credits จากโครงการที่ถูก slash จะ invalid ด้วยหรือไม่

**Q: NFT Certificate มีมูลค่าทางกฎหมายไหม?**  
A: ในระบบปัจจุบัน — ยังไม่มีสถานะทางกฎหมายรองรับ  
แต่ blockchain proof เป็นหลักฐานดิจิทัลที่ tamper-proof  
ในอนาคต ถ้ามีกฎหมายรองรับ DeFi carbon market ก็สามารถ upgrade ระบบนี้ให้ comply ได้

**Q: ทำไมต้องเป็น ERC-721 ไม่ใช่ SBT (Soulbound Token)?**  
A: ERC-721 โอนได้ ซึ่งอาจดูเหมือนปัญหา (ขายใบรับรองได้)  
แต่ใน context นี้ certificate แสดงประวัติ offset ไม่ใช่สิทธิ์อนาคต  
และ Buyer อาจต้องโอน certificate ให้หน่วยงานตรวจสอบหรือ partner  
ใน production สามารถ switch ไป SBT ได้ถ้าต้องการ lock ไว้กับ wallet ของ Buyer เท่านั้น

**Q: ถ้าไม่มี MetaMask จะใช้ระบบนี้ได้ไหม?**  
A: ปัจจุบันต้องใช้ MetaMask เพราะทุก action ต้องมี wallet signature  
ใน production ควรรองรับ WalletConnect, Coinbase Wallet, และอาจมี embedded wallet สำหรับ user ทั่วไปที่ไม่คุ้นเคยกับ crypto
