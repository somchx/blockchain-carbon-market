# Traceability Explorer

---

## Opening — เริ่มต้นด้วยคำถาม

> "ถ้าคุณซื้อคาร์บอนเครดิตมา 100 หน่วย  
> คุณจะรู้ได้อย่างไรว่ามันมาจากโครงการจริง?  
> ใครตรวจสอบ? ตรวจเมื่อไร? และโครงการนั้นยังไม่ถูกปลอมแปลงหลังจากนั้น?"

ระบบคาร์บอนเครดิตแบบเดิม — ไม่ว่าจะเป็นเอกสาร Excel, ฐานข้อมูล Registry, หรือ PDF ที่ส่งผ่านอีเมล — **ไม่มีทางตอบคำถามเหล่านี้ได้** เพราะข้อมูลอยู่ในมือของคนคนเดียว และสามารถถูกแก้ไขได้ตลอดเวลา

นี่คือปัญหาที่หน้า Explorer นี้ถูกสร้างขึ้นมาเพื่อแก้

---

## ปัญหาของระบบเดิม

| ปัญหา | ระบบเดิม | ระบบ Blockchain |
|-------|---------|----------------|
| ใครตรวจสอบโครงการ? | เชื่อเอกสารที่บริษัทส่งมา | Transaction บน chain ระบุว่าใคร approve, เมื่อไร |
| ข้อมูลถูกแก้ไขได้ไหม? | ได้ — ใครมีสิทธิ์ก็แก้ได้ | ไม่ได้ — block ที่ถูก confirm แล้วเปลี่ยนไม่ได้ |
| เครดิตถูกใช้ซ้ำไหม? | ต้องตรวจสอบ registry กลางซึ่งอาจไม่อัปเดต | Token ถูก burn ออก — ยอดลดลงบน chain จริง |
| ตรวจสอบย้อนหลังได้ไหม? | ยาก ต้องขอข้อมูลจากผู้ดูแล | ใครก็ตามเปิดดูได้ตลอด 24 ชม. |
| หลักฐานอยู่ที่ไหน? | ไฟล์ PDF บนเซิร์ฟเวอร์ที่ลบได้ | IPFS — Content-Addressed Storage ที่แก้ไม่ได้ |

---

## หน้านี้คืออะไร

**Traceability Explorer** คือหน้าสำหรับ **ตรวจสอบย้อนหลัง** วงจรชีวิตทั้งหมดของคาร์บอนเครดิตทุกโครงการในระบบ

ใครเปิดได้: ทุกคน — ไม่ต้องเชื่อมต่อ wallet, ไม่ต้องล็อกอิน  
ข้อมูลมาจากไหน: อ่านโดยตรงจาก Ethereum Sepolia blockchain + IPFS + backend database

---

## ทัวร์หน้าจอ

### ส่วนที่ 1 — ตารางรายการโครงการ

> _ชี้ไปที่ตารางด้านบน_

ตารางนี้แสดงโครงการทุกโครงการในระบบ แต่ละแถวบอก

- **On-chain ID** — หมายเลขที่ถูก assign บน Ethereum จริง ไม่ใช่แค่ database ID
- **ชื่อโครงการ / ผู้ยื่น** — ดึงมาจาก backend database ที่บันทึกไว้ตอนผู้พัฒนายื่นเข้ามา
- **ประเภทโครงการ / จังหวัด**
- **Status** — สถานะปัจจุบันที่อ่านจาก smart contract โดยตรง ไม่ใช่ status จาก database ที่ใครแก้ได้
- **Approved Credits** — จำนวนเครดิตที่ได้รับการอนุมัติจริงบน chain
- **ราคาต่อ Credit** — ราคาที่ Developer ตั้งไว้บน smart contract

> "สังเกตว่าข้อมูลในตารางนี้มาจาก 2 แหล่งพร้อมกัน — ส่วนหนึ่งจาก backend database ที่เก็บรายละเอียด, อีกส่วนจาก blockchain โดยตรง ถ้า 2 แหล่งนี้ขัดแย้งกัน ระบบจะเชื่อ blockchain เสมอ"

---

### ส่วนที่ 2 — ช่องค้นหา

> _พิมพ์ชื่อจังหวัดหรือประเภทโครงการ_

ค้นหาได้จาก Project ID, ชื่อโครงการ, จังหวัด, ประเภท หรือสถานะ

---

### ส่วนที่ 3 — Modal รายละเอียดโครงการ (หัวใจของหน้านี้)

> _กดปุ่ม "ดูรายละเอียด" บนโครงการที่มี on-chain ID_

เมื่อกดเปิด ระบบจะ

1. เชื่อมต่อ Ethereum node โดยตรง (Tenderly RPC)
2. ดึง Event Logs ย้อนหลัง 200,000 blocks จาก smart contract
3. Filter เฉพาะ events ของโครงการนั้น
4. ดึง timestamp จาก block header
5. ดึงไฟล์หลักฐานจาก backend → ได้ IPFS CID

ทั้งหมดนี้เกิดขึ้นใน real-time ทุกครั้งที่กด

---

## Token Journey — จุดเด่นที่สุดของหน้านี้

> _ชี้ไปที่ timeline ด้านล่าง modal_

นี่คือ **Token Journey** — Timeline ที่แสดงทุก event บน blockchain ที่เกี่ยวข้องกับโครงการนี้ เรียงตาม block number จากเก่าสุดถึงใหม่สุด

### Event ที่ระบบติดตาม

| Event | ความหมาย | สิ่งที่บันทึก |
|-------|---------|-------------|
| 📝 Project Submitted | Developer ยื่นโครงการขึ้น chain | Seller address, จำนวน credits ที่ขอ |
| ✅ Verifier Approved | Assessor ตรวจและอนุมัติ | Credits ที่อนุมัติ, Risk Score, Required Stake |
| 🔒 Stake Deposited | Developer วางหลักประกัน TCUT | Depositor address, จำนวน TCUT |
| 🌱 Credits Minted & Listed | Carbon Credits ถูก mint เป็น ERC-1155 | จำนวน credits, ราคาต่อ credit |
| 🛒 Credits Purchased | Buyer ซื้อ credits | Buyer address, จำนวน, ราคารวม |
| ⚠️ Challenge Opened | มีการเปิด challenge โครงการ | Challenger address, deadline |
| ⚖️ Challenge Finalized | ผลการ challenge ถูกตัดสิน | fraud confirmed?, จำนวน slash |
| 🏆 Reward Issued | ผู้ชนะ challenge ได้ reward | จำนวน reward, updated trust score |
| 🔥 Credits Retired | Buyer offset carbon จริง | Retiree address, จำนวน, NFT Cert # |

### ทำไมนี่ถึงสำคัญมาก

> "ลองนึกภาพ: คุณกำลังดูโครงการหนึ่ง แล้วเห็น timeline ว่า  
> — Block 7,832,100: โครงการถูกยื่น  
> — Block 7,832,150: Verifier อนุมัติ (50 blocks ต่อมา ≈ 10 นาที)  
> — Block 7,832,200: Developer วาง stake  
> — Block 7,832,300: Credits ถูก mint  
> — Block 7,834,000: มีคนซื้อ 50 credits  
> — Block 7,836,000: Buyer นั้น retire credits  
>
> ทุกอย่างนี้ ไม่มีใครแก้ได้ หน่วยงานกำกับดูแลสามารถเปิดตรวจสอบได้ตลอดเวลา  
> ไม่ต้องรอเอกสาร ไม่ต้องส่งคำขอ ไม่ต้องรอตอบ"

---

## หลักฐาน IPFS — ไฟล์ที่แก้ไม่ได้

> _ชี้ไปที่ section หลักฐานบน IPFS_

เมื่อ Developer อัปโหลดเอกสารโครงการ (PDF, รูปภาพ) ระบบจะ

1. อัปโหลดไปยัง **IPFS** ผ่าน Pinata
2. ได้ **CID (Content Identifier)** — hash ที่สร้างจากเนื้อหาไฟล์นั้นเอง
3. CID นี้บันทึกไว้ใน database

**ทำไม IPFS ถึงดีกว่า Google Drive หรือ Server ธรรมดา?**

> "ถ้าฉันบอกว่าเอกสารอยู่ที่ google.com/file/abc  
> ฉันสามารถลบไฟล์นั้นแล้ว upload ไฟล์ใหม่ที่ URL เดิมได้  
> คุณจะไม่รู้เลยว่าเนื้อหาเปลี่ยนไป
>
> แต่ถ้าฉันให้ CID ว่า QmXyz...  
> CID นั้นคำนวณมาจากเนื้อหาของไฟล์  
> ถ้าไฟล์เปลี่ยน CID จะเปลี่ยนทันที  
> คุณจึงรู้ได้ทันทีว่าเอกสารถูกแก้หรือไม่"

ในหน้า Explorer คุณสามารถคลิกที่ไฟล์หลักฐานแต่ละไฟล์เพื่อเปิดดูต้นฉบับจาก IPFS ได้โดยตรง

---

## สิ่งที่ระบบนี้ทำได้ซึ่งระบบเดิมทำไม่ได้

### 1. Permissionless Verification (ตรวจสอบโดยไม่ต้องขออนุญาต)

ระบบเดิม: ต้องส่งคำขอไปที่ registry, รอคำตอบ, อาจถูกปฏิเสธ  
ระบบนี้: เปิด browser กด F12 เรียก RPC node ได้เลย — ไม่มีใครสามารถบล็อกได้

### 2. Immutable Audit Trail (ประวัติที่ลบไม่ได้)

ระบบเดิม: ถ้า Excel หาย หรือเซิร์ฟเวอร์ crash ประวัติหายหมด  
ระบบนี้: ตราบใดที่ Ethereum ยังทำงาน ทุก event ยังอยู่ครบ

### 3. Anti-Double Counting (ป้องกันการนับซ้ำจากโครงสร้าง)

ระบบเดิม: ต้องมีคนกลางคอย lock record เพื่อป้องกัน double counting  
ระบบนี้: เมื่อ `CreditsRetired` event ถูก emit token ถูก burn ออกจาก supply จริง — ทำซ้ำไม่ได้ตามโครงสร้างของ ERC-1155

### 4. Cross-party Transparency (ทุกฝ่ายเห็นข้อมูลเดียวกัน)

ระบบเดิม: Buyer เห็นข้อมูลที่ Seller เลือกจะแชร์เท่านั้น  
ระบบนี้: Developer, Verifier, Buyer, Regulator เห็นข้อมูลชุดเดียวกัน real-time — ไม่มีข้อมูลลับ

---

## ตัวอย่างสถานการณ์จริง

### สถานการณ์: หน่วยงานกำกับดูแลต้องการตรวจสอบโครงการ

**แบบเดิม:**  
โทรหา registry → ขอไฟล์เอกสาร → รอ 3-5 วัน → ได้ Excel ที่อาจไม่อัปเดต → ยังไม่รู้ว่าเครดิตถูกขายต่อหรือ retire แล้วหรือยัง

**แบบระบบนี้:**  
เปิด Explorer → ค้นหาชื่อโครงการ → คลิกดูรายละเอียด → เห็นทุก event พร้อม tx hash → กด link ไป Etherscan verify เองได้เลย → ใช้เวลา 30 วินาที

### สถานการณ์: Buyer ต้องการยืนยัน offset ที่ซื้อไป

**แบบเดิม:**  
ได้ PDF ใบรับรองมา แต่ไม่รู้ว่า registry ข้างในอัปเดตจริงไหม  
หรือเครดิตหน่วยนั้นถูกขายให้คนอื่นด้วยหรือเปล่า

**แบบระบบนี้:**  
Explorer แสดง `CreditsRetired` event พร้อม NFT Cert # และ retiree address  
Buyer ตรวจสอบ wallet ตัวเองใน MetaMask ว่าได้รับ ERC-721 certificate จริงหรือไม่ → เชื่อมได้ทั้ง 2 ทาง

---

## ข้อมูลที่แสดงในแต่ละโครงการ

เมื่อเปิด modal รายละเอียด จะเห็น

**ข้อมูลหลัก**
- Seller address (wallet ที่ submit)
- Approved Credits
- Risk Score / Trust Score (คำนวณโดย AI risk engine)
- Staked Amount vs Required Stake
- Available Credits เหลืออยู่
- Price per Credit (ราคาปัจจุบันบน chain)

**หลักฐาน IPFS**
- ไฟล์ที่ Developer อัปโหลด (PDF, รูป) พร้อม CID
- คลิกเปิดต้นฉบับจาก IPFS ได้โดยตรง

**Token Journey**
- ทุก event บน blockchain เรียงตามเวลา
- แต่ละ event มี: ชื่อ event, timestamp, block number, tx hash, และ details ที่ parse แล้ว
- tx hash เชื่อมไปที่ Sepolia Etherscan — verify ได้ทันที

---

## Etherscan Integration

ทุก transaction ใน Token Journey สามารถคลิก link ไปดูที่ Etherscan ได้โดยตรง

> _กด link tx hash ใด tx hash หนึ่ง_

ที่ Etherscan จะเห็น
- ใคร call function อะไร (เช่น `assessProject`, `depositStake`, `buyCredits`)
- เมื่อไร (timestamp)
- Gas ที่ใช้
- Input data ดิบ

นี่คือ "การยืนยันชั้นที่ 2" — ไม่ต้องเชื่อ Explorer ของเรา ไปดูที่ Etherscan เองได้

---

## สรุปคุณค่าของ Traceability Explorer

| ผู้ใช้ | สิ่งที่ได้ |
|--------|---------|
| **Regulator** | ตรวจสอบสถานะโครงการทุกตัวได้ตลอด 24/7 ไม่ต้องรอ report จาก operator |
| **Buyer** | ยืนยันว่าเครดิตที่ซื้อมาจากโครงการจริง ผ่านการตรวจสอบจริง และไม่ได้ถูกขายซ้ำ |
| **Developer** | แสดงหลักฐานความโปร่งใสให้ลูกค้าโดยไม่ต้องส่งเอกสาร |
| **Auditor** | ไม่ต้องพึ่งบุคคลที่สาม — ข้อมูลครบอยู่บน chain และ IPFS |
| **นักวิจัย** | ศึกษา lifecycle ของ carbon credit ได้จาก raw data จริง |

---

## ข้อจำกัด (พูดด้วยความซื่อสัตย์)

### 1. ดึง Event Logs ช้า

ระบบ scan 200,000 blocks ย้อนหลัง แบ่งเป็น chunks ละ ~50,000 blocks  
ถ้าโครงการมี events อยู่ในช่วง block เก่ามาก อาจโหลดหน้า modal นาน 5–10 วินาที

ใน production จริงควรใช้ The Graph Protocol — indexer ที่ cache events ไว้ query ได้ใน milliseconds

### 2. ข้อมูล Backend ≠ On-chain เสมอ

โครงการที่ยื่นผ่าน backend แต่ยังไม่ขึ้น chain (เช่น ยังไม่ผ่าน Verifier หรือ Developer ยังไม่กด `submitProject()`) จะแสดงเฉพาะข้อมูล backend ไม่มี Token Journey

### 3. RPC Rate Limit

การเชื่อมต่อผ่าน public RPC node (Tenderly) มี rate limit  
ถ้าผู้ใช้หลายคนเปิดพร้อมกันอาจช้า — ใน production ควรมี dedicated node

### 4. IPFS Gateway Availability

หากไฟล์หลักฐานถูก unpin จาก Pinata link จะใช้งานไม่ได้  
ใน production ควรมี pinning service หลายตัวรองรับ

---

## Closing

> "ระบบตลาดคาร์บอนเครดิตที่มีอยู่ในโลกตอนนี้ มักมีปัญหาที่ว่า  
> ยิ่งตลาดใหญ่ขึ้น ยิ่งต้องการ trust มากขึ้น  
> แต่ trust ต้องอาศัยคนกลาง คนกลางอาจมีผลประโยชน์ทับซ้อน
>
> สิ่งที่ Traceability Explorer พิสูจน์คือ  
> trust ไม่จำเป็นต้องมาจากองค์กร มันสามารถมาจากคณิตศาสตร์และ cryptography
>
> ทุก event ที่เห็นในหน้านี้ ถูก sign โดย private key  
> ถูกยืนยันโดย network ของ node หลายพัน  
> และถูกบันทึกใน structure ที่แก้ไขต้องทำลายประวัติทั้ง chain  
>
> นี่คือความหมายของ Trustless Verification  
> ไม่ใช่ว่าไม่ต้องเชื่อใคร — แต่ไม่ต้องเชื่อใคร **โดยไม่มีหลักฐาน** อีกต่อไป"

---

## Q&A — คำถามที่มักถูกถาม

**Q: ข้อมูลใน Explorer ถูกต้อง 100% ไหม?**  
A: ข้อมูลที่มาจาก blockchain ถูกต้องตาม state ของ smart contract ณ ขณะนั้น  
ข้อมูลจาก backend (ชื่อโครงการ, ผู้ยื่น) อาจมีความคลาดเคลื่อนได้ถ้า backend มีปัญหา  
แต่ข้อมูลที่สำคัญที่สุด — สถานะ, credits, events — มาจาก chain ทั้งหมด

**Q: ใครก็ได้เข้ามาดูได้เลยไหม?**  
A: ได้ — ไม่ต้องล็อกอิน ไม่ต้องเชื่อม wallet นี่คือ feature ที่ตั้งใจ  
การตรวจสอบควรเปิดกว้างให้ทุกคน ไม่ใช่แค่ผู้ที่มีสิทธิ์พิเศษ

**Q: ถ้า event หายไปจาก Explorer ล่ะ?**  
A: Event บน blockchain ไม่หายหรอก ถ้า Explorer ไม่แสดง อาจเป็นเพราะ  
block ที่ event อยู่เก่ากว่า lookback window (200,000 blocks) หรือ RPC มีปัญหา  
แต่ event นั้นยังอยู่บน chain — verify ได้จาก Etherscan โดยตรง

**Q: ต่างกับ Etherscan อย่างไร?**  
A: Etherscan แสดง raw transactions — ต้องรู้ ABI ถึงจะ decode ได้  
Explorer นี้ decode event ให้แล้ว และรวม context ของโครงการเข้ามา (ชื่อ, จังหวัด, ประเภท, หลักฐาน IPFS)  
ทำให้ผู้ที่ไม่รู้ blockchain ก็อ่านเข้าใจได้
