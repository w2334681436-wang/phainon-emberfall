import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";

const expected = [
  ["public/assets/backgrounds/hell-battlefield.png", 1000, 560],
  ["public/assets/characters/phainon-normal-v3.png", 1000, 1200],
  ["public/assets/characters/phainon-god-v3.png", 1000, 1600],
  ["public/assets/enemies/enemy-sprites-v2.png", 1536, 576],
  ["public/assets/effects/combat-vfx-v3.png", 1000, 2000],
];

function pngSize(buffer) {
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") {
    throw new Error("不是有效的 PNG 文件");
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

let failed = false;
for (const [path, width, height] of expected) {
  try {
    await access(path, constants.R_OK);
    const buffer = await readFile(path);
    const size = pngSize(buffer);
    if (size.width !== width || size.height !== height) {
      failed = true;
      console.error(
        `✗ ${path}: 当前 ${size.width}×${size.height}，需要 ${width}×${height}`,
      );
    } else {
      console.log(`✓ ${path}: ${width}×${height}`);
    }
  } catch (error) {
    failed = true;
    console.error(`✗ ${path}: ${error.message}`);
  }
}

if (failed) {
  console.error("\n素材检查未通过，请按 public/assets/README.md 上传正确文件。\n");
  process.exit(1);
}

console.log("\n全部素材文件、文件名与尺寸检查通过。\n");
