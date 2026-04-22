import sharp from "sharp";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

async function render(inputSvg, outputPng, size) {
  const svg = readFileSync(inputSvg);
  mkdirSync(dirname(outputPng), { recursive: true });
  await sharp(svg, { density: 384 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outputPng);
  console.log(`✔ ${outputPng} (${size}x${size})`);
}

const iconSrc = resolve(root, "assets/icon-source.svg");
const traySrc = resolve(root, "assets/tray-source.svg");

// App icon master at 1024 — tauri icon CLI will use this as source
await render(iconSrc, resolve(root, "assets/icon-1024.png"), 1024);

// Tray PNG — generate at 64x64 (retina) and 32x32 variants
await render(traySrc, resolve(root, "src-tauri/icons/tray.png"), 64);

console.log("\n✅ Rasterization complete");
