# entroaxiom v3 · 公开接口约定

前端只请求**同源** `/api/public/*`，不需要 CORS。站长后台（Pure Admin / Naive UI Admin 等独立系统）走你自己的 `/api/admin/*`，前端站点不关心。

## 通用

- 响应信封：

  ```json
  { "success": true, "data": <payload>, "error": null }
  { "success": false, "data": null, "error": { "code": "VALIDATION_ERROR", "message": "人话", "details": [...] } }
  ```

- **404 要看端点**：
  - 详情（`/essays/{id}`、`/notes/{id}`、`/files/{id}`、`/shelf/{id}`）返回 404 → 页面显示「内容不存在」（正常语义）；
  - 列表（`/essays`、`/notes`、`/files`、`/shelf`、`/guestbook`）返回 404 → **当错误处理**，显示"加载失败"并提示检查反代，
    不能吞成空列表 —— 列表接口只会返回数据或空数组，404 只说明 `/api/public/*` 没转发到后端
    （前端抛 `ApiRequestError{status:404, code:'ENDPOINT_NOT_FOUND'}`）。
- 只返回 `visibility=public` 且 `status=published` 的内容。401/403/422/429/5xx/超时/网络错误分别有独立文案，不降级成"空内容"。
- 日期 `YYYY-MM-DD`；时间戳 ISO 8601（带时区）。可空字段返回 `null`。
- 列表接口一次性返回全部公开条目（不含 `body`），前端自行搜索/筛选/排序。
- 超时 15 秒；429 显示「提交太频繁了」。

## 随笔 essays

| 方法 | 路径 | data |
|---|---|---|
| GET | `/api/public/essays` | `Essay[]`（无 body） |
| GET | `/api/public/essays/{id}` | `Essay` |

```ts
interface Essay {
  id: string;              // slug，≤80
  title: string;           // ≤200
  summary: string;         // ≤500
  category: string | null;
  tags: string[] | null;
  date: string | null;     // 写作日期
  updated: string | null;
  mood: string | null;     // 心境，一两个字：晴 / 倦 / 微醺
  place: string | null;    // 写下它的地方
  body?: string;           // Markdown（GFM + $数学$），仅详情接口
}
```

后端可直接复用旧版 `ContentMixin` + `build_content_router`，新增 `essays` 表并加 `mood`、`place` 两列。

## 学习笔记 notes

同 essays，路径 `/api/public/notes[/{id}]`，无 `mood/place`（与旧版完全兼容）。

## 文件库 files

| GET | `/api/public/files` | `File[]` |
|---|---|---|
| GET | `/api/public/files/{id}` | `File` |

```ts
interface File {
  id: string; name: string; ext: string;
  kind: 'image' | 'pdf' | 'archive' | 'doc' | 'other';   // 其它值按 other
  size: number;            // 字节
  updatedAt: string | null;
  src: string;             // 可下载地址，如 /uploads/public/xxx.pdf
  description: string | null;

  // —— 可选别名（后台新版会一起给；前台按 publicUrl → publicSrc → src 取第一个非空）——
  publicUrl?: string | null;
  publicSrc?: string | null;
  mime?: string | null;
  visible?: boolean;
  status?: 'ready' | 'processing' | 'failed';
}
```

约定：

- 公开文件的地址**只有一种**形态：`/uploads/public/<fileId>.<ext>`。历史文档里出现过的 `/media/...` 已作废
  （前台 Nginx 只反代 `/api/` 与 `/uploads/`，`/media/` 会返回 SPA 的 `index.html`，图片表现为"加载失败"）。
- 私密文件不返回地址：`src`/`publicUrl`/`publicSrc` 全为 `null`。前台遇到"没有地址"时显示「这张图片未公开，暂不显示」。
- 正文里不要残留 `asset:<id>` 这种编辑器内部引用：它是后台的私有写法，前台既不会请求也应显示占位。
  若真漏出来，前台会显示「这张图片未公开，暂不显示」而不是无限重试。

与旧版接口一致。

## 书影音 shelf

| GET | `/api/public/shelf` | `ShelfItem[]` |
|---|---|---|
| GET | `/api/public/shelf/{id}` | `ShelfItem` |

```ts
interface ShelfItem {
  id: string;
  kind: 'book' | 'film' | 'music';       // 未知值按 book
  title: string;
  creator: string | null;                // 作者 / 导演 / 音乐人
  year: number | null;
  rating: number | null;                 // 0–5，允许 .5；越界会被夹紧
  status: 'done' | 'doing' | 'want';     // 已抵达 / 航行中 / 待观测
  date: string | null;                   // 标记日期
  tags: string[] | null;
  quote: string | null;                  // 摘句
  review: string | null;                 // 短评，纯文本，空行分段
  cover: string | null;                  // 封面 URL；为空时前端生成星云封面
  link: string | null;                   // 外链（豆瓣等）
}
```

## 留言区 guestbook

### 列表

`GET /api/public/guestbook?offset=0&limit=12` → 仅已审核留言，按时间倒序：

```ts
{
  items: {
    id: string;
    name: string;
    site: string | null;
    body: string;                          // 纯文本，前端不渲染 HTML
    sigil: 'sun'|'moon'|'mercury'|'venus'|'mars'|'jupiter'|'saturn' | null;  // 未知值按 moon
    createdAt: string;
    reply: { body: string; createdAt: string } | null;   // 站长回复
  }[];
  total: number;
}
```

**不要**在公开接口返回 email。

### 提交

`POST /api/public/guestbook`，请求头含 `Content-Type: application/json` 与 `X-Requested-With: entroaxiom`（可用于简单 CSRF 校验）：

```json
{ "name": "过路人", "email": "可选", "site": "https://可选", "body": "留言", "sigil": "venus" }
```

| 字段 | 规则 |
|---|---|
| name | 必填，去首尾空格，≤24 字 |
| body | 必填，2–500 字（按 Unicode 字符计） |
| email | 可选，≤120 |
| site | 可选，http(s)，≤200 |
| sigil | 上表七个之一 |

- 成功 201：`data = { id, status: 'pending' | 'approved', createdAt }`。`pending` 时前端在本机显示「等待审核」的虚线彗星。
- 校验失败 422：`error.details` 用 FastAPI 风格 `[{ "loc": ["body", "name"], "msg": "..." }]`，前端会高亮对应字段。
- 频率限制 429：`error.code = "RATE_LIMITED"`。
- 前端有隐藏蜜罐字段，机器人填写时直接不提交；后端仍应自行限流。

审核/回复/删除放在你的独立后台：建议表 `guestbook(id, name, email, site, body, sigil, status pending|approved|hidden, reply, reply_at, ip_hash, created_at)`。

## 演示模式

`npm run dev:demo` / `build:demo` 不请求任何接口，数据来自 `src/content/demo/`；留言提交保存在浏览器 localStorage（`entroaxiom:demo-guestbook`）。
