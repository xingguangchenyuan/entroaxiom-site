# 前端对接后端补丁（第 2 版）

把本目录里的文件**覆盖合并**到 entroaxiom-site 项目对应位置（不要整个替换文件夹）：

- src/content/api.ts          新增：调用后端 /api/public/*（只走同源 /api，没有可配置的 API 地址）
- src/content/loader.ts       改写：official 走 API，demo 走本地演示数据
- src/content/localSource.ts  新增：演示数据逻辑（仅 demo 模式加载）。可见性规则与后端一致：只展示 public 且 published
- src/content/types.ts        新增 Status 类型与 status 字段
- src/content/demo/**/*.md    7 篇演示内容的 frontmatter 增加 `status: published`（否则会被新规则过滤掉）
- src/components/list/DemoBadge.tsx  修复：「演示内容」徽标之前在正式内容上也会显示，现在只在 demo 模式显示
- vite.config.ts              开发时把 /api、/uploads 代理到 127.0.0.1:8000
- .env.example                说明：正式部署使用同源 API，不需要也不支持设置 API 地址

可选清理：src/content/files.ts、src/content/notes/、src/content/summaries/ 不再被使用，可以删除。
自己新写演示内容时，frontmatter 里必须同时有 `visibility: public` 和 `status: published`。

验证：先启动后端（见 entroaxiom-backend/README.md），再 `npm run dev`；
演示模式不需要后端：`npm run dev:demo`。
