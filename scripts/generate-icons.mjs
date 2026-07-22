import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const publicDir = join(root, "public");
const tauriIconsDir = join(root, "src-tauri", "icons");

mkdirSync(publicDir, { recursive: true });
mkdirSync(tauriIconsDir, { recursive: true });

const svg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="96" y1="64" x2="416" y2="448" gradientUnits="userSpaceOnUse">
      <stop stop-color="#6366f1"/>
      <stop offset="1" stop-color="#312e81"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="24" stdDeviation="24" flood-color="#111827" flood-opacity=".28"/>
    </filter>
  </defs>
  <rect width="512" height="512" rx="112" fill="#0f172a"/>
  <rect x="54" y="54" width="404" height="404" rx="92" fill="url(#bg)" filter="url(#shadow)"/>
  <path d="M288 68 126 286h112l-32 158 182-244H266l22-132Z" fill="#fff" stroke="#e0e7ff" stroke-width="14" stroke-linejoin="round"/>
</svg>`;

async function pngBuffer(size) {
  return sharp(Buffer.from(svg(size))).resize(size, size).png().toBuffer();
}

async function writePng(path, size) {
  writeFileSync(path, await pngBuffer(size));
}

function writeIco(path, images) {
  let offset = 6 + images.length * 16;
  const header = Buffer.alloc(offset);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  images.forEach(({ size, data }, index) => {
    const entry = 6 + index * 16;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt8(0, entry + 2);
    header.writeUInt8(0, entry + 3);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });

  writeFileSync(path, Buffer.concat([header, ...images.map(({ data }) => data)]));
}

function writeIcns(path, images) {
  const chunks = images.map(({ type, data }) => {
    const header = Buffer.alloc(8);
    header.write(type, 0, 4, "ascii");
    header.writeUInt32BE(data.length + 8, 4);
    return Buffer.concat([header, data]);
  });
  const header = Buffer.alloc(8);
  header.write("icns", 0, 4, "ascii");
  header.writeUInt32BE(8 + chunks.reduce((sum, chunk) => sum + chunk.length, 0), 4);
  writeFileSync(path, Buffer.concat([header, ...chunks]));
}

await writePng(join(publicDir, "icon-192.png"), 192);
await writePng(join(publicDir, "icon-512.png"), 512);
await writePng(join(publicDir, "icon-1024.png"), 1024);
await writePng(join(publicDir, "apple-touch-icon.png"), 180);
await writePng(join(publicDir, "apple-touch-icon-512.png"), 512);

await writePng(join(tauriIconsDir, "32x32.png"), 32);
await writePng(join(tauriIconsDir, "128x128.png"), 128);
await writePng(join(tauriIconsDir, "128x128@2x.png"), 256);
await writePng(join(tauriIconsDir, "icon.png"), 512);

const icoImages = await Promise.all(
  [16, 32, 48, 256].map(async (size) => ({ size, data: await pngBuffer(size) }))
);
writeIco(join(publicDir, "favicon.ico"), icoImages);
writeIco(join(tauriIconsDir, "icon.ico"), icoImages);

const icnsImages = await Promise.all(
  [
    ["icp4", 16],
    ["icp5", 32],
    ["icp6", 64],
    ["ic07", 128],
    ["ic08", 256],
    ["ic09", 512],
    ["ic10", 1024],
  ].map(async ([type, size]) => ({ type, data: await pngBuffer(size) }))
);
writeIcns(join(tauriIconsDir, "icon.icns"), icnsImages);
