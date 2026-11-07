const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// 直接测试实际 TS 模块（用 typescript 转译后在 vm 中运行），不复制业务实现。
function runtime(fetch, win = { setTimeout, clearTimeout }) {
  const modules = new Map();
  function load(relative, parent = path.resolve('src')) {
    const filename = path.resolve(parent, relative.endsWith('.ts') ? relative : `${relative}.ts`);
    if (modules.has(filename)) return modules.get(filename).exports;
    const module = { exports: {} };
    modules.set(filename, module);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    vm.runInNewContext(code, {
      module, exports: module.exports, require: (name) => load(name, path.dirname(filename)),
      fetch, AbortController, URL, URLSearchParams, JSON, window: win,
    }, { filename });
    return module.exports;
  }
  return load;
}

const response = (data, status = 200, error = null) => ({
  ok: status < 400, status, headers: { get: () => null },
  json: async () => ({ success: status < 400, data: status < 400 ? data : null, error }),
});

/* ---------------- content/api.ts ---------------- */

test('essays: wire → Essay maps nulls to undefined and keeps mood/place', async () => {
  const api = runtime(async () => response([
    { id: 'a', title: 'A', summary: 's', category: null, tags: null, date: '2026-01-01', updated: null, mood: '雨', place: null },
  ]))('./content/api');
  const [e] = await api.listEssays();
  assert.equal(e.id, 'a');
  assert.equal(e.category, undefined);
  assert.equal(e.tags, undefined);
  assert.equal(e.mood, '雨');
  assert.equal('place' in e, false);
  assert.equal(e.visibility, 'public');
});

test('GET 404 resolves undefined; other errors throw ApiRequestError', async () => {
  const notFound = runtime(async () => response(null, 404))('./content/api');
  assert.equal(await notFound.getNote('missing'), undefined);

  const broken = runtime(async () => response(null, 500, { code: 'BOOM', message: '炸了' }))('./content/api');
  await assert.rejects(broken.listNotes(), (err) => err.name === 'ApiRequestError' && err.code === 'BOOM' && err.status === 500);

  const offline = runtime(async () => { throw new TypeError('fetch failed'); })('./content/api');
  await assert.rejects(offline.listFiles(), (err) => err.code === 'NETWORK_ERROR');
});

test('shelf: unknown kind/status fall back; rating clamped to 0..5', async () => {
  const api = runtime(async () => response([
    { id: 'x', kind: 'game', title: 'X', creator: null, year: null, rating: 9, status: '??', date: null, tags: [], quote: null, review: null, cover: null, link: null },
  ]))('./content/api');
  const [s] = await api.listShelf();
  assert.equal(s.kind, 'book');
  assert.equal(s.status, 'done');
  assert.equal(s.rating, 5);
  assert.equal(s.creator, '');
  assert.equal(s.tags, undefined);
});

test('guestbook: list passes offset/limit, unknown sigil → moon', async () => {
  let seen;
  const api = runtime(async (url) => {
    seen = new URL(url, 'http://t');
    return response({ items: [{ id: 'g', name: 'n', site: null, body: 'hi', sigil: 'pluto', createdAt: '2026-01-01T00:00:00Z', reply: null }], total: 31 });
  })('./content/api');
  const page = await api.listGuestbook(12, 12);
  assert.equal(seen.pathname, '/api/public/guestbook');
  assert.equal(seen.searchParams.get('offset'), '12');
  assert.equal(seen.searchParams.get('limit'), '12');
  assert.equal(page.total, 31);
  assert.equal(page.items[0].sigil, 'moon');
});

test('guestbook: POST sends JSON + X-Requested-With; 429 → RATE_LIMITED; 422 keeps details', async () => {
  let init;
  const ok = runtime(async (_url, i) => { init = i; return response({ id: 'g9', status: 'pending', createdAt: 'now' }, 201); })('./content/api');
  const receipt = await ok.postGuestbook({ name: 'a', body: 'hello', sigil: 'sun' });
  assert.equal(receipt.status, 'pending');
  assert.equal(init.method, 'POST');
  assert.equal(init.headers['X-Requested-With'], 'entroaxiom');
  assert.equal(init.body, JSON.stringify({ name: 'a', body: 'hello', sigil: 'sun' }));

  const limited = runtime(async () => response(null, 429))('./content/api');
  await assert.rejects(limited.postGuestbook({ name: 'a', body: 'hello', sigil: 'sun' }), (e) => e.code === 'RATE_LIMITED');

  const invalid = runtime(async () => response(null, 422, { code: 'VALIDATION_ERROR', message: 'bad', details: [{ loc: ['body', 'name'] }] }))('./content/api');
  await assert.rejects(invalid.postGuestbook({ name: 'a', body: 'hello', sigil: 'sun' }), (e) => e.status === 422 && Array.isArray(e.details));
});

/* ---------------- lib/guestbook.ts ---------------- */

test('validateGuest: trims, normalizes site, rejects bad input', () => {
  const { validateGuest, GUEST_LIMITS } = runtime()('./lib/guestbook');
  const ok = validateGuest({ name: '  过路  人 ', email: '', site: 'example.com', body: ' 你好 ', sigil: 'venus' });
  assert.equal(Object.keys(ok.errors).length, 0); // vm 跨 realm，不能用 deepEqual 比较空对象
  assert.equal(ok.draft.name, '过路 人');
  assert.equal(ok.draft.site, 'https://example.com');
  assert.equal(ok.draft.body, '你好');
  assert.equal('email' in ok.draft, false);

  const bad = validateGuest({ name: '', email: 'x@', site: 'not a url', body: '嗯', sigil: 'sun' });
  assert.equal(bad.draft, null);
  assert.deepEqual(Object.keys(bad.errors).sort(), ['body', 'email', 'name', 'site']);

  const long = validateGuest({ name: 'a', email: '', site: '', body: '星'.repeat(GUEST_LIMITS.body + 1), sigil: 'sun' });
  assert.ok(long.errors.body);
});

test('charCount counts emoji as one character', () => {
  const { charCount } = runtime()('./lib/guestbook');
  assert.equal(charCount('🌌🪐'), 2);
});

test('validationField handles FastAPI loc arrays and dotted strings', () => {
  const { validationField } = runtime()('./lib/guestbook');
  assert.equal(validationField([{ loc: ['body', 'name'] }]), 'name');
  assert.equal(validationField([{ loc: 'body.body' }]), 'body');
  assert.equal(validationField([{ loc: ['body', 'site'] }]), 'site');
  assert.equal(validationField([{ loc: ['body'] }]), null);
  assert.equal(validationField(null), null);
});

/* ---------------- structure guard ---------------- */

test('loader keeps the literal demo import for tree-shaking', () => {
  const src = fs.readFileSync(path.resolve('src/content/loader.ts'), 'utf8');
  assert.match(src, /import\.meta\.env\.VITE_CONTENT_SOURCE === 'demo'\s*\?\s*import\('\.\/localSource'\)/);
});

/* ---------------- lib/ime.ts ---------------- */

test('isImeComposing: Chrome/Firefox (isComposing) and Safari (keyCode 229)', () => {
  const { isImeComposing } = runtime()('./lib/ime');
  assert.equal(isImeComposing({ isComposing: true, keyCode: 13 }), true);
  assert.equal(isImeComposing({ isComposing: false, keyCode: 229 }), true);
  assert.equal(isImeComposing({ isComposing: false, keyCode: 13 }), false);
  assert.equal(isImeComposing({}), false);
});

/* ---------------- lib/links.ts ---------------- */

test('classifyHref: router routes, static files, externals, anchors', () => {
  const { classifyHref } = runtime()('./lib/links');
  const origin = 'https://entroaxiom.example';
  const k = (h, o) => classifyHref(h, o).kind;

  assert.equal(k('/notes/git-workflow'), 'internal');
  assert.equal(classifyHref('/essays/a?x=1#h').to, '/essays/a?x=1#h');
  assert.equal(k('/'), 'internal');
  assert.equal(k('/atlas'), 'internal');
  // 同源但不是前端路由：静态文件 / 后端资源，交给浏览器
  assert.equal(k('/uploads/public/a.pdf'), 'other');
  assert.equal(k('/demo-assets/demo-image-1.png'), 'other');
  assert.equal(k('/api/public/files'), 'other');

  assert.equal(k('https://www.markdownguide.org/'), 'external');
  assert.equal(k('http://example.com'), 'external');
  assert.equal(k('//cdn.example.com/x'), 'external');

  // 指向本站的绝对地址按站内处理；其他域名不受影响
  assert.equal(k('https://entroaxiom.example/notes/a', origin), 'internal');
  assert.equal(classifyHref('https://entroaxiom.example/notes/a?q=1#s', origin).to, '/notes/a?q=1#s');
  assert.equal(k('https://entroaxiom.example/uploads/a.zip', origin), 'other');
  assert.equal(k('https://other.example/notes/a', origin), 'external');
  assert.equal(k('https://entroaxiom.example/notes/a'), 'external'); // 没传 origin 时无从判断

  assert.equal(k('#section'), 'other');
  assert.equal(k('mailto:a@b.c'), 'other');
  assert.equal(k('tel:123'), 'other');
  assert.equal(k('relative/path'), 'other');
  assert.equal(k(''), 'other');
  assert.equal(k(undefined), 'other');
});

test('withRetryParam: appends with ? or &, keeps #hash, nonce 0 is a no-op', () => {
  const { withRetryParam } = runtime()('./lib/links');
  assert.equal(withRetryParam('/a.png', 0), '/a.png');
  assert.equal(withRetryParam('/a.png', 2), '/a.png?retry=2');
  assert.equal(withRetryParam('/a.png?v=1', 1), '/a.png?v=1&retry=1');
  assert.equal(withRetryParam('/a.png#x', 3), '/a.png?retry=3#x');
  assert.equal(withRetryParam('/a.png?v=1#x', 3), '/a.png?v=1&retry=3#x');
});

/* ---------------- lib/scrollRestore.ts ---------------- */

/** 假环境：手动推进的时钟 + 一个可以“长高”的页面 */
function fakeScrollEnv() {
  let t = 0;
  let max = 0;
  let nextId = 1;
  const pending = new Map();
  const calls = [];
  const env = {
    scrollTo: (y) => calls.push(y),
    maxScroll: () => max,
    now: () => t,
    raf: (cb) => { const id = nextId++; pending.set(id, cb); return id; },
    caf: (id) => { pending.delete(id); },
  };
  /** 过 ms 毫秒（每 16ms 一帧），期间页面最大滚动高度按 grow(t) 变化 */
  const advance = (ms, grow) => {
    const end = t + ms;
    while (t < end) {
      t += 16;
      if (grow) max = grow(t);
      const cbs = [...pending.values()];
      pending.clear();
      cbs.forEach((cb) => cb());
    }
  };
  return { env, calls, advance, setMax: (v) => { max = v; }, pendingCount: () => pending.size };
}

test('restoreScroll: waits for async content to grow tall enough, then scrolls once', () => {
  const { restoreScroll } = runtime()('./lib/scrollRestore');
  const f = fakeScrollEnv();
  f.setMax(0); // 骨架屏阶段：页面还很矮
  let done;
  restoreScroll(1200, f.env, { onDone: (r) => { done = r; } });
  assert.equal(f.calls.length, 0);
  f.advance(500, () => 300); // 还是不够高
  assert.equal(f.calls.length, 0);
  assert.equal(done, undefined);
  f.advance(200, () => 2000); // 内容出来了
  assert.deepEqual([...f.calls], [1200]);
  assert.equal(done, true);
  assert.equal(f.pendingCount(), 0);
  f.advance(500); // 之后不再有动作
  assert.equal(f.calls.length, 1);
});

test('restoreScroll: already tall enough → scrolls immediately (synchronously)', () => {
  const { restoreScroll } = runtime()('./lib/scrollRestore');
  const f = fakeScrollEnv();
  f.setMax(5000);
  let done;
  restoreScroll(800, f.env, { onDone: (r) => { done = r; } });
  assert.deepEqual([...f.calls], [800]);
  assert.equal(done, true);
});

test('restoreScroll: gives up after the timeout and goes as far as it can', () => {
  const { restoreScroll } = runtime()('./lib/scrollRestore');
  const f = fakeScrollEnv();
  f.setMax(400);
  let done;
  restoreScroll(3000, f.env, { timeoutMs: 1000, onDone: (r) => { done = r; } });
  f.advance(900);
  assert.equal(f.calls.length, 0);
  f.advance(200);
  assert.deepEqual([...f.calls], [400]);
  assert.equal(done, false);
  assert.equal(f.pendingCount(), 0);
});

test('restoreScroll: cancel stops everything and reports not-reached; later calls are no-ops', () => {
  const { restoreScroll } = runtime()('./lib/scrollRestore');
  const f = fakeScrollEnv();
  f.setMax(0);
  const results = [];
  const cancel = restoreScroll(900, f.env, { onDone: (r) => results.push(r) });
  f.advance(100);
  cancel();
  assert.deepEqual([...results], [false]);
  assert.equal(f.pendingCount(), 0);
  f.advance(3000, () => 5000); // 页面后来变高了，也不应该再滚
  assert.equal(f.calls.length, 0);
  cancel();
  assert.equal(results.length, 1);
});

/* ---------------- structure guards ---------------- */

test('useScrollRestore only restores on POP or an explicit restoreScroll state, and effect depends on pathname only', () => {
  const src = fs.readFileSync(path.resolve('src/hooks/useScrollRestore.ts'), 'utf8');
  assert.match(src, /type === 'POP'/);
  assert.match(src, /restoreScroll\s*===\s*true/);
  assert.match(src, /\},\s*\[pathname\]\);\s*\}\s*$/);
});

test('palette and list search ignore keys while the IME is composing', () => {
  for (const file of ['src/components/layout/CommandPalette.tsx', 'src/components/list/SearchBox.tsx']) {
    const src = fs.readFileSync(path.resolve(file), 'utf8');
    assert.match(src, /isImeComposing\(e\.nativeEvent\)/, file);
  }
});

/* ---------------- fonts ---------------- */

test('fonts.css: every face points to an existing file, has unicode-range, and the base face is last', () => {
  const css = fs.readFileSync(path.resolve('src/styles/fonts.css'), 'utf8');
  const faces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1]);
  assert.ok(faces.length > 10);
  for (const f of faces) {
    const file = /url\('\.\.\/assets\/fonts\/entro-serif\/([^']+)'\)/.exec(f)[1];
    assert.ok(fs.existsSync(path.resolve('src/assets/fonts/entro-serif', file)), file);
    assert.match(f, /unicode-range:\s*U\+/);
    assert.match(f, /font-family:\s*'Entro Serif'/);
  }
  // 后写的优先匹配：首包必须最后，首包里的字才不会连带下载所在区段的分片
  assert.match(faces[faces.length - 1], /entro-serif-base\.woff2/);
  assert.equal(faces.filter((f) => /entro-serif-base\.woff2/.test(f)).length, 1);
});

test('base.css no longer declares Entro Serif; main.tsx loads fonts.css; index.html preloads the base file', () => {
  assert.doesNotMatch(fs.readFileSync(path.resolve('src/styles/base.css'), 'utf8'), /@font-face\s*\{/);
  assert.match(fs.readFileSync(path.resolve('src/main.tsx'), 'utf8'), /import '\.\/styles\/fonts\.css'/);
  assert.match(fs.readFileSync(path.resolve('index.html'), 'utf8'), /rel="preload"[^>]*entro-serif-base\.woff2[^>]*crossorigin/);
});

/* ---------------- perf: low-power tier ---------------- */

test('SkyCanvas flags data-perf=low when it downsamples; glass.css turns backdrop-filter off for that tier', () => {
  const sky = fs.readFileSync(path.resolve('src/components/sky/SkyCanvas.tsx'), 'utf8');
  assert.match(sky, /dataset\.perf\s*=\s*'low'/);
  assert.match(sky, /powerPreference:\s*'low-power'/);
  const css = fs.readFileSync(path.resolve('src/styles/glass.css'), 'utf8');
  assert.match(css, /html\[data-perf='low'\]\s*\*\s*\{[^}]*backdrop-filter:\s*none\s*!important/);
});

/* ---------------- 第三批：请求缓存与超时 ---------------- */

test('cache: 并发请求合并、TTL 内复用、过期后重新请求', async () => {
  const load = runtime(async () => response([]));
  const { cached, peekCache, __setClock } = load('./content/cache');
  let now = 1000;
  __setClock(() => now);
  let calls = 0;
  const fetchOnce = () => cached('k', async () => { calls++; return [calls]; }, 500);

  const [a, b] = await Promise.all([fetchOnce(), fetchOnce()]);
  assert.equal(calls, 1, '并发只发一次');
  assert.equal(a, b);
  assert.equal(peekCache('k', 500), a, 'peek 命中');

  now += 400;
  assert.equal(await fetchOnce(), a, 'TTL 内复用同一份');
  assert.equal(calls, 1);

  now += 200;
  assert.equal(peekCache('k', 500), undefined, '过期后 peek 不命中');
  const c = await fetchOnce();
  assert.equal(calls, 2);
  assert.notEqual(c, a);
});

test('cache: 失败和 undefined 不缓存；invalidateContent 清空', async () => {
  const load = runtime(async () => response([]));
  const { cached, peekCache } = load('./content/cache');
  const { invalidateContent } = load('./content/changes');

  let n = 0;
  await assert.rejects(cached('f', async () => { n++; throw new Error('boom'); }));
  assert.equal(await cached('f', async () => { n++; return 'ok'; }), 'ok');
  assert.equal(n, 2, '失败后重试会真正重新请求');

  let missing = 0;
  assert.equal(await cached('m', async () => { missing++; return undefined; }), undefined);
  assert.equal(await cached('m', async () => { missing++; return undefined; }), undefined);
  assert.equal(missing, 2, '「不存在」不缓存');

  assert.equal(peekCache('f'), 'ok');
  invalidateContent();
  assert.equal(peekCache('f'), undefined, '内容失效后缓存被清掉');
});

test('cache: 请求进行中被清空时，旧结果不会写回', async () => {
  const load = runtime(async () => response([]));
  const { cached, peekCache } = load('./content/cache');
  const { invalidateContent } = load('./content/changes');
  let release;
  const slow = cached('s', () => new Promise((r) => { release = r; }));
  invalidateContent();
  release('stale');
  assert.equal(await slow, 'stale');
  assert.equal(peekCache('s'), undefined);
});

test('api: 超时覆盖响应体读取，抛 TIMEOUT 而不是 BAD_RESPONSE', async () => {
  // 让计时器立刻触发 abort；响应头已到，但 body 永远不来，直到被 abort
  const win = { setTimeout: (fn) => { setImmediate(fn); return 1; }, clearTimeout: () => {} };
  const hang = (_url, init) => Promise.resolve({
    ok: true, status: 200, headers: { get: () => null },
    json: () => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted')))),
  });
  const api = runtime(hang, win)('./content/api');
  await assert.rejects(api.listEssays(), (err) => err.name === 'ApiRequestError' && err.code === 'TIMEOUT');

  // 等响应头阶段超时同样是 TIMEOUT
  const stall = (_url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted'))));
  const api2 = runtime(stall, win)('./content/api');
  await assert.rejects(api2.listNotes(), (err) => err.code === 'TIMEOUT');
});

/* ---------------- 第三批：无障碍 / SEO / 构建 ---------------- */

const read = (rel) => fs.readFileSync(path.resolve(rel), 'utf8');

test('index.html: 带 OG/Twitter 元信息和 noscript；robots.txt 存在', () => {
  const html = read('index.html');
  for (const k of ['og:title', 'og:description', 'og:type', 'twitter:card']) assert.ok(html.includes(k), k);
  assert.match(html, /<noscript>[\s\S]*JavaScript[\s\S]*<\/noscript>/);
  assert.match(read('public/robots.txt'), /User-agent: \*/);
});

test('a11y: --ash 在最亮的底色（slab-3）上也达到 4.5:1', () => {
  const tokens = read('src/styles/tokens.css');
  const hex = (name) => tokens.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))[1];
  const lum = (h) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  for (const bg of ['void', 'abyss', 'slab', 'slab-2', 'slab-3']) {
    assert.ok(ratio(hex('ash'), hex(bg)) >= 4.5, `ash on ${bg}`);
  }
});

test('a11y: 样式里不再有小于 11px 的字号（星系标签 11px 除外的都 ≥ 12px）', () => {
  const dir = path.resolve('src/styles');
  const offenders = [];
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.css'))) {
    const css = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of css.matchAll(/font-size:\s*([0-9.]+)(px|rem)/g)) {
      const px = m[2] === 'px' ? Number(m[1]) : Number(m[1]) * 16;
      // 允许：rock__ext（文件图标里的扩展名）与星系标签（home.css 的 gx__*，11px）
      if (px < 11 && !/rock__ext/.test(css.slice(Math.max(0, m.index - 80), m.index))) offenders.push(`${f}: ${m[0]}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test('a11y: 弹层焦点陷阱会 inert 背景；移动菜单显式关闭它；命令面板输入框有名字', () => {
  assert.match(read('src/hooks/useFocusTrap.ts'), /inertBackground/);
  assert.match(read('src/components/layout/MobileMenu.tsx'), /modal:\s*false/);
  const palette = read('src/components/layout/CommandPalette.tsx');
  assert.match(palette, /aria-label="搜索站内内容"/);
  assert.doesNotMatch(palette, /aria-expanded="true"/);
});

test('构建: build 脚本剔除 demo-assets；脚本对 demo / 正式产物行为正确', () => {
  const { execFileSync } = require('node:child_process');
  const os = require('node:os');
  assert.match(JSON.parse(read('package.json')).scripts.build, /prune-demo-assets/);
  const mk = (withRef) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prune-'));
    fs.mkdirSync(path.join(dir, 'assets'));
    fs.mkdirSync(path.join(dir, 'demo-assets'));
    fs.writeFileSync(path.join(dir, 'demo-assets', 'a.png'), 'x');
    fs.writeFileSync(path.join(dir, 'assets', 'i.js'), withRef ? 'x="/demo-assets/a.png"' : 'x=1');
    return dir;
  };
  const official = mk(false);
  const demo = mk(true);
  execFileSync('node', ['scripts/prune-demo-assets.mjs', official]);
  execFileSync('node', ['scripts/prune-demo-assets.mjs', demo]);
  assert.equal(fs.existsSync(path.join(official, 'demo-assets')), false);
  assert.equal(fs.existsSync(path.join(demo, 'demo-assets')), true);
});

test('清理: 遗留调试开关与空函数已移除，源码不再引用不存在的设计文档', () => {
  assert.doesNotMatch(read('src/components/sky/SkyCanvas.tsx'), /skyBudget|budgetOverride/);
  assert.doesNotMatch(read('src/components/home/Orrery.tsx'), /onLinkClick/);
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    return e.isDirectory() ? walk(p) : /\.(ts|tsx|css)$/.test(e.name) ? [p] : [];
  });
  const bad = walk(path.resolve('src')).filter((f) => /设计文档/.test(fs.readFileSync(f, 'utf8')));
  assert.deepEqual(bad, []);
});

test('弹层: 遮罩带 data-overlay-scrim 不被 inert；Esc 统一走 useFocusTrap 的 onEscape', () => {
  assert.match(read('src/lib/inertBackground.ts'), /data-overlay-scrim/);
  assert.match(read('src/components/layout/CommandPalette.tsx'), /palette__scrim" data-overlay-scrim/);
  assert.match(read('src/components/shelf/ShelfDrawer.tsx'), /drawer__scrim" data-overlay-scrim/);
  for (const f of ['src/components/reading/Lightbox.tsx', 'src/components/shelf/ShelfDrawer.tsx', 'src/components/layout/MobileMenu.tsx']) {
    const src = read(f);
    assert.match(src, /onEscape/, f);
    assert.doesNotMatch(src, /key === 'Escape'/, f);
  }
  assert.match(read('src/hooks/useFocusTrap.ts'), /isImeComposing/);
});

test('formatDateTime: 本地时间格式；非法输入原样返回', () => {
  const { formatDateTime } = runtime(async () => response([]))('./lib/format');
  assert.equal(formatDateTime('not-a-date'), 'not-a-date');
  assert.match(formatDateTime('2026-10-28T12:34:00'), /^2026\.10\.28 12:34$/);
});

/* ---------------- 星系放大 / 星核耀斑 / 浑天仪拖动 ---------------- */

test('浑天仪: 欢迎页把舞台作为拖动目标，样式只让这块舞台接收指针', () => {
  assert.match(read('src/components/welcome/Armillary.tsx'), /dragTarget:\s*stage/);
  const css = read('src/styles/welcome.css');
  assert.match(css, /\.welcome__armillary-stage\s*\{[^}]*pointer-events:\s*auto[^}]*touch-action:\s*none/);
  assert.match(css, /\.welcome__sphere\s*\{[^}]*pointer-events:\s*none/);
  const eng = read('src/lib/armillary.ts');
  for (const k of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
    assert.ok(eng.includes(`addEventListener('${k}'`) && eng.includes(`removeEventListener('${k}'`), k);
  }
});

test('星核: 光图比原图大一圈以容纳拉长的耀斑；星系里星核图案取 1.35 倍最内轨道半径', () => {
  const core = read('src/lib/coreGlow.ts');
  assert.match(core, /LIGHT_SPAN\s*=\s*1\.6/);
  assert.match(core, /FLARE_STRETCH\s*=\s*1\.75/);
  const gx = read('src/lib/galaxy.ts');
  assert.match(gx, /this\.coreHalf\s*=\s*r0 \* 1\.35/);
  // 手机上舞台给轨道的比例更宽（0.46），桌面仍是 0.38
  assert.match(gx, /this\.rOuter\s*=\s*S \* \(this\.opts\.mobile \? 0\.46 : 0\.38\)/);
  assert.match(gx, /core\.draw\(this\.ctx, x, y, this\.coreHalf/);
});

test('首页: 星系宽度随右栏、高度受「视口 − 顶栏 − 留白」限制（放大后不顶到下一屏）', () => {
  const css = read('src/styles/home.css');
  // 文字栏定宽、星仪一方吃剩下的宽度并贴住右缘
  assert.match(css, /grid-template-columns:\s*minmax\(0, 584px\) minmax\(420px, 1fr\)/);
  assert.match(css, /padding:\s*calc\(var\(--nav-h\) \+ 24px\) 0 64px max\(var\(--gutter\),\s*calc\(\(100% - var\(--maxw\)\) \/ 2\)\)/);
  assert.match(css, /--size:\s*min\(100%, 760px, calc\(100svh - var\(--nav-h\) - 96px\)\)/);
  assert.match(css, /max-width: 980px\) \{ \.gx \{ --size: min\(94vw, 560px\)/);
});


test('弹层: 滚动锁有引用计数、恢复原样式且 CSS 实际禁止背景滚动', () => {
  const lock = read('src/hooks/useBodyScrollLock.ts');
  assert.match(lock, /let activeLocks = 0/);
  assert.match(lock, /activeLocks \+= 1/);
  assert.match(lock, /activeLocks === 0/);
  assert.match(lock, /body\.style\.paddingRight = originalPaddingRight/);
  assert.match(read('src/styles/base.css'), /html\.scroll-lock\s*\{[^}]*overflow-y:\s*hidden/s);
});

test('弹层: 命令面板用统一的快捷键决策，避开灯箱、抽屉和欢迎层', () => {
  const palette = read('src/components/layout/CommandPalette.tsx');
  assert.match(palette, /paletteShortcut\(e, \{ isOpen, typing, otherModalOpen: hasOtherModalOpen\(\) \}\)/);
  assert.match(palette, /document\.querySelector\(OTHER_MODAL_SELECTOR\)/);
  const { OTHER_MODAL_SELECTOR } = runtime(async () => response([]))('./lib/paletteShortcut');
  assert.equal(OTHER_MODAL_SELECTOR, '[role="dialog"]:not(.palette__box)');
  // 灯箱和抽屉自己写了 role="dialog"；欢迎层的 role 由 Radix 在运行时加
  assert.match(read('src/components/reading/Lightbox.tsx'), /role="dialog"/);
  assert.match(read('src/components/shelf/ShelfDrawer.tsx'), /role="dialog"/);
});

test('paletteShortcut: 打开 / 关闭 / 被其他弹层拦住时不吞浏览器快捷键', () => {
  const mod = runtime(async () => response([]))('./lib/paletteShortcut');
  // vm 里创建的对象原型和主上下文不同，deepEqual 前先拷贝一份
  const paletteShortcut = (...a) => ({ ...mod.paletteShortcut(...a) });
  const key = (k, mods = {}) => ({ key: k, metaKey: false, ctrlKey: false, altKey: false, ...mods });
  const idle = { isOpen: false, typing: false, otherModalOpen: false };
  assert.deepEqual(paletteShortcut(key('k', { ctrlKey: true }), idle), { action: 'open', preventDefault: true });
  assert.deepEqual(paletteShortcut(key('K', { metaKey: true }), idle), { action: 'open', preventDefault: true });
  assert.deepEqual(paletteShortcut(key('k', { ctrlKey: true }), { ...idle, isOpen: true }), { action: 'close', preventDefault: true });
  // 其他弹层已打开：不动作，也不 preventDefault
  const blocked = { ...idle, otherModalOpen: true };
  assert.deepEqual(paletteShortcut(key('k', { ctrlKey: true }), blocked), { action: 'none', preventDefault: false });
  assert.deepEqual(paletteShortcut(key('/'), blocked), { action: 'none', preventDefault: false });
  // "/"：输入框里、带修饰键、面板已开时都不触发
  assert.deepEqual(paletteShortcut(key('/'), idle), { action: 'open', preventDefault: true });
  assert.equal(paletteShortcut(key('/'), { ...idle, typing: true }).action, 'none');
  assert.equal(paletteShortcut(key('/', { altKey: true }), idle).action, 'none');
  assert.equal(paletteShortcut(key('/'), { ...idle, isOpen: true }).action, 'none');
  assert.equal(paletteShortcut(key('a'), idle).action, 'none');
});

test('构建: 只给 React 切手动块；markdown 链与 KaTeX 交给 Rollup（手动切会让 KaTeX 跟着每篇文章下载）', () => {
  assert.match(read('vite.config.ts'), /manualChunks:\s*chunkFor/);
  const { chunkFor } = runtime(async () => response([]))('./lib/chunkRules');
  const id = (p) => `/project/node_modules/${p}/index.js`;
  assert.equal(chunkFor(id('react-dom')), 'react');
  assert.equal(chunkFor('C:\\project\\node_modules\\react-dom\\index.js'), 'react'); // Windows 路径
  // 这两条是被实测推回来的：切了就会冒出 `Circular chunk: katex -> markdown -> katex`，
  // 并且 markdown 块顶部多一条 `import "./katex-xxx.js"`，无公式的文章也付 259 KB
  for (const p of ['react-markdown', 'remark-gfm', 'rehype-slug', 'hast-util-to-text', 'vfile-message', 'unist-util-visit', 'katex', 'rehype-katex', 'remark-math']) {
    assert.equal(chunkFor(id(p)), undefined, p);
  }
  assert.equal(chunkFor(id('react-markdown-extra')), undefined);
  assert.equal(chunkFor('/project/src/lib/vfile-like.ts'), undefined);
});

test('SEO: 分享图地址来自构建时的 VITE_SITE_URL；canonical / og:url 用同一个域名', () => {
  const html = read('index.html');
  assert.match(html, /property="og:image" content="__SITE_URL__\/og-image\.png"/);
  assert.match(html, /name="twitter:image" content="__SITE_URL__\/og-image\.png"/);
  assert.doesNotMatch(html, /entroaxiom\.com/);
  assert.match(html, /twitter:card" content="summary_large_image"/);
  const { applySiteUrl, normalizeSiteUrl, canonicalUrl } = runtime(async () => response([]))('./lib/siteUrl');
  const withUrl = applySiteUrl(html, 'https://example.com');
  assert.match(withUrl, /og:image" content="https:\/\/example\.com\/og-image\.png"/);
  assert.doesNotMatch(withUrl, /__SITE_URL__/);
  const without = applySiteUrl(html, undefined);
  assert.doesNotMatch(without, /__SITE_URL__|og:image" content|twitter:image" content/);
  assert.match(without, /og:title/); // 只删含占位符的行
  assert.equal(normalizeSiteUrl(' https://example.com/abc/ '), 'https://example.com');
  assert.equal(normalizeSiteUrl('example.com'), undefined);
  assert.equal(normalizeSiteUrl('ftp://example.com'), undefined);
  assert.equal(normalizeSiteUrl(''), undefined);
  assert.equal(canonicalUrl('https://example.com', '/essays/a/'), 'https://example.com/essays/a');
  assert.equal(canonicalUrl('https://example.com', '/'), 'https://example.com/');
  const app = read('src/App.tsx');
  assert.match(app, /link\[rel="canonical"\]/);
  assert.match(app, /meta\[property="og:url"\]/);
  assert.match(app, /normalizeSiteUrl\(import\.meta\.env\.VITE_SITE_URL\) \?\? window\.location\.origin/);
  assert.match(read('vite.config.ts'), /transformIndexHtml/);
  assert.match(read('.env.example'), /VITE_SITE_URL/);
  assert.equal(require('node:fs').existsSync(path.resolve('public/og-image.png')), true);
});

test('SEO: 404 / 内容不存在的页面加 noindex，离开后移除', () => {
  assert.match(read('src/components/state/NotFoundState.tsx'), /useNoIndex\(\)/);
  const hook = read('src/hooks/useNoIndex.ts');
  assert.match(hook, /content = 'noindex'/);
  assert.match(hook, /meta\.remove\(\)/);
});

test('字体: Noto Serif CJK 的 OFL 许可证随 public 资源发布', () => {
  const license = read('public/licenses/OFL-Noto-Serif-CJK.txt');
  assert.match(license, /SIL OPEN FONT LICENSE Version 1\.1/);
  assert.match(license, /Copyright © 2017-2023 Adobe/);
});

/* ---------------- 舞台隐藏态：行内 visibility 不得顶穿 ---------------- */

test('没有组件用行内 visibility 顶穿 .stage[inert] 的隐藏', () => {
  // 欢迎层显示期间 .stage[inert] 靠 visibility:hidden 隐藏整个舞台。
  // 只要有子元素写了行内 visibility:visible，就会把舞台顶穿，
  // 首页还没露面时它的文字已经飘在欢迎层上了（曾经就是这么坏的）。
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(entry.name)) {
        const code = fs.readFileSync(p, 'utf8');
        if (/\.style\.visibility\s*=/.test(code) || /style=\{\{[^}]*visibility/.test(code)) {
          offenders.push(path.relative(path.resolve('.'), p));
        }
      }
    }
  };
  walk(path.resolve('src'));
  assert.deepEqual(offenders, []);
});
test('a11y: 移动端触控目标不小于 44px（例外必须用伪元素把可点范围撑开）', () => {
  const css = read('src/styles/mobile.css');
  // 手机上没有悬停，点不中就真的点不中。可视化高度可以小于 44px，
  // 但那样的元素必须另配一条 ::after 把可点范围撑到 44px，否则算漏。
  const expanded = /::after\s*\{[^}]*inset:\s*-/.test(css);
  const offenders = [];
  for (const m of css.matchAll(/min-height:\s*(\d+)px/g)) {
    const px = Number(m[1]);
    if (px === 0) continue; // 显式归零是不需要高度的容器
    if (px < 44) offenders.push(m[0]);
  }
  // .gx__label 是唯一允许低于 44px 的可点元素：它绝对定位浮在星轨上，
  // 直接加高会和相邻标签叠住，所以靠 ::after 撑开。
  const softAllowed = offenders.length === 1 && offenders[0] === 'min-height: 36px' && expanded;
  assert.ok(offenders.length === 0 || softAllowed, `触控目标过小且没有 ::after 撑开：${offenders.join(' / ')}`);
  if (softAllowed) assert.match(css, /\.gx__label::after/);
});

test('a11y: 移动端字号不低于 12px（原来这里硬写 0.6875rem 把 12px 压到 11px）', () => {
  const css = read('src/styles/mobile.css');
  const small = [];
  for (const m of css.matchAll(/font-size:\s*([0-9.]+)(px|rem)/g)) {
    const px = m[2] === 'px' ? Number(m[1]) : Number(m[1]) * 16;
    if (px < 12) small.push(m[0]);
  }
  assert.deepEqual(small, [], 'mobile.css 里出现了小于 12px 的字号');
});

test('布局: 命令面板给网格一条可压缩的轨道，窄屏不靠隐式轨道撑宽', () => {
  const mobile = read('src/styles/mobile.css');
  // .palette 是 display:grid，只写 justify-items 而没有 grid-template-columns 时，
  // 隐式轨道会按内容 min-content 撑开，__box 的 100% 又按撑开后的轨道算，正反馈溢出。
  assert.match(mobile, /\.palette\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(mobile, /\.palette__box\s*\{[^}]*max-width:\s*100%/);
});

test('布局: 手机首页的星仪吃满单栏宽度，轨道比例也放大（不再围一圈空白）', () => {
  const mobile = read('src/styles/mobile.css');
  // 桌面是双栏，--size 跟着右栏和视口高度走；手机只有一栏，直接吃满这一栏。
  // 只按 88vw 算的话，390 的屏上画布只有 343px，而 hero 的内容宽度是 354px。
  assert.match(mobile, /\.gx\s*\{[^}]*--size:\s*min\(100%,\s*480px\)/);
  // 放大不能只放大画布：rOuter 0.38 时轨道只占画布 76%，四周一圈都是空的。
  // 手机上提到 0.46，同样的画布宽度能画出更大的星系（桌面仍保持 0.38）。
  const gx = read('src/lib/galaxy.ts');
  assert.match(gx, /this\.rOuter\s*=\s*S \* \(this\.opts\.mobile \? 0\.46 : 0\.38\)/);
});

test('布局: 手机的全栏目菜单是两栏星表，栏间有分隔，底色不透出下层文字', () => {
  const mobile = read('src/styles/mobile.css');
  // 两栏并排：一屏放完 8 个分区，不用滚。
  assert.match(mobile, /\.mobile-menu__list\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  // 两个分区之间的竖分隔线（列表的中缝），以及行与行之间的横线。
  assert.match(mobile, /\.mobile-menu__list::before\s*\{[^}]*left:\s*50%[^}]*width:\s*1px/);
  assert.match(mobile, /\.mobile-menu__list li\s*\{[^}]*border-top:\s*1px solid var\(--line\)/);
  // 菜单正下方是每帧重绘的星空和星系标签。底色必须是不透明的：
  // 只要还留着 0.9x 的半透明玻璃底，下层的字就会透上来并跟着动画游走。
  const menuBlock = mobile.slice(mobile.indexOf('.mobile-menu {'));
  const bg = menuBlock.slice(0, menuBlock.indexOf('}'));
  assert.ok(!/background:\s*rgba\([^)]*,\s*0?\.\d+\s*\)/.test(bg),
    `移动菜单的底色不能是半透明的，否则会透出下层文字：${bg}`);
  assert.match(bg, /linear-gradient\(180deg,\s*#0a0c1a,\s*#05060e\)/);
  // 底子不透光之后，叠在 WebGL 画布上的 backdrop-filter 只剩开销。
  assert.match(bg, /backdrop-filter:\s*none/);
  // 低性能档会把 .glass 统一换成半透明底，这里必须压住它。
  assert.match(mobile, /html\[data-perf='low'\] \.glass\.mobile-menu\s*\{[^}]*background:\s*var\(--menu-bg\)/);
});

test('版式: 每个页面的标题只有一个尺寸，量度只有两条', () => {
  const tokens = read('src/styles/tokens.css');
  // 随笔/星图/公理三个页头以前各自 clamp 到 3.6 / 4.4 / 4.2rem，翻页时标题会忽然变大变小。
  assert.match(tokens, /--t-page-title:\s*clamp\(2\.2rem,\s*4\.6vw,\s*4rem\)/);
  for (const f of ['src/styles/lists.css', 'src/styles/atlas.css', 'src/styles/pages.css']) {
    assert.match(read(f), /font-size:\s*var\(--t-page-title\)/, `${f} 的页标题要取统一字号`);
  }
  // 两条量度：正文 1200、展板 1360。
  assert.match(tokens, /--maxw:\s*1200px/);
  assert.match(tokens, /--widew:\s*1360px/);
  assert.match(read('src/styles/lists.css'), /\.page--wide\s*\{\s*width:\s*min\(100% - 2 \* var\(--gutter\),\s*var\(--widew\)\);\s*max-width:\s*var\(--widew\)/);
});

test('版式: 模块页头是「行星 + 两栏铭牌 + 读数」的一条带子', () => {
  const css = read('src/styles/lists.css');
  // 两栏：左边身份（铭文 + 页名），右边声音（箴言 + 描述），中间一条竖发丝线
  assert.match(css, /\.mod-head__text\s*\{[^}]*grid-template-columns:\s*clamp\(200px,\s*20vw,\s*268px\)\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /\.mod-head__voice::before\s*\{[^}]*width:\s*1px/);
  // 页头被压到 ~176px 高（行星 132 + 上下留白），内容提上来一格
  assert.match(css, /\.mod-head__planet\s*\{[^}]*width:\s*clamp\(92px,\s*10vw,\s*132px\)/);
  // 读数挪到右侧，与演示标记上下叠放，不再吊在描述下面
  assert.match(css, /\.mod-head__aside\s*\{[^}]*justify-items:\s*end/);
  const mobile = read('src/styles/mobile.css');
  // 手机上两栏合成一栏，竖发丝线收掉
  assert.match(mobile, /\.mod-head__text\s*\{\s*display:\s*block/);
  assert.match(mobile, /\.mod-head__voice::before\s*\{\s*display:\s*none/);
});

test('版式: 星盘吃满展板宽度，公理的七张牌摊成一道弧', () => {
  // 星盘以前卡在 760px，右半边一直空着
  assert.ok(!/\.chart__svg\s*\{[^}]*max-width:\s*760px/.test(read('src/styles/atlas.css')),
    '星盘不应再被 760px 卡住');
  const pages = read('src/styles/pages.css');
  // 七张牌按序号偏移：中间最高，两侧依次沉下去并偏转
  for (let i = 1; i <= 7; i++) assert.match(pages, new RegExp(`\\.tarot-slot:nth-child\\(${i}\\)\\s*\\{[^}]*--dy:`));
  assert.match(pages, /\.tarot-slot\s*\{[^}]*transform:\s*translateY\(var\(--dy, 0px\)\) rotate\(var\(--rot, 0deg\)\)/);
  // 手机上先把弧收平，横滑时不上下错位
  assert.match(read('src/styles/mobile.css'), /\.tarot-slot:nth-child\(n\)\s*\{[^}]*--rot:\s*0deg/);
});

test('SEO: 正式构建缺 VITE_SITE_URL 直接失败，不再静默丢掉分享图', () => {
  const vite = read('vite.config.ts');
  // 以前只 console.warn，产物里就会只剩 og:image:width/height/alt 这些孤儿声明
  assert.match(vite, /throw new Error\(/);
  assert.match(vite, /构建缺少 VITE_SITE_URL/);
  assert.doesNotMatch(vite, /console\.warn\(/);
  // 仓库自带 .env.production（只有公开域名），正常构建不用手写变量
  assert.match(read('.env.production'), /^VITE_SITE_URL=https:\/\/entroaxiom\.com$/m);
  assert.match(read('.gitignore'), /^!\.env\.production$/m);
  // 没有站点地址时整组 image 声明一起删掉，不留孤儿
  const { applySiteUrl } = runtime(async () => response([]))('./lib/siteUrl');
  const html = [
    '<meta property="og:title" content="t" />',
    '  <meta property="og:image" content="__SITE_URL__/og-image.png" />',
    '  <meta property="og:image:width" content="1200" />',
    '  <meta property="og:image:height" content="630" />',
    '  <meta name="twitter:image" content="__SITE_URL__/og-image.png" />',
    '  <meta name="twitter:image:alt" content="a" />',
    '  <meta name="twitter:card" content="summary_large_image" />',
  ].join('\n');
  const out = applySiteUrl(html, undefined);
  assert.doesNotMatch(out, /og:image|twitter:image/);
  assert.match(out, /og:title/);
  assert.match(out, /twitter:card/);
});

test('性能: KaTeX 只在正文含公式时才下载，不在首屏依赖里', () => {
  const md = read('src/components/reading/Markdown.tsx');
  // 静态引入会让每篇详情页都无条件多下 262 KB js + 29 KB css
  assert.doesNotMatch(md, /^import rehypeKatex/m);
  assert.doesNotMatch(md, /^import 'katex\/dist\/katex\.min\.css'/m);
  // 动态引入的是本地入口 katexPlugin.ts：直接 import('rehype-katex') 会被 Rollup
  // 在 markdown 块里补一条静态副作用引入，按需加载就失效了（见 chunkRules.ts 顶部）
  assert.match(md, /import\('\.\/katexPlugin'\)/);
  assert.doesNotMatch(md, /import\('rehype-katex'\)/);
  const plugin = read('src/components/reading/katexPlugin.ts');
  assert.match(plugin, /^import rehypeKatex from 'rehype-katex';/m);
  assert.match(plugin, /^import 'katex\/dist\/katex\.min\.css';/m);
  assert.match(plugin, /export default rehypeKatex;/);
  // 挂不挂 remark-math / rehype-katex 由正文内容决定
  assert.match(md, /containsMath\(body\)/);
  assert.match(md, /remarkPlugins=\{katex \?/);
  const { containsMath } = runtime(async () => response([]))('./lib/mathText');
  assert.equal(containsMath('普通段落，没有公式'), false);
  assert.equal(containsMath('价格 $5 到 $9'), false);
  assert.equal(containsMath('行内 $a^2+b^2$ 结束'), true);
  assert.equal(containsMath('$$\nE=mc^2\n$$'), true);
});
