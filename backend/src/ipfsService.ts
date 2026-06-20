import FormData from "form-data";
import fetch from "node-fetch";

const PINATA_JWT = process.env.PINATA_JWT ?? "";
const PINATA_GATEWAY = process.env.PINATA_GATEWAY ?? "https://gateway.pinata.cloud/ipfs";

if (!PINATA_JWT) {
  console.warn("[ipfs] PINATA_JWT not set — evidence upload will fail");
}

export type UploadResult = {
  cid: string;
  url: string;
  fileName: string;
  fileSizeBytes: number;
};

export async function uploadFileToIPFS(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", buffer, { filename: fileName, contentType: mimeType });
  form.append(
    "pinataMetadata",
    JSON.stringify({ name: fileName, keyvalues: { source: "thailand-carbon-market" } }),
  );
  form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${PINATA_JWT}`, ...form.getHeaders() },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pinata upload failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { IpfsHash: string };
  const cid = data.IpfsHash;

  return {
    cid,
    url: `${PINATA_GATEWAY}/${cid}`,
    fileName,
    fileSizeBytes: buffer.length,
  };
}
