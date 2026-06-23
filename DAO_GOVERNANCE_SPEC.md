# DAO Governance Spec

เอกสารนี้สรุปว่า DAO ของระบบควรคุม parameter อะไรบ้างก่อน เพื่อให้หน้า `/dao` มีบทบาทเป็น governance layer ของตลาดคาร์บอนจริง ไม่ใช่แค่หน้าโหวตเชิงสาธิต

## เป้าหมาย

- ให้ DAO คุมกติกาความน่าเชื่อถือของระบบได้จริง
- ให้ governance ไปกระทบ challenge, slashing, verifier policy และ market rule โดยตรง
- ให้สอดคล้องกับ narrative ใน `paper.md` เรื่อง transparency, auditability, stakeholder participation, decentralized governance

## หลักการเลือก parameter

- ควรเป็นค่าที่เปลี่ยนพฤติกรรมระบบได้จริง
- ควรมีผลต่อ trusted measurement / trusted exchange
- ควรอธิบายกับผู้ใช้และใน paper ได้ง่าย
- ควรเริ่มจากค่าที่อยู่ใน `CarbonMarket` หรือใกล้เคียงที่สุดก่อน

## Phase 1: ควรย้ายให้ DAO คุมก่อน

กลุ่มนี้เป็น priority สูงสุด เพราะคุม incentive และ challenge flow โดยตรง

### 1. `reviewerBond`

- ความหมาย: เงิน TCUT ที่ verifier/challenger ต้องวางเพื่อเข้าระบบ
- เหตุผล: เป็น economic security หลักของ challenge flow
- ระดับผลกระทบ: สูง
- DAO UI label: `Change Reviewer Bond`
- Contract setter ที่ควรมี:
  - `setReviewerBond(uint256 amount)`

### 2. `challengeDuration`

- ความหมาย: ระยะเวลาที่ challenge เปิดให้โหวต
- เหตุผล: เป็นกติกาหลักของ optimistic/challenge model
- ระดับผลกระทบ: สูง
- DAO UI label: `Change Challenge Duration`
- Contract setter ที่ควรมี:
  - `setChallengeDuration(uint256 durationSeconds)`

### 3. `voteThreshold`

- ความหมาย: จำนวนเสียงขั้นต่ำที่ทำให้ challenge ถูกตัดสิน
- เหตุผล: กระทบความเข้มของระบบตรวจสอบ fraud โดยตรง
- ระดับผลกระทบ: สูง
- DAO UI label: `Change Challenge Vote Threshold`
- Contract setter ที่ควรมี:
  - `setVoteThreshold(uint256 votes)`

### 4. `challengerPenaltyBps`

- ความหมาย: อัตราหัก bond ของ challenger เมื่อ challenge ไม่สำเร็จ
- เหตุผล: ป้องกันการ challenge มั่ว
- ระดับผลกระทบ: สูง
- DAO UI label: `Change Failed Challenge Penalty`
- Contract setter ที่ควรมี:
  - `setChallengerPenaltyBps(uint256 bps)`

### 5. `challengerRewardReputation`

- ความหมาย: คะแนน reputation ที่ challenger ได้เมื่อ challenge สำเร็จ
- เหตุผล: เพิ่มแรงจูงใจให้ verifier/community เฝ้าระวังระบบ
- ระดับผลกระทบ: กลาง-สูง
- DAO UI label: `Change Successful Challenge Reputation Reward`
- Contract setter ที่ควรมี:
  - `setChallengerRewardReputation(uint256 points)`

### 6. `challengerPenaltyReputation`

- ความหมาย: คะแนน reputation ที่ challenger เสียเมื่อ challenge ไม่สำเร็จ
- เหตุผล: คุมคุณภาพของ challenge
- ระดับผลกระทบ: กลาง-สูง
- DAO UI label: `Change Failed Challenge Reputation Penalty`
- Contract setter ที่ควรมี:
  - `setChallengerPenaltyReputation(uint256 points)`

### 7. `platformFeeBps`

- ความหมาย: ค่าธรรมเนียม marketplace
- เหตุผล: เป็น market rule สำคัญที่ stakeholder เข้าใจง่ายและเชื่อมกับเศรษฐศาสตร์ของระบบ
- ระดับผลกระทบ: สูง
- DAO UI label: `Change Marketplace Fee`
- Contract setter ที่ควรมี:
  - `setPlatformFeeBps(uint256 bps)`

## Phase 2: Verifier Policy แบบ Hybrid

กลุ่มนี้ทำให้ DAO เริ่มคุม verifier policy จริง โดยยังไม่ต้องย้าย membership ทั้งหมดขึ้น on-chain

### 8. `minimumVerifierStake`

- ความหมาย: stake ขั้นต่ำของ verifier ก่อนถือว่าสิทธิ์พร้อมใช้งาน
- วิธีใช้จริง: frontend/backend verifier อ่านจาก contract แล้วตัดสินว่าปุ่ม approve ใช้ได้ไหม
- ระดับผลกระทบ: สูง
- DAO UI label: `Change Minimum Verifier Stake`
- Contract setter ที่ควรมี:
  - `setMinimumVerifierStake(uint256 amount)`

### 9. `minimumVerifierReputationToApprove`

- ความหมาย: reputation ขั้นต่ำก่อน verifier จะ approve โครงการได้
- วิธีใช้จริง: verifier page ตรวจสิทธิ์จากค่าที่ DAO คุม
- ระดับผลกระทบ: สูง
- DAO UI label: `Change Min Reputation for Approval`
- Contract setter ที่ควรมี:
  - `setMinimumVerifierReputationToApprove(uint256 points)`

### 10. `verifierApprovalMode`

- ค่าที่แนะนำ:
  - `open_access`
  - `dao_gated`
  - `reputation_gated`
- ความหมาย: ระบบใช้ policy แบบไหนในการอนุญาตให้ verifier approve ได้
- ระดับผลกระทบ: สูงมาก
- DAO UI label: `Change Verifier Approval Policy`
- Contract setter ที่ควรมี:
  - `setVerifierApprovalMode(uint8 mode)`

### 11. `autoApproveVerifierRequest`

- ความหมาย: ใน demo mode จะ auto-approve verifier request หรือไม่
- หมายเหตุ: ค่านี้อาจยังอยู่ฝั่ง backend แต่ให้ DAO เป็นผู้กำหนด policy
- ระดับผลกระทบ: กลาง
- DAO UI label: `Toggle Demo Auto-Approve`
- Backend policy ที่ควรอ่านจาก governance config:
  - `autoApproveVerifierRequest: boolean`

## Phase 3: On-chain Membership Governance

กลุ่มนี้ค่อยทำเมื่อระบบพร้อมและต้องการย้าย verifier membership ขึ้น chain มากขึ้น

### 12. `grantVerifier(address)`

- ความหมาย: DAO ให้สิทธิ verifier ราย address
- ระดับผลกระทบ: สูง
- Complexity: สูง

### 13. `revokeVerifier(address)`

- ความหมาย: DAO ถอนสิทธิ verifier
- ระดับผลกระทบ: สูง
- Complexity: สูง

### 14. `suspendVerifier(address, duration)`

- ความหมาย: DAO พักสิทธิ verifier ชั่วคราว
- ระดับผลกระทบ: กลาง-สูง
- Complexity: สูง

### 15. `verifierCapacityLimit`

- ความหมาย: verifier 1 รายตรวจได้กี่งานพร้อมกัน
- ระดับผลกระทบ: กลาง
- Complexity: กลาง-สูง

## สิ่งที่ยังไม่ควรย้ายก่อน

ยังไม่แนะนำให้เริ่มจากกลุ่มนี้ในรอบแรก

- risk score formula ทั้งก้อน
- external data source switching ทั้งระบบ
- oracle source / API source selection
- project-level discretionary slash logic แบบซับซ้อน
- role management ทุก role พร้อมกัน
- backend operational config ที่ไม่ผูกกับ narrative ของ paper ชัดเจน

## Contract Spec ที่แนะนำ

ทุก setter ใน phase 1 และ phase 2 ควรเป็น `onlyOwner`

โดย owner ของ `CarbonMarket` ควรเป็น `GovernorDAO`

รายการ setter ที่ควรมี:

```solidity
setReviewerBond(uint256 amount)
setChallengeDuration(uint256 durationSeconds)
setVoteThreshold(uint256 votes)
setChallengerPenaltyBps(uint256 bps)
setChallengerRewardReputation(uint256 points)
setChallengerPenaltyReputation(uint256 points)
setPlatformFeeBps(uint256 bps)
setMinimumVerifierStake(uint256 amount)
setMinimumVerifierReputationToApprove(uint256 points)
setVerifierApprovalMode(uint8 mode)
```

## Event Spec ที่ควรเพิ่ม

ควรมี event ทุกครั้งที่เปลี่ยนค่าเพื่อให้ audit ผ่าน explorer / governance history ได้

ตัวอย่าง:

```solidity
event ReviewerBondUpdated(uint256 newAmount);
event ChallengeDurationUpdated(uint256 newDuration);
event VoteThresholdUpdated(uint256 newThreshold);
event ChallengerPenaltyBpsUpdated(uint256 newBps);
event ChallengerRewardReputationUpdated(uint256 newPoints);
event ChallengerPenaltyReputationUpdated(uint256 newPoints);
event PlatformFeeBpsUpdated(uint256 newBps);
event MinimumVerifierStakeUpdated(uint256 newAmount);
event MinimumVerifierReputationUpdated(uint256 newPoints);
event VerifierApprovalModeUpdated(uint8 newMode);
```

## DAO UI Spec

หน้า `/dao` ควรมี 3 บล็อกหลัก

### 1. Current Rules

แสดงค่าปัจจุบันทั้งหมด เช่น

- reviewer bond
- challenge duration
- vote threshold
- challenger penalty
- platform fee
- min verifier stake
- min verifier reputation
- verifier approval mode

ควรมี badge กำกับว่า:

- `On-chain`
- `Hybrid policy`

### 2. Create Proposal

ไม่ควรให้ผู้ใช้กรอก calldata เองใน flow ปกติ

ควรมี proposal template สำเร็จรูป เช่น

- Change Reviewer Bond
- Change Challenge Duration
- Change Vote Threshold
- Change Marketplace Fee
- Change Verifier Policy

ควรมี impact preview เช่น

- จาก `100 TCUT` → `150 TCUT`
- จาก `3 days` → `7 days`
- จาก `2%` → `1%`

### 3. Governance History

ควรแสดง:

- ใครเสนอ
- เปลี่ยนค่าอะไร
- ค่าเดิม → ค่าใหม่
- proposal ผ่าน/ตก/execute เมื่อไร

## Backend / Frontend Policy Spec

สำหรับค่าที่เป็น hybrid policy:

- backend ต้องมีจุดอ่าน policy จาก contract หรือ governance config กลาง
- frontend verifier ต้องอ่าน policy ล่าสุดทุกครั้งตอนโหลดหน้า
- ห้าม hardcode rule เดิมค้างไว้ ถ้า DAO คุมแล้ว

## MVP ที่แนะนำให้ทำก่อน

ถ้าจะเริ่มรอบแรกแบบคุ้มที่สุด ให้เริ่มจากชุดนี้:

- `reviewerBond`
- `challengeDuration`
- `voteThreshold`
- `challengerPenaltyBps`
- `platformFeeBps`
- `minimumVerifierReputationToApprove`

ชุดนี้พอให้พูดได้ว่า:

- DAO คุม market incentives
- DAO คุม challenge/slashing policy
- DAO คุม verifier approval policy บางส่วนแล้ว

## ลำดับ implementation ที่แนะนำ

1. เพิ่ม setter + event ใน `CarbonMarket.sol`
2. เพิ่ม proposal templates ในหน้า `/dao`
3. แสดง current parameter values ในหน้า `/dao`
4. ให้หน้า verifier อ่าน governance policy ล่าสุด
5. เพิ่ม governance history / executed changes log

## ผลลัพธ์ที่คาดหวัง

เมื่อทำครบอย่างน้อย phase 1 และบางส่วนของ phase 2:

- หน้า `DAO` จะไม่ใช่แค่หน้า vote demo
- governance จะเปลี่ยนกติกาตลาดคาร์บอนได้จริง
- narrative ใน `paper.md` เรื่อง decentralized governance จะมีน้ำหนักมากขึ้น
- ระบบจะเชื่อม trusted measurement, trusted exchange และ trusted governance เข้าด้วยกันชัดเจนขึ้น
