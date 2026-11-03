# 部署说明（静态站 + 同源 API）

前端是纯静态产物（`npm run build` → `dist/`），用 history 路由，所以服务器必须做到三件事：

1. **所有未知路径回退到 `index.html`**（否则直接打开或刷新 `/essays/xxx` 会 404）；
2. **`/api`、`/uploads` 转发给后端**（前端只请求同源地址，不支持跨域 API）；
3. **缓存头分两类**：带哈希的资源长期缓存，`index.html` 不缓存。

## Nginx 示例

下面是通用写法，域名、路径、后端端口按你的环境改。我没有看到你现有的 Nginx 配置，合并时请以它为准。

```nginx
server {
    listen 80;
    server_name example.com;

    root /var/www/entroaxiom/dist;
    index index.html;

    # 后端：公开接口与上传文件（同源转发）
    location /api/     { proxy_pass http://127.0.0.1:8000; }
    location /uploads/ { proxy_pass http://127.0.0.1:8000; }

    # Vite 产物：文件名带内容哈希，内容变了名字就变，可以放心长期缓存
    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;          # 缺文件时返回 404，而不是回退成 index.html（避免把 HTML 当成 JS 缓存）
    }

    # 入口 HTML：每次都要拿最新的，才能引用到新的哈希文件
    location = /index.html {
        add_header Cache-Control "no-cache";
    }

    # 其余路径：有对应静态文件就返回它（favicon.svg、robots.txt…），否则交给前端路由
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    # 如果装了 brotli 模块，同样的类型再开 brotli 会更小
}
```

说明：

- `font` 文件（`dist/assets/*.woff2`）也在 `/assets/` 下，会一起长期缓存。字体按 `unicode-range` 分片，页面用到哪一段才下载哪一个。
- 部署新版本时先上传 `assets/`，再替换 `index.html`，这样老用户在切换的几秒内不会拿到指向已删除文件的 HTML。
- 正式构建（`npm run build`）会自动把 `demo-assets/` 从 `dist/` 里删掉；`npm run build:demo` 则保留。

## 上线后建议补的几项

- **分享卡片**：`og:image` / `twitter:image` 必须是带域名的绝对地址，所以在构建时用环境变量 `VITE_SITE_URL`（例如 `https://example.com`，只写协议 + 域名）填进 `index.html`；没设置的话产物里不会输出这两个标签，构建时会打印警告。运行时的 `canonical` / `og:url` 也用同一个域名（没设置则回退到当前访问的域名）。注意微信 / X / Slack 的分享抓取器不执行 JS，所有页面分享出去都是首页那张卡片；要每页不同需要预渲染或让 Nginx / 后端按路由输出 meta。404 与「内容不存在」页会加 `noindex`。
- **sitemap**：`public/robots.txt` 里留了 `Sitemap:` 的提示。sitemap 要列出每篇随笔 / 笔记，需要由后端按列表接口生成。
- **随笔在微信 / X 里的预览**：这些爬虫不执行 JS，读不到每页各自的标题和摘要。要做到这点需要预渲染（构建期生成静态 HTML），或者在 Nginx 层给内容页注入 meta；目前没有做。
