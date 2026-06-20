import { uploadRawToIPFS } from "./ipfsService.js";

export interface CertInput {
  buyerAddress: string;
  projectId: number;
  projectName: string;
  province: string;
  projectType: string;
  vintageYear: number;
  creditsRetired: number;
  issuedAt: string;
}

export interface CertResult {
  cid: string;
  url: string;
  tokenUri: string;
}

function buildSvg(input: CertInput): string {
  const typeEmoji =
    input.projectType === "forest" ? "🌳"
    : input.projectType === "mangrove" ? "🌿"
    : input.projectType === "solar" ? "☀️"
    : "⚡";
  const shortAddr = `${input.buyerAddress.slice(0, 6)}...${input.buyerAddress.slice(-4)}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#064e3b"/>
      <stop offset="100%" stop-color="#065f46"/>
    </linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#bg)" rx="20"/>
  <rect x="20" y="20" width="760" height="460" fill="none" stroke="#6ee7b7" stroke-width="2" rx="14"/>
  <rect x="30" y="30" width="740" height="440" fill="none" stroke="#a7f3d0" stroke-width="0.5" rx="10"/>

  <text x="400" y="75" font-family="serif" font-size="13" fill="#6ee7b7" text-anchor="middle" letter-spacing="4">CARBON RETIREMENT CERTIFICATE</text>
  <text x="400" y="105" font-family="serif" font-size="11" fill="#34d399" text-anchor="middle" letter-spacing="2">HIGH-INTEGRITY BLOCKCHAIN CARBON CREDIT MARKET · THAILAND</text>

  <line x1="80" y1="120" x2="720" y2="120" stroke="#6ee7b7" stroke-width="0.5"/>

  <text x="400" y="175" font-family="sans-serif" font-size="52" text-anchor="middle">${typeEmoji}</text>

  <text x="400" y="230" font-family="serif" font-size="26" fill="#ffffff" text-anchor="middle" font-weight="bold">${escapeXml(input.projectName)}</text>
  <text x="400" y="258" font-family="sans-serif" font-size="14" fill="#a7f3d0" text-anchor="middle">${escapeXml(input.province)} · ${input.vintageYear} vintage</text>

  <text x="400" y="310" font-family="serif" font-size="48" fill="#34d399" text-anchor="middle" font-weight="bold">${input.creditsRetired.toLocaleString()}</text>
  <text x="400" y="335" font-family="sans-serif" font-size="13" fill="#6ee7b7" text-anchor="middle">CARBON CREDITS RETIRED (tCO₂ equivalent)</text>

  <line x1="80" y1="360" x2="720" y2="360" stroke="#6ee7b7" stroke-width="0.5"/>

  <text x="400" y="388" font-family="monospace" font-size="11" fill="#a7f3d0" text-anchor="middle">Retired by: ${shortAddr}</text>
  <text x="400" y="408" font-family="monospace" font-size="11" fill="#a7f3d0" text-anchor="middle">On-chain Project ID: ${input.projectId}</text>
  <text x="400" y="428" font-family="sans-serif" font-size="11" fill="#6ee7b7" text-anchor="middle">Issued: ${input.issuedAt}</text>

  <text x="400" y="458" font-family="sans-serif" font-size="9" fill="#059669" text-anchor="middle">Verified on Blockchain · Permanently Retired · Cannot be Reused</text>
</svg>`;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildMetadata(input: CertInput, imageUrl: string): object {
  return {
    name: `Carbon Retirement Certificate — ${input.projectName}`,
    description: `This NFT certifies that ${input.creditsRetired} carbon credits from "${input.projectName}" (${input.province}, ${input.vintageYear}) have been permanently retired by ${input.buyerAddress}. These credits represent ${input.creditsRetired} tonnes of CO₂ equivalent offset.`,
    image: imageUrl,
    attributes: [
      { trait_type: "Project Name", value: input.projectName },
      { trait_type: "Province", value: input.province },
      { trait_type: "Project Type", value: input.projectType },
      { trait_type: "Vintage Year", value: input.vintageYear },
      { trait_type: "Credits Retired", value: input.creditsRetired },
      { trait_type: "On-chain Project ID", value: input.projectId },
      { trait_type: "Retired By", value: input.buyerAddress },
      { trait_type: "Issued At", value: input.issuedAt }
    ]
  };
}

export async function generateCertificate(input: CertInput): Promise<CertResult> {
  const svgContent = buildSvg(input);
  const svgBuffer = Buffer.from(svgContent, "utf-8");
  const fileName = `cert-${input.projectId}-${Date.now()}`;

  // Upload SVG image to IPFS
  const svgResult = await uploadRawToIPFS(svgBuffer, `${fileName}.svg`, "image/svg+xml");

  // Build NFT metadata JSON with image CID
  const metadata = buildMetadata(input, svgResult.url);
  const metaBuffer = Buffer.from(JSON.stringify(metadata, null, 2), "utf-8");
  const metaResult = await uploadRawToIPFS(metaBuffer, `${fileName}-metadata.json`, "application/json");

  return {
    cid: metaResult.cid,
    url: metaResult.url,
    tokenUri: `ipfs://${metaResult.cid}`
  };
}
