# entroaxiom · 前端 v3「星仪」

> 在无序的熵变中，确立世界的公理。

一座私人星仪：每个栏目都是一颗有自己颜色的天体，围绕背景里的 WebGL 黑洞公转。
Vite + React 18 + TypeScript；主要依赖：`react-router-dom`、Markdown 渲染链（`react-markdown` + remark / rehype + KaTeX）、`@radix-ui/react-dialog`（欢迎层），以及两套开源字体（`@fontsource/cinzel` 拉丁铭文、`@fontsource/jetbrains-mono` 数据读数）；衬线字体 Entro Serif 随仓库自带。

## 栏目与天体

| 路径 | 栏目 | 天体 / 色相 | 交互 |
|---|---|---|---|
| `/` | 星仪 | 黑洞 | 星盘欢迎层 → 可悬停的太阳系仪（点行星进入栏目）、今日神谕牌、随笔余烬条、笔记账簿、书影音、留言彗星跑马灯、规模读数 |
| `/essays` `/essays/:id` | 随笔 | 余烬 · 橙 `#ef8456` | 按年份的火星时间线；详情为书信体（首字下沉、心境/地点、落款） |
| `/notes` `/notes/:id` | 学习笔记 | 冰卫星 · 青 `#9fd6e0` | 冰晶卡片网格；详情含目录、阅读进度、KaTeX、图片灯箱 |
| `/shelf` | 书影音 | 气态巨星 · 紫 `#ab93ff` | 书/影/音光谱切换，「航行中」轨道，程序化星云封面墙，侧抽屉详情（`?item=`） |
| `/files` `/files/:id` | 文件库 | 陨石带 · 金 `#e9bd5e` | 质量光谱条、陨石图标、按大小排序 |
| `/guestbook` | 留言区 | 彗星 · 青绿 `#72e0b9` | 选择行星星符留言，留言以彗星落下；草稿自动保存；站长回复 |
| `/atlas` | 星图 | 玫瑰 | 极坐标星图（角度=栏目，半径=时间，越新越近中心），悬停连出同标签星座；时间轴、标签星云视图 |
| `/axioms` | 公理 | 金 | 七张可翻转的塔罗牌 + 空着的第八张 |
| `Ctrl/⌘ K` 或 `/` | 检索星空 | — | 全站搜索面板 |

页脚有按当天计算的月相。

## 运行

```bash
npm ci
npm run dev:demo     # 不需要后端，使用演示内容
npm run dev          # 对接 http://127.0.0.1:8000（/api /uploads 由 Vite 代理）
npm test             # test:regress（node:test 回归）+ test:unit（Vitest 单元测试）
npm run lint         # ESLint
npm run format:check # Prettier 检查（npm run format 会改写文件）
npm run build        # 类型检查 + 构建（正式构建会自动剔除 dist/demo-assets）
npm run build:demo
```

## 后端

见 [docs/API.md](docs/API.md)：essays / notes / files / shelf / guestbook 五组公开接口与字段约定。
旧版的「文章总结」与站内控制台已移除；内容管理与留言审核交给独立后台。

## 部署

静态产物 + 同源 API，history 路由需要 `try_files … /index.html`，带哈希的资源可以长期缓存、`index.html` 不缓存。Nginx 示例与上线后的待办见 [docs/DEPLOY.md](docs/DEPLOY.md)。

## 想改什么，去哪里改

- 站名、导航、文案：`src/config/site.ts`
- 五个天体（名称、颜色、轨道、背景色调）：`src/config/worlds.ts`
- 七条公理：`src/config/axioms.ts`
- 颜色、字体、间距：`src/styles/tokens.css`
- 黑洞与星云着色器：`src/components/sky/`
- 衬线字体 Entro Serif（分片加载）：`scripts/build-fonts.py`、`scripts/fonts/base-codepoints.txt`，产物在 `src/assets/fonts/entro-serif/` 与 `src/styles/fonts.css`
- 演示内容：`src/content/demo/`
