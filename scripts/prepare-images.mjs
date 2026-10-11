/**
 * 一次性图片预处理脚本（设计文档 §4.1）
 *
 * 从两台本机读入欢迎页与网站壁纸源图，产出 public/media/ 下的
 * AVIF/WebP/JPEG 三格式、桌面/移动两档产物。
 *
 *   node scripts/prepare-images.mjs \
 *     --welcome "C:/Users/xinguangchenyuan/Pictures/1000055228_x16_drawing.png" \
 *     --site    "D:/桌面壁纸/1774693.jpeg"
 *
 * - 只读源文件，绝不写回、覆盖或移动用户原图；
 * - 桌面最长边 2560px、移动最长边 1280px，只缩不放；
 * - 质量 AVIF q50 / WebP q78 / JPEG q82（渐进）；单张桌面产物超 1MB 时
 *   逐级降 5 点，下限 AVIF q40 / WebP q70 / JPEG q74；
 * - 缩小用 Lanczos（线稿类源图缩小需留意振铃，本脚本在源文件名含 x16
 *   时提示人工检查 JPEG）；
 * - 打印每个产物的实际像素尺寸与字节数，供写入交付说明与 wallpapers.ts。
 */

import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'media');
mkdirSync(outDir, { recursive: true });

const DEFAULTS = {
  welcome: 'C:/Users/xinguangchenyuan/Pictures/1000055228_x16_drawing.png',
  site: 'D:/桌面壁纸/1774693.jpeg',
};

function parseArgs(argv) {
  const args = { welcome: DEFAULTS.welcome, site: DEFAULTS.site };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--welcome') args.welcome = argv[i + 1] ?? DEFAULTS.welcome;
    if (argv[i] === '--site') args.site = argv[i + 1] ?? DEFAULTS.site;
  }
  return args;
}

const MAX_QUALITY = { avif: 50, webp: 78, jpeg: 82 };
const MIN_QUALITY = { avif: 40, webp: 70, jpeg: 74 };
const LIMIT_BYTES = 1024 * 1024; // 1MB

async function processSource(label, sourcePath, prefix) {
  if (!existsSync(sourcePath)) {
    throw new Error(`源文件不存在（${label}）：${sourcePath}`);
  }
  const src = sourcePath;
  const meta = await sharp(src).metadata();
  if (!meta.width || !meta.height) {
    throw new Error(`无法读取尺寸（${label}）：${sourcePath}`);
  }

  const outputs = [];
  for (const [tier, cap] of [
    ['desktop', 2560],
    ['mobile', 1280],
  ]) {
    for (const kind of ['avif', 'webp', 'jpeg']) {
      let q = MAX_QUALITY[kind];
      let bytes = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const buf = await sharp(src)
          .resize({ width: cap, height: cap, fit: 'inside', kernel: 'lanczos3' })
          .toFormat(kind, { quality: q, ...(kind === 'jpeg' ? { progressive: true } : {}) })
          .toBuffer();
        bytes = buf.length;
        if (tier === 'mobile' || bytes <= LIMIT_BYTES || q <= MIN_QUALITY[kind]) {
          const outFile = `${prefix}-${tier}.${kind === 'jpeg' ? 'jpg' : kind}`;
          await sharp(buf).toFile(join(outDir, outFile));
          outputs.push({
            file: outFile,
            width: cap < meta.width ? cap : meta.width,
            height: Math.round((cap < meta.width ? cap : meta.width) * (meta.height / meta.width)),
            bytes,
            quality: q,
          });
          break;
        }
        q -= 5;
      }
    }
  }
  return outputs;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const results = [];

  const welcome = await processSource('欢迎页背景', args.welcome, 'welcome');
  const site = await processSource('网站壁纸', args.site, 'site');
  results.push(...welcome, ...site);

  console.log('=== public/media 产物 ===');
  const table = results
    .map((r) => `${r.file}\t${r.width}x${r.height}\t${r.bytes} B\tq${r.quality}`)
    .join('\n');
  console.log(table);

  const summary = {};
  for (const r of results) summary[r.file] = { w: r.width, h: r.height, bytes: r.bytes };
  console.log('\n=== config 用 JSON ===');
  console.log(JSON.stringify(summary, null, 2));

  const big = results.filter((r) => r.bytes > LIMIT_BYTES);
  if (big.length) {
    console.warn(`\n注意：仍有 ${big.length} 个产物超过 1MB（${big.map((b) => b.file).join(', ')}），超出部分请写入交付说明。`);
  }
  if (args.welcome.includes('x16')) {
    console.warn('提示：欢迎图源文件名含 x16（疑似放大线稿），请人工检查 JPEG 是否有振铃；若明显，将该图 JPEG 质量提到 90。');
  }
}

main().catch((err) => {
  console.error(`[prepare-images] ${err.message}`);
  process.exit(1);
});