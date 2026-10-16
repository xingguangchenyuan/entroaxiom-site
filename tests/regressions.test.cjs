const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// 直接测试实际 TS 模块；不维护一份复制的业务实现，也不增加测试运行依赖。
function runtime(fetch) {
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
      fetch, AbortController, URLSearchParams, window: { setTimeout, clearTimeout },
    }, { filename });
    return module.exports;
  }
  return load;
}
const response = (data, status = 200) => ({
  ok: status < 400, status, headers: { get: () => null },
  json: async () => ({ success: status < 400, data: status < 400 ? data : null, error: status < 400 ? null : data }),
});

for (const count of [0, 499, 500, 501, 1001]) {
  for (const kind of ['notes', 'files']) {
    test(`${kind} list loads all ${count} items`, async () => {
      const offsets = [];
      const load = runtime(async (url) => {
        const parsed = new URL(url, 'http://test');
        const offset = Number(parsed.searchParams.get('offset'));
        offsets.push(offset);
        return response(Array.from({ length: Math.min(500, Math.max(0, count - offset)) }, (_, i) => ({ id: String(offset + i) })));
      });
      const api = load('./lib/adminApi');
      const items = kind === 'files' ? await api.files.list() : await api.content.list(kind);
      assert.equal(items.length, count);
      assert.equal(offsets.length, Math.floor(count / 500) + 1);
      assert.equal(new Set(items.map((item) => item.id)).size, count);
    });
  }
}

test('validation accepts string and array locations, including nested fields', () => {
  const { validationField } = runtime()('./lib/adminApi');
  assert.equal(validationField([{ loc: 'body.title' }]), 'title');
  assert.equal(validationField([{ loc: ['body', 'title'] }]), 'title');
  assert.equal(validationField([{ loc: ['body', 'tags', 0] }]), 'tags');
  assert.equal(validationField([{ loc: 'body.tags.0' }]), 'tags');
  assert.equal(validationField([{ loc: 'body.body' }]), 'body');
  assert.equal(validationField([{ loc: ['body', 'body'] }]), 'body');
  assert.equal(validationField([{ loc: ['body'] }]), null);
  assert.equal(validationField(null), null);
});

test('422 message uses full field name instead of last character', async () => {
  const api = runtime(async () => response({ code: 'VALIDATION_ERROR', message: 'invalid',
    details: [{ loc: 'body.title', msg: 'too long' }] }, 422))('./lib/adminApi');
  await assert.rejects(api.content.create('notes', { title: 'x' }), { message: 'title：too long' });
});

test('successful admin write invalidates cached public content', async () => {
  let visible = true;
  const load = runtime(async (url, options = {}) => {
    if (options.method === 'PATCH') { visible = false; return response({ id: 'new' }); }
    return response(url === '/api/public/notes' && visible ? [{ id: 'new', title: 'new', summary: '', tags: [] }] : []);
  });
  // loader has a build-time import.meta; its actual API exports are identical in official mode.
  const loaderPath = path.resolve('src/content/loader.ts');
  // Use corpus with the actual public API in a separate module loader, replacing only the env switch.
  const api = load('./content/api');
  const changes = load('./content/changes');
  const code = ts.transpileModule(fs.readFileSync('src/content/corpus.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: (name) => {
    if (path.resolve(path.dirname(loaderPath), name) === path.resolve('src/content/loader')) return api;
    return load(name, path.resolve('src/content'));
  } });
  const before = await module.exports.loadCorpus();
  assert.equal(before.entries.length, 1);
  assert.strictEqual(await module.exports.loadCorpus(), before);
  let notifications = 0;
  const unsubscribe = changes.subscribeContentChanges(() => notifications++);
  await load('./lib/adminApi').content.update('notes', 'new', { visibility: 'private' });
  const after = await module.exports.loadCorpus();
  assert.equal(after.entries.length, 0);
  assert.notStrictEqual(after, before);
  assert.equal(notifications, 1);
  unsubscribe();
});

test('failed admin write does not invalidate content', async () => {
  const load = runtime(async () => response({ code: 'ID_CONFLICT', message: 'conflict' }, 409));
  const changes = load('./content/changes');
  await assert.rejects(load('./lib/adminApi').content.update('notes', 'new', { id: 'taken' }));
  assert.equal(changes.getContentVersion(), 0);
});
