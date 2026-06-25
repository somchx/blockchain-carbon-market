import type { ProjectInput } from "../src/types.js";

export const DEMO_CREATOR_ADDRESS = "0xF07cc7DfEa269C8Ea36ed63538503A5b7f4484D8";

export type DemoSeedProject = {
  id: string;
  input: ProjectInput;
  marketplaceReady?: boolean;
  slashed?: boolean;
};

export const DEMO_SEED_PROJECTS: DemoSeedProject[] = [
  {
    id: "SEED-1",
    input: {
      sellerName: "สมชาย รักษ์โลก",
      projectName: "โครงการฟื้นฟูป่าชุมชน เชียงใหม่",
      province: "ChiangMai",
      landAreaRai: 240,
      projectType: "forest",
      requestedCredits: 520,
      selfReportedReduction: 470,
      vintageYear: 2025,
    },
  },
  {
    id: "SEED-2",
    input: {
      sellerName: "สมชาย รักษ์โลก",
      projectName: "โครงการโซลาร์ชุมชน ขอนแก่น",
      province: "KhonKaen",
      landAreaRai: 130,
      projectType: "solar",
      requestedCredits: 310,
      selfReportedReduction: 295,
      vintageYear: 2025,
    },
  },
  {
    id: "SEED-MARKET-1",
    marketplaceReady: true,
    input: {
      sellerName: "สมชาย รักษ์โลก",
      projectName: "โครงการคาร์บอนเครดิตพร้อมขาย ลำพูน",
      province: "Lamphun",
      landAreaRai: 180,
      projectType: "forest",
      requestedCredits: 340,
      selfReportedReduction: 315,
      vintageYear: 2025,
    },
  },
  {
    id: "SEED-SLASHED-1",
    slashed: true,
    input: {
      sellerName: "สมชาย รักษ์โลก",
      projectName: "โครงการที่ถูก Slash แม่ฮ่องสอน",
      province: "MaeHongSon",
      landAreaRai: 120,
      projectType: "forest",
      requestedCredits: 280,
      selfReportedReduction: 260,
      vintageYear: 2024,
    },
  },
];

export const DEMO_MARKETPLACE_PROJECT =
  DEMO_SEED_PROJECTS.find((project) => project.marketplaceReady) ?? DEMO_SEED_PROJECTS[DEMO_SEED_PROJECTS.length - 1];

export const DEMO_SLASHED_PROJECT =
  DEMO_SEED_PROJECTS.find((project) => project.slashed);
