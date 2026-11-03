# EntroAxiom · 星仪

> 在无序的熵变中，确立世界的公理。

私人站点 <https://entroaxiom.com> 的前台。每个栏目都是一颗有自己颜色的天体，围绕背景里的 WebGL 黑洞公转；内容通过同源 API 从后端读取，后台在 [entroaxiom-admin](https://github.com/xingguangchenyuan/entroaxiom-admin)。

![React](https://img.shields.io/badge/react-18.3-61dafb)
![Vite](https://img.shields.io/badge/vite-5.4-646cff)
![TypeScript](https://img.shields.io/badge/typescript-5.6-3178c6)
![Tests](https://img.shields.io/badge/tests-44%20regress%20%2B%2059%20unit-brightgreen)

## 三个仓库

| 仓库 | 作用 | 技术栈 |
| --- | --- | --- |
| **entroaxiom-site**（本仓库） | 前台：星仪主页、五个内容模块、星图、公理 | React 18 · Vite · TypeScript |
| [entroaxiom-admin](https://github.com/xingguangchenyuan/entroaxiom-admin) | 内容管理后台 | Vue 3 · Element Plus |
| [entroaxiom-backend](https://github.com/xingguangchenyuan/entroaxiom-backend) | API、业务规则、存储 | Fastify 5 · PostgreSQL 16 |

前台只读 `/api/public/*`，不包含任何管理界面、也不携带管理凭证。

## 栏目

| 路径 | 栏目 | 天体 / 色相 | 说明 |
| --- | --- | --- | --- |
| `/` | 星仪 | 黑洞 | 星盘欢迎层 → 可悬停的太阳系仪（点行星进入栏目）、今日神谕牌、随笔余烬条、笔记账簿、书影音、留言彗星跑马灯、规模读数 |
| `/essays` `/essays/:id` | 随笔 | 余烬 · 橙 `#ef8456` | 按年份的火星时间线；详情为书信体（首字下沉、心境/地点、落款） |
| `/notes` `/notes/:id` | 学习笔记 | 冰卫星 · 青 `#9fd6e0` | 冰晶卡片网格；详情含目录、阅读进度、KaTeX、图片灯箱 |
| `/shelf` | 书影音 | 气态巨星 · 紫 `#ab93ff` | 书/影/音光谱切换，「航行中」轨道，程序化星云封面墙，侧抽屉详情（`?item=`） |
| `/files` `/files/:id` | 文件库 | 陨石带 · 金 `#e9bd5e` | 质量光谱条、陨石图标、按大小排序 |
| `/guestbook` | 留言区 | 彗星 · 青绿 `#72e0b9` | 选择行星星符留言，留言以彗星落下；草稿自动保存；站长回复 |
| `/atlas` | 星图 | 玫瑰 | 极坐标星图（角度=栏目，半径=时间，越新越近中心），悬停连出同标签星座；时间轴、标签星云视图 |
| `/axioms` | 公理 | 金 | 七张可翻转的塔罗牌 + 空着的第八张 |

`Ctrl/⌘ K` 或 `/` 打开检索星空（全站搜索面板）；页脚有按当天计算的月相。

## 技术栈

React 18.3 · Vite · TypeScript · `react-router-dom` 6 · `react-markdown` 9（`remark-gfm` / `remark-math` / `rehype-katex` / `rehype-slug`）· KaTeX · `@radix-ui/react-dialog`（欢迎层）· `@fontsource/cinzel` + `@fontsource/jetbrains-mono` · 自托管 Entro Serif 分片字体（Noto Serif CJK 子集，OFL）。

主页星系是 canvas 2D 手绘 + 逐帧投影，不依赖 WebGL 框架；黑洞与星云着色器在 `src/components/sky/`。

## 目录

```
src/
  content/      数据层：api.ts（/api/public 客户端）、loader.ts（official/demo 切换）、corpus.ts、cache.ts
  pages/        12 个页面（首页、五组列表与详情、星图、公理、404）
  components/   home（星系仪）、reading（正文渲染）、layout、list、files、shelf、guestbook、atlas、sky、ui、welcome
  hooks/        16 个：useCorpus / useListQuery / useReadingProgress / useFocusTrap / useMoonPhase / usePrefersReducedMotion …
  lib/          纯逻辑：armillary（轨道计算）、galaxy、coreGlow、readingTime、listFilter、siteUrl、links …
  config/       site.ts（站名、导航、文案）、worlds.ts（五个天体）、axioms.ts（七条公理）
  styles/       tokens.css（颜色/字体/间距令牌）、fonts.css、layout.css
  assets/fonts/ Entro Serif 分片字体
tests/          regressions.test.cjs：44 条源码级回归断言（node:test）
```

单元测试（Vitest，59 条）与源码同目录，文件名 `*.test.ts`。

## 快速开始

```bash
npm ci
npm run dev:demo     # 不需要后端：使用随包演示内容，界面标注「演示内容」
npm run dev          # 对接 http://127.0.0.1:8000（/api 与 /uploads 由 Vite 代理）
```

| 命令 | 作用 |
| --- | --- |
| `npm run dev` / `dev:demo` | 开发服务器（后者用演示内容） |
| `npm run build` / `build:demo` | 正式构建（移除演示数据）/ 演示构建 |
| `npm run preview` | 预览构建产物 |
| `npm test` | `test:regress` + `test:unit` |
| `npm run test:regress` | 44 条源码级回归（不需要后端） |
| `npm run test:unit` | 59 条 Vitest 单元测试 |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run format` / `format:check` | Prettier |

## 配置

| 变量 | 作用 | 默认 |
| --- | --- | --- |
| `VITE_CONTENT_SOURCE` | `official`（读后端）或 `demo`（随包演示内容）。demo 分支是编译期常量，正式构建里整段被剔除 | `official` |
| `VITE_DEV_BACKEND` | 开发时 `/api`、`/uploads` 代理到的后端 | `http://127.0.0.1:8000` |
| `VITE_SITE_URL` | 站点正式地址，用于 `og:image` / `canonical` 的绝对地址；不设则分享卡片没有图 | 空 |

**不支持跨域 API**：浏览器只打同源 `/api`，生产由 Nginx 转发到后端，开发由 Vite 代理。

## 数据流

- 列表接口 `/api/public/{essays,notes,files,shelf}` 返回**数组**，`/api/public/guestbook` 返回 `{items,total}`（带 `offset`/`limit`）。
- 信封统一为 `{success,data,error}`；后端用 `null` 表示"没有"，前端类型用 `undefined`，在 `content/api.ts` 统一转换。
- **详情 404 是正常业务结果**（不存在 / 私密 / 草稿）→ 页面显示"未找到"；**列表 404 是部署错误**（路由或反代没配对）→ 抛 `ENDPOINT_NOT_FOUND`，绝不显示成"暂无内容"。
- 正文里的图片/附件由后端在发布时决定是否公开：未被公开的图片在 API 里已经是占位说明，前台不需要（也没有）取私密资源的接口。
- 请求带 15 秒超时，超时与网络失败、网关错误页分别给出不同文案。

## 测试

- `npm run test:regress`：44 条断言，直接读源码检查不变量——例如「没有组件用行内 `visibility` 顶穿 `.stage[inert]` 的隐藏」「欢迎层按钮可点」「`asset:` 占位符不被渲染成图片」「列表 404 必须抛错」。改样式或重构时它们会先响。
- `npm run test:unit`：59 条 Vitest，覆盖轨道计算、阅读时长、筛选、日期格式化、URL 生成等纯函数。
- `npm run lint`：0 error（保留 `react-hooks/exhaustive-deps` 的既有 warning）。

## 部署

静态产物 + 同源 API。history 路由需要 `try_files … /index.html`；带哈希的资源可以长期缓存（`immutable`），`index.html` 必须 `no-cache`。Nginx 片段、缓存头、上线检查见 [docs/DEPLOY.md](docs/DEPLOY.md)。

```bash
npm ci
VITE_SITE_URL=https://entroaxiom.com npm run build   # 产物在 dist/
```

## 可访问性与动效

- 弹层用 `useFocusTrap` + `inertBackground`（背景 `inert`，遮罩不参与），`Esc` 统一走同一个 hook；有跳转到正文的 SkipLink。
- 系统开启「减少动态效果」时，星系与星核只画静态一帧，动画与视差全部关闭。
- 欢迎层是进入站点的一次性过渡：放行后才会让 `.stage` 从 `inert` 中解除，键盘与读屏用户不会被困在背景里。

## 想改什么，去哪里改

- 站名、导航、文案：`src/config/site.ts`
- 五个天体（名称、颜色、轨道、背景色调）：`src/config/worlds.ts`
- 七条公理：`src/config/axioms.ts`
- 颜色、字体、间距：`src/styles/tokens.css`
- 黑洞与星云着色器：`src/components/sky/`
- 衬线字体 Entro Serif（分片加载）：`scripts/build-fonts.py`、`scripts/fonts/base-codepoints.txt`，产物在 `src/assets/fonts/entro-serif/` 与 `src/styles/fonts.css`
- 演示内容：`src/content/demo/`

## 文档

| 文件 | 内容 |
| --- | --- |
| [`docs/API.md`](docs/API.md) | 前台消费的公开接口与字段约定 |
| [`docs/DEPLOY.md`](docs/DEPLOY.md) | Nginx 片段、缓存策略、上线检查 |
| [`docs/FIX-20261101.md`](docs/FIX-20261101.md) | 上一轮修复记录 |

## 许可

个人站点自用代码，未附开源许可证；引用或复用请先联系作者。字体按各自许可分发（Entro Serif 源自 Noto Serif CJK，OFL；Cinzel / JetBrains Mono 由 `@fontsource` 提供）。
