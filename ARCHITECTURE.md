# Blockchain Carbon Market Architecture and Business Flow

> Thailand Carbon Credit Market Research Prototype  
> Network: Ethereum Sepolia Testnet  
> ฉบับอธิบายสำหรับผู้อ่านที่ยังไม่รู้ระบบมาก่อน

---

## 1. ภาพรวมของระบบ

### ระบบนี้ถูกสร้างขึ้นมาเพื่อแก้ปัญหาอะไร

ตลาดคาร์บอนเครดิตแบบเดิมมักมีปัญหาหลัก 4 เรื่อง

1. ข้อมูลไม่โปร่งใส  
   ผู้ซื้ออาจไม่รู้ว่าคาร์บอนเครดิตที่ซื้อ มาจากโครงการอะไร และผ่านการตรวจสอบจริงหรือไม่

2. ตรวจสอบย้อนหลังยาก  
   เมื่อเครดิตถูกขายต่อหลายครั้ง การตรวจสอบประวัติการถือครองหรือการใช้งานทำได้ยาก

3. ความน่าเชื่อถือของโครงการไม่เท่ากัน  
   บางโครงการอาจขอเครดิตเกินจริง หรือมีข้อมูลไม่สอดคล้องกับสภาพพื้นที่จริง

4. เสี่ยงต่อการใช้ซ้ำ หรือ Double Counting  
   เครดิตเดียวกันอาจถูกนับซ้ำ หรือถูกนำไปใช้ offset มากกว่าหนึ่งครั้ง

ระบบนี้จึงถูกออกแบบให้ใช้ Blockchain, Smart Contract, IPFS, External APIs และ Risk Assessment Engine มาช่วยให้ทุกขั้นตอนของวงจรชีวิตคาร์บอนเครดิตตรวจสอบได้ตั้งแต่ต้นจนจบ

---

### ผู้ใช้งานแต่ละประเภทมีใครบ้าง

ระบบนี้มีผู้เกี่ยวข้องหลัก 5 กลุ่ม

1. Project Developer  
   ผู้พัฒนาโครงการลดคาร์บอน เช่น โครงการปลูกป่า ป่าชายเลน พลังงานแสงอาทิตย์ หรือก๊าซชีวภาพ

2. Verifier / Assessor  
   ผู้ตรวจประเมินโครงการ ทำหน้าที่ตรวจสอบข้อมูลและอนุมัติผลการประเมินบน Blockchain

3. Buyer  
   ผู้ซื้อคาร์บอนเครดิต เพื่อนำไปถือครอง ซื้อขายต่อ หรือใช้ offset การปล่อยคาร์บอน

4. Regulator / Observer  
   ผู้ติดตามตรวจสอบระบบ เช่น หน่วยงานกำกับดูแลหรือผู้สังเกตการณ์ ใช้ Explorer และ Admin Dashboard เพื่อตรวจสอบความโปร่งใส

5. Community / DAO  
   กลุ่มผู้ถือ Governance Token ที่ร่วมกำหนดกติกาของระบบผ่านการโหวต

---

### แต่ละ Role ทำหน้าที่อะไร และต่างกันอย่างไร

| Role | หน้าที่หลัก | สิ่งที่ทำในระบบ |
|---|---|---|
| Project Developer | สร้าง supply ของคาร์บอนเครดิต | ยื่นโครงการ, ส่งข้อมูล, วางหลักประกัน, อัปโหลดหลักฐาน, mint credits, ตั้งราคาขาย |
| Verifier / Assessor | ตรวจสอบความถูกต้อง | ดู risk signals, เปิด evidence, approve assessment บน chain |
| Buyer | สร้าง demand และใช้เครดิต | ซื้อเครดิต, ถือใน portfolio, retire credits, รับใบรับรอง NFT |
| Regulator / Observer | ตรวจสอบความโปร่งใส | ดู transaction history, event logs, project status, leaderboard |
| DAO / Community | กำกับดูแลระบบ | เสนอ proposal, โหวตเปลี่ยน parameter, เปลี่ยน assessor หรือค่าธรรมเนียม |

ความต่างสำคัญคือ

- Developer เป็นฝ่ายสร้างเครดิต
- Verifier เป็นฝ่ายอนุมัติ
- Buyer เป็นฝ่ายใช้เครดิต
- Observer เป็นฝ่ายตรวจสอบ
- DAO เป็นฝ่ายกำกับกติกาของระบบ

---

## 2. System Flow แบบ End-to-End

ส่วนนี้คือภาพธุรกิจของระบบตั้งแต่ต้นจนจบ

### ขั้นที่ 1: Project Owner หรือ Project Developer ยื่นโครงการ

Developer เริ่มต้นโดยกรอกข้อมูลโครงการในหน้า `/developer`

ข้อมูลที่ส่งเข้าไปมีตัวอย่างเช่น

- ชื่อโครงการ
- จังหวัด
- ประเภทโครงการ เช่น forest, mangrove, solar, biogas
- ขนาดพื้นที่
- จำนวนเครดิตที่ขอ
- ปริมาณการลดคาร์บอนที่รายงานเอง
- ปีของเครดิต
- เอกสารหลักฐาน

หน้าที่ของขั้นนี้คือให้ระบบรู้ว่าโครงการต้องการขอคาร์บอนเครดิตเท่าไร และอ้างว่าลดคาร์บอนได้มากน้อยแค่ไหน

---

### ขั้นที่ 2: ระบบประเมินความเสี่ยงของโครงการ

หลังจาก Developer กรอกข้อมูลแล้ว Backend จะคำนวณ Risk Assessment

ระบบใช้ข้อมูลจาก 2 ส่วน

1. ข้อมูลที่ผู้ใช้กรอกเอง
2. ข้อมูลภายนอกจาก API

ข้อมูลภายนอกที่ใช้จริงในระบบนี้ได้แก่

- NASA POWER API  
  ใช้ดูค่าแสงแดดเฉลี่ยและปริมาณฝนในพื้นที่โครงการ

- OpenWeatherMap API  
  ใช้ดูข้อมูลสภาพอากาศปัจจุบัน เช่น อุณหภูมิ ความชื้น และเมฆ

- MODIS / satellite-derived signals  
  ใช้ช่วยประเมินความเหมาะสมของพื้นที่และลักษณะโครงการ

ผลลัพธ์ที่ได้จาก Risk Engine คือ

- `riskScore`
- `trustScore`
- `approvedCredits`
- `requiredStake`
- `recommendation`

พูดง่าย ๆ คือระบบพยายามตอบคำถามว่า

- โครงการนี้ดูน่าเชื่อถือแค่ไหน
- จำนวนเครดิตที่ขอมาดูสมเหตุสมผลไหม
- ควรต้องวางหลักประกันเท่าไร

---

### ขั้นที่ 3: ใครเป็นผู้อนุมัติ

ผู้อนุมัติคือ Verifier หรือ Assessor

เมื่อ Developer ส่งข้อมูลแล้ว Verifier จะเปิดหน้า `/verifier` เพื่อดู

- ข้อมูลโครงการ
- risk score
- trust score
- climate signals
- ไฟล์หลักฐานจาก IPFS

ถ้า Verifier เห็นว่าโครงการสมเหตุสมผล จึงจะกด approve และเรียกฟังก์ชัน `assessProject()` บน Smart Contract

ดังนั้น Backend เป็นผู้ “คำนวณ”
แต่ Verifier เป็นผู้ “ตัดสินใจอนุมัติ”

---

### ขั้นที่ 4: การวางหลักประกัน (Collateral / Stake)

หลังได้รับผลประเมิน Developer ต้องวางหลักประกันก่อนจะ mint เครดิตได้

#### วางเพื่ออะไร

การวางหลักประกันมีไว้เพื่อสร้างแรงจูงใจให้ Developer ส่งข้อมูลที่ถูกต้อง  
ถ้าภายหลังพบว่าโครงการ fraud หรือข้อมูลไม่จริง stake นี้สามารถถูก slash ได้

#### วางด้วย token อะไร

ใช้ `TCUT Token`

TCUT คือ utility token ของระบบ ใช้สำหรับ

- stake
- buy
- reward

#### จำนวนคิดอย่างไร

จำนวน stake มาจากผลประเมินความเสี่ยง

แนวคิดคือ

- ถ้า risk สูง ต้องวางมากขึ้น
- ถ้า approved credits สูง จำนวน stake ก็เพิ่มขึ้น

กล่าวอีกแบบหนึ่งคือ stake ทำหน้าที่คล้าย “เงินค้ำประกัน”

#### หากไม่ผ่านจะเกิดอะไรขึ้น

- ถ้า Verifier ไม่ approve โครงการจะไม่สามารถเข้าสู่ขั้น mint credits ได้
- ถ้าภายหลังโดน challenge และ fraud ได้รับการยืนยัน ระบบสามารถ slash stake

---

### ขั้นที่ 5: Oracle, NASA API และ OpenWeather API มีหน้าที่อย่างไร

#### NASA POWER / OpenWeather อยู่ตรงไหน

ทั้งสอง API ถูกใช้ใน Backend Risk Engine

- NASA POWER ใช้ดูข้อมูลภูมิอากาศเชิง historical
- OpenWeatherMap ใช้ดูสภาพอากาศปัจจุบัน

ข้อมูลเหล่านี้ช่วยให้การประเมินไม่ต้องพึ่งแค่คำบอกเล่าจากผู้ยื่นโครงการ

#### Oracle มีหน้าที่อะไร

Oracle ในระบบนี้ทำหน้าที่เป็นตัวเชื่อมข้อมูลภายนอกเข้าสู่โลกของ Blockchain

ปกติ Smart Contract ไม่สามารถเรียก API ภายนอกได้เองโดยตรง  
จึงต้องมี Oracle มาช่วยนำข้อมูลภายนอกเข้ามา

ในโปรเจกต์นี้ใช้ `RiskOracleConsumer.sol`

บทบาทของมันคือ

- ดึงหรือรับข้อมูล NASA POWER เข้าสู่ on-chain context
- เก็บผล climate data บางส่วนบน chain

หมายเหตุสำคัญ:

ใน prototype ปัจจุบัน Oracle ยังอยู่ในโหมด demo/simulated fulfill ผ่าน `ownerFulfill()` มากกว่าการใช้งาน Chainlink production เต็มรูปแบบ

---

### ขั้นที่ 6: การออก Carbon Credits

Carbon Credit จะถูกสร้างก็ต่อเมื่อ

1. โครงการถูก submit
2. ผ่านการประเมินและ approve
3. Developer วาง stake ครบ
4. Developer เรียก `mintAndListCredits()`

#### ถูก Mint เป็น token ประเภทใด

ถูก mint เป็น `ERC-1155`

#### เหตุใดจึงเลือก ERC-1155

เพราะคาร์บอนเครดิตในระบบนี้มีลักษณะว่า

- แต่ละโครงการต้องแยกกันชัดเจน
- แต่ในโครงการเดียวกันมีเครดิตได้หลายหน่วย

ตัวอย่าง

- Project A มี 800 credits
- Project B มี 300 credits

ERC-1155 เหมาะมากเพราะ

- contract เดียวรองรับหลาย `tokenId`
- `tokenId` แต่ละตัวแทนแต่ละโครงการ
- แต่ละ `tokenId` มีหลายหน่วยได้

ในระบบนี้แนวคิดคือ

`1 token = 1 tCO2`

---

### ขั้นที่ 7: การนำ Carbon Credit เข้าสู่ Marketplace

หลัง mint แล้ว Developer จะเป็นผู้ลงขาย

#### ใครขายได้

ผู้ที่ขายได้คือ Developer เจ้าของโครงการนั้น

#### ตั้งราคาอย่างไร

Developer ระบุราคาต่อ 1 credit ตอนเรียก `mintAndListCredits()`

ตัวอย่างเช่น

- 100 TCUT ต่อ 1 credit

#### ข้อมูลถูกเก็บที่ใด

ข้อมูลของสินทรัพย์ถูกเก็บแยกกัน 2 ที่

- on-chain: จำนวนเครดิต, ราคา, status, ownership, events
- off-chain / IPFS: หลักฐานโครงการและ metadata บางส่วน

---

### ขั้นที่ 8: การซื้อ Carbon Credit

Buyer เข้าไปที่หน้า `/buyer` เพื่อดูรายการเครดิตที่ขายอยู่

#### Buyer ต้องเตรียมอะไรบ้าง

- MetaMask (เชื่อมต่อกับ Sepolia network)
- Sepolia ETH สำหรับจ่าย gas ทุก transaction
- TCUT สำหรับจ่ายราคาเครดิต

#### Buyer รับ TCUT ได้อย่างไร

ระบบมี contract แยกต่างหากชื่อ `TCUTSale` สำหรับแจก TCUT ให้ Buyer

Buyer ทำได้ 2 วิธี
- กด "รับฟรี (Faucet)" — รับ TCUT ฟรีผ่าน `claimFree()` โดยไม่เสีย TCUT แต่ยังต้องมี ETH จ่าย gas
- กด "ซื้อด้วย ETH" — แลก Sepolia ETH เป็น TCUT ผ่าน `buyWithETH()` ในอัตราที่ contract กำหนด

หลังได้ TCUT แล้ว Buyer สามารถกดปุ่ม "เพิ่มใน MetaMask" เพื่อ import token address `0xe51A5687ad95b737D6DF0DF89CD2419375214ec5` ให้ MetaMask แสดงยอดด้วย

#### TCUT มีบทบาทอย่างไร

TCUT คือ token กลางที่ใช้จ่ายใน marketplace  
Buyer ไม่ได้ใช้ ETH ซื้อเครดิตโดยตรง แต่ใช้ ETH จ่าย gas และใช้ TCUT จ่ายราคาสินค้า

#### ซื้อขายกันด้วย Token อะไร

ใช้ `TCUT (ERC-20)`

#### Smart Contract ตัวใดทำงาน

ตัวหลักคือ `CarbonMarket`

ก่อนซื้อครั้งแรก Buyer ต้อง "Enable TCUT" ก่อนหนึ่งครั้ง โดย approve `MaxUint256` ให้ `CarbonMarket` contract ใช้ TCUT แทนได้

```
TCUT.approve(CarbonMarket, MaxUint256)
```

การ approve แบบ `MaxUint256` ทำให้ Buyer ไม่ต้อง approve ซ้ำทุกครั้งที่ซื้อ ระบบ frontend จะตรวจ allowance ตอนโหลดหน้า ถ้า allowance > 999,999 TCUT ถือว่า Enable แล้ว ปุ่ม "Enable TCUT" จะไม่แสดง

หลัง Enable แล้ว Buyer กด "Buy Credits" แล้วยืนยันใน MetaMask ครั้งเดียว ระบบเรียก `buyCredits()` บน `CarbonMarket` โดยตรง

เมื่อซื้อสำเร็จ

- TCUT ถูกหักจาก Buyer ผ่าน `transferFrom`
- ส่วนหนึ่งไป treasury
- ส่วนหนึ่งไป Developer
- Carbon Credit ERC-1155 ถูกโอนให้ Buyer

---

### ขั้นที่ 9: การ Offset Carbon

Buyer จะกด offset หรือ retire เมื่อเขาต้องการ “ใช้” เครดิตจริง ไม่ใช่แค่ถือหรือซื้อขายต่อ

#### Offset แล้วเกิดอะไรขึ้น

ระบบจะเรียก `retireCredits()`

#### Carbon Credit ถูก Burn หรือ Retire อย่างไร

เครดิต ERC-1155 ของ Buyer จะถูก burn ออกจากกระเป๋า

หมายความว่าเครดิตนั้น

- ถูกใช้ไปแล้ว
- ไม่สามารถขายต่อได้อีก
- ไม่สามารถนำกลับมา offset ซ้ำได้

#### ป้องกัน Double Counting อย่างไร

การ burn token เป็นหัวใจสำคัญของการป้องกัน Double Counting

เพราะเมื่อเครดิตถูก retire แล้ว จำนวนคงเหลือของ token ลดลงจริงบน chain  
จึงไม่มีใครนำเครดิตหน่วยเดิมไปใช้ซ้ำได้อีก

---

### ขั้นที่ 10: การออกใบรับรอง

เมื่อ retire สำเร็จ ระบบจะออกใบรับรองให้ Buyer

#### ใบรับรองถูกสร้างเมื่อไร

สร้างทันทีหลังเรียก `retireCredits()` สำเร็จ

#### ใช้ token มาตรฐานอะไร

ใช้ `ERC-721`

#### เหตุใดจึงเลือก ERC-721

เพราะใบรับรองแต่ละใบไม่ซ้ำกัน

ใบหนึ่งอ้างอิงถึง

- ผู้ใช้คนหนึ่ง
- โครงการหนึ่ง
- จำนวนเครดิตที่ retire
- เวลา retire

ดังนั้นมันเหมาะกับ NFT ที่ไม่ซ้ำกันมากกว่าการใช้ ERC-20 หรือ ERC-1155

#### ใบรับรองมีข้อมูลอะไรบ้าง

ในระดับธุรกิจ ใบรับรองจะมีข้อมูลเช่น

- projectId
- ผู้ retire
- จำนวน credits retired
- เวลา retire
- token URI ที่ชี้ไปยัง metadata / ไฟล์ใบรับรองบน IPFS

---

## 3. วิเคราะห์ Smart Contracts ทั้งหมด

### 3.1 CarbonMarket

นี่คือ contract หลักของระบบ

หน้าที่สำคัญ

- รับ submit project
- เก็บ project state
- รับผล assessment
- รับ stake
- mint และ list credits
- ซื้อ credits
- retire credits
- challenge / slash / reward

พูดง่าย ๆ คือเป็น “ศูนย์กลางธุรกิจ” ของระบบทั้งหมด

---

### 3.2 TCUT Token (ERC-20)

contract นี้คือ utility token ของระบบ

หน้าที่

- ใช้เป็น token สำหรับ stake
- ใช้ซื้อ carbon credits
- ใช้จ่าย reward

เหตุผลที่ใช้ ERC-20 เพราะหน่วยทุกหน่วยเหมือนกันหมด เหมาะกับบทบาท “เงินในระบบ”

---

### 3.2b TCUTSale

contract แยกต่างหากสำหรับแจก TCUT ให้ Buyer ที่เพิ่งเข้าระบบ

หน้าที่

- `claimFree()` — แจก TCUT ฟรีตามจำนวนที่กำหนด สามารถเรียกซ้ำได้ตามใจ (testnet)
- `buyWithETH()` — รับ Sepolia ETH และโอน TCUT ให้ในอัตราที่ owner กำหนด

เหตุผลที่แยกออกมาเป็น contract ต่างหาก เพราะ faucet / sale logic ไม่ควรปะปนกับ utility token หลัก และสามารถปิดหรือเปลี่ยนอัตราได้โดยไม่กระทบ TCUT contract

---

### 3.3 Carbon Credit Token (ERC-1155)

contract นี้เก็บ carbon credits ที่ถูกออกจากแต่ละโครงการ

หน้าที่

- mint carbon credits
- เก็บ balance ของแต่ละ projectId
- burn credits ตอน retire

เหตุผลที่ใช้ ERC-1155 เพราะต้องการแยกหลาย project ใน contract เดียว และแต่ละ project มีหลายหน่วยได้

---

### 3.4 Retire Certificate (ERC-721)

contract นี้ใช้สำหรับใบรับรองหลัง retire

หน้าที่

- mint certificate ให้ผู้ที่ retire credits
- เก็บข้อมูล certificate ต่อ tokenId
- ชี้ token URI ไปยัง metadata/ไฟล์ใบรับรอง

เหตุผลที่ใช้ ERC-721 เพราะ certificate แต่ละใบไม่เหมือนกัน

---

### 3.5 CGOV Token

contract นี้คือ governance token

หน้าที่

- ใช้เป็นสิทธิ์โหวตใน DAO
- ผู้ถือ token สามารถ delegate และ vote ได้

มันไม่ได้ใช้ซื้อเครดิตหรือ stake แต่ใช้ในมุม governance

---

### 3.6 GovernorDAO

contract นี้คือกลไก DAO

หน้าที่

- รับ proposal
- ให้โหวต
- นับคะแนน
- execute proposal ที่ผ่าน

เช่น

- เปลี่ยน assessor
- เปลี่ยน platform fee
- เปลี่ยน parameter บางอย่างของระบบ

---

### 3.7 Chainlink Oracle / RiskOracleConsumer

contract นี้มีหน้าที่เชื่อมข้อมูลภายนอกเข้ามาในโลก on-chain

หน้าที่หลัก

- request climate data
- เก็บผลที่ได้
- serve เป็นจุดอ้างอิงสำหรับ on-chain logic หรือ dashboard

ใน prototype นี้มันยังทำงานในโหมด demo มากกว่าการใช้ production oracle เต็มรูปแบบ

---

### Contract ไหนเรียก Contract ไหน

ความสัมพันธ์หลักมีดังนี้

- `CarbonMarket` เรียก `CarbonCreditToken` ตอน mint / burn credits
- `CarbonMarket` เรียก `RetireCertificate` ตอนออก NFT certificate
- `CarbonMarket` โต้ตอบกับ `TCUT` ตอน stake, buy, reward, slash
- `GovernorDAO` ใช้ `CGOV` เป็นสิทธิ์ออกเสียง
- `RiskOracleConsumer` แยกออกมาต่างหากเพื่อจัดการข้อมูลภายนอก

---

### ข้อมูลไหลอย่างไร

ลำดับข้อมูลแบบง่าย

1. User ส่งข้อมูลเข้า Frontend
2. Frontend ส่งไป Backend
3. Backend เรียก APIs ภายนอกและคำนวณ risk
4. Verifier approve ผลประเมินขึ้น `CarbonMarket`
5. `CarbonMarket` mint / buy / retire โดยเรียก token contracts ที่เกี่ยวข้อง

---

### เหตุใดจึงต้องแยกหลาย Contract แทนรวมเป็น Contract เดียว

เพราะแต่ละส่วนมีหน้าที่คนละแบบ

- market logic
- payment token
- asset token
- certificate NFT
- governance
- oracle

ข้อดีของการแยก

1. อ่านง่ายและดูแลง่าย
2. ปรับปรุงเฉพาะส่วนได้
3. ลดความซับซ้อนของแต่ละ contract
4. แยกความรับผิดชอบชัดเจน
5. เหมาะกับการ audit มากกว่า contract ใหญ่ก้อนเดียว

---

## 4. วิเคราะห์ Token Flow

### 4.1 TCUT

#### ถูกสร้างเมื่อไร

ถูก mint ตอน deploy `PlatformToken`

#### ใครถือครอง

เริ่มต้น owner ถือ supply ก้อนแรก  
จากนั้น owner อาจแจกหรือโอนให้ developer / buyer / reviewer

#### Buyer รับ TCUT ได้อย่างไร

Buyer ใช้ `TCUTSale` contract

- `claimFree()` — รับฟรีโดยไม่ต้องจ่าย TCUT แต่ต้องมี Sepolia ETH จ่าย gas
- `buyWithETH()` — จ่าย Sepolia ETH แลก TCUT ในอัตราที่กำหนด

#### Buyer ต้อง Enable ก่อนซื้อ

ก่อนซื้อครั้งแรก Buyer ต้อง approve `MaxUint256` ให้ `CarbonMarket` ใช้ TCUT แทน  
เรียกว่า "Enable TCUT" ทำครั้งเดียว ระบบ frontend ตรวจ allowance อัตโนมัติ

#### โอนเมื่อไร

- TCUTSale แจก TCUT ให้ buyer (faucet หรือ ETH swap)
- buyer จ่ายให้ market flow ตอนซื้อเครดิต ผ่าน `transferFrom`
- developer stake เข้า contract
- contract จ่าย reward

#### ใช้ทำอะไร

- stake (Developer)
- ซื้อ carbon credits (Buyer)
- reward
- treasury fee

#### หมดอายุหรือไม่

ไม่หมดอายุ

#### ถูก burn หรือไม่

ปกติไม่ถูก burn ใน flow หลักของระบบนี้

---

### 4.2 Carbon Credit Token

#### ถูกสร้างเมื่อไร

ถูก mint หลัง project ผ่าน approve และ stake ครบ

#### ใครถือครอง

ตอน mint ใหม่ ๆ contract market ถือ inventory ก่อน  
หลัง buyer ซื้อ จึงย้ายไปอยู่ใน wallet ของ buyer

#### โอนเมื่อไร

ตอนซื้อขายใน marketplace

#### ใช้ทำอะไร

- ถือเป็น carbon credit
- ซื้อขาย
- retire

#### หมดอายุหรือไม่

ไม่มี expiry logic โดยตรงใน contract ปัจจุบัน แต่มี vintage year เป็น metadata ของโครงการ

#### ถูก burn หรือไม่

ถูก burn ตอน retire

---

### 4.3 Retire Certificate

#### ถูกสร้างเมื่อไร

ถูก mint ตอน buyer retire credits

#### ใครถือครอง

ผู้ที่ retire credits

#### โอนเมื่อไร

mint ให้ retiree ตอน retire สำเร็จ  
เชิงเทคนิค ERC-721 สามารถโอนได้ แต่บทบาทหลักคือเป็นใบรับรอง

#### ใช้ทำอะไร

เป็นหลักฐานว่า offset แล้วจริง

#### หมดอายุหรือไม่

ไม่หมดอายุ

#### ถูก burn หรือไม่

โดยทั่วไปไม่ burn ใน flow ปัจจุบัน

---

### 4.4 CGOV

#### ถูกสร้างเมื่อไร

mint ตอน deploy `GovernanceToken`

#### ใครถือครอง

เริ่มต้น owner/deployer ถือ supply แรก  
จากนั้นกระจายให้ผู้ร่วม governance ได้

#### โอนเมื่อไร

โอนระหว่างผู้ใช้งานหรือแจกให้ผู้เข้าร่วม DAO

#### ใช้ทำอะไร

ใช้โหวตใน DAO

#### หมดอายุหรือไม่

ไม่หมดอายุ

#### ถูก burn หรือไม่

ปัจจุบันไม่มี flow burn หลัก

---

## 5. สรุปเป็น Flow Diagram

```text
Project Owner / Developer
↓
Submit Project
↓
Risk Assessment from Backend (NASA, OpenWeatherMap, MODIS)
↓
Verifier Approval  →  assessProject() on CarbonMarket
↓
Collateral Deposit (TCUT stake)
↓
Credit Issuance  →  mintAndListCredits() → ERC-1155 minted
↓
Marketplace Listing
↓
                    [Buyer onboarding]
                    Get Sepolia ETH (gas)
                    ↓
                    Claim TCUT via TCUTSale.claimFree()
                    or Buy TCUT via TCUTSale.buyWithETH()
                    ↓
                    Enable TCUT (approve MaxUint256, once)
↓
Buyer Purchase  →  buyCredits() → TCUT transferFrom → ERC-1155 transferred
↓
Retire Credits  →  retireCredits() → ERC-1155 burned + metadata pinned on IPFS
↓
NFT Certificate Issued  →  RetireCertificate.mint() → ERC-721 to Buyer
```

### อธิบายแต่ละขั้นตอนแบบเข้าใจง่าย

#### 1. Submit Project
ผู้พัฒนาโครงการส่งข้อมูลว่าโครงการนี้ลดคาร์บอนได้อย่างไร และขอรับเครดิตเท่าไร

#### 2. Risk Assessment from Backend
ระบบใช้ข้อมูลภายนอกและข้อมูลที่ผู้ใช้กรอกมาคำนวณว่าโครงการน่าเชื่อถือแค่ไหน

#### 3. Verifier Approval
ผู้ตรวจประเมินดูข้อมูลทั้งหมดแล้วตัดสินใจว่าจะ approve หรือไม่

#### 4. Collateral Deposit (TCUT)
Developer วางหลักประกันเป็น TCUT เพื่อค้ำความถูกต้องของข้อมูล

#### 5. Credit Issuance (ERC-1155)
เมื่อผ่านเงื่อนไขครบ ระบบจึงออก carbon credits เป็น token

#### 6. Marketplace Listing
Developer ตั้งราคาและนำเครดิตเข้าสู่ marketplace

#### 7. Buyer Purchase using TCUT
Buyer รับ TCUT ผ่าน TCUTSale (faucet หรือซื้อด้วย ETH) จากนั้น Enable TCUT ครั้งเดียว (approve MaxUint256) แล้วกด Buy Credits โดยไม่ต้อง approve ซ้ำทุกครั้ง ระบบใช้ `transferFrom` หัก TCUT และโอน Carbon Credit ERC-1155 เข้า wallet ทันที

#### 8. Carbon Offset
เมื่อ buyer ต้องการใช้เครดิตเพื่อลดคาร์บอนจริง เขาจะเข้าสู่ขั้น offset

#### 9. Retire Credit (Burn)
เครดิตถูก burn ออกจากระบบ ทำให้ไม่สามารถใช้ซ้ำได้

#### 10. NFT Certificate Issued
ระบบออกใบรับรองเป็น NFT เพื่อยืนยันว่า offset สำเร็จแล้ว

---

## บทสรุปสุดท้าย

ในเชิงธุรกิจ ระบบนี้คือแพลตฟอร์มที่ทำให้ “คาร์บอนเครดิต” กลายเป็นสินทรัพย์ดิจิทัลที่ตรวจสอบได้

ในเชิงเทคนิค ระบบนี้แยกส่วนสำคัญออกเป็นหลาย contract เพื่อให้

- เงินในระบบ มี token ของตัวเอง
- คาร์บอนเครดิต มี token ของตัวเอง
- ใบรับรอง มี NFT ของตัวเอง
- governance มี token และ DAO ของตัวเอง

ผลคือทุกฝ่ายเห็นภาพเดียวกันว่า

- เครดิตมาจากไหน
- ผ่านการตรวจสอบหรือยัง
- ถูกซื้อโดยใคร
- ถูกใช้ไปแล้วหรือยัง
- และมีหลักฐานถาวรหรือไม่

นี่คือเหตุผลที่ระบบนี้เหมาะจะใช้เป็นต้นแบบสำหรับอธิบายทั้ง Business Flow, Token Flow และ Smart Contract Architecture ของตลาดคาร์บอนเครดิตบน Blockchain
