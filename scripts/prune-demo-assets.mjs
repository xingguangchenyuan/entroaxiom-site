// 构建后处理：正式构建（官方内容源）不带演示文件。
//
// public/demo-assets/ 里是演示模式用的示例图片 / PDF / 压缩包等。Vite 会把 public/ 原样复制进 dist/，
// 这里在构建后检查产物：如果没有任何文件引用 "/demo-assets/"（即不是 demo 构建），就把 dist/demo-assets 删掉，
// 线上不会白白多出这些文件。demo 构建（npm run build:demo）里有引用，会原样保留。
//
// 用法：node scripts/prune-demo-assets.mjs [dist 目录]，默认 ./dist
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const dist = resolve(process.argv[2] ?? 'dist');
const demoDir = join(dist, 'demo-assets');

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (p === demoDir) continue;
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

if (!existsSync(dist)) {
  console.error(`找不到构建目录：${dist}（先运行 vite build）`);
  process.exit(1);
}
if (!existsSync(demoDir)) {
  console.log('dist 里没有 demo-assets，无需处理');
  process.exit(0);
}

const TEXT = /\.(js|mjs|css|html|json|map)$/;
let used = false;
for (const file of walk(dist)) {
  if (TEXT.test(file) && readFileSync(file, 'utf8').includes('/demo-assets/')) {
    used = true;
    break;
  }
}

if (used) {
  console.log('产物里引用了 /demo-assets/（demo 构建），保留');
} else {
  rmSync(demoDir, { recursive: true, force: true });
  console.log('正式构建：已从 dist 移除 demo-assets');
}
