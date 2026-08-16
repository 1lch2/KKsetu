# KKSetu

[English](./README_EN.md)

KKSetu 是一个基于 React、TypeScript 和 Cloudflare Pages
Functions 构建的无服务器图片提取工具。它可以提取小红书和公开森空岛帖子的原图，也可以读取 TXT 文件中的 Base64 编码图片。

## 功能

- **小红书原图提取**：支持通过分享内容、完整 URL 或 `xhslink.com` 短链接提取小红书帖子原图
- **森空岛原图提取**：支持从公开的 `skland.com` 帖子链接中提取静态原图
- **HEIC 转换**：自动检测 HEIC/HEIF 图片，并在浏览器中将其转换为 PNG
- **Cookie 支持**：对于需要登录状态的帖子，可以选择提供小红书 Cookie
- **TXT 图片提取**：从 TXT 文件中读取 Base64 编码图片的旧版工具，完全在客户端运行

## 技术栈

- **前端**：React 19、TypeScript、React Router DOM、TanStack Query
- **样式**：原生 CSS
- **后端**：Cloudflare Pages Functions
- **构建工具**：Webpack

## 路由

- `/` - 提取小红书原图
- `/skland` - 提取公开森空岛帖子原图
- `/obfuscate` - 本地图片混淆
- `/extract` - 从 TXT 文件中提取图片

## 安装与运行

### 1. 安装依赖

```bash
npm install
```

### 2. 本地开发

项目提供两种开发服务器，两者的用途**不能互相替代**：

```bash
# 仅启动前端（webpack-dev-server），地址为 http://localhost:3000
# 此方式不会提供 Pages Functions，因此小红书 API 请求会失败。
# 仅用于 UI 开发或客户端 TXT 图片提取功能。
npm start
```

```bash
# 启动前端和 Pages Functions（wrangler pages dev），默认地址为 http://localhost:8788
# 此方式同时提供 UI 和 functions/ 接口，用于调试完整流程。
npm run dev
```

### 3. 生产构建

```bash
npm run build
```

### 4. 测试

```bash
npm test -- --run
```

森空岛在线测试默认不运行，启用后会请求四个固定的公开帖子。在 PowerShell 中执行：

```powershell
$env:RUN_SKLAND_LIVE_TESTS='1'
npm test -- --run tests/skland.live.test.ts
```

### 5. 部署到 Cloudflare Pages

```bash
npx wrangler pages deploy
```

公开开放接口前，请根据预览环境中观察到的延迟和正常使用量，为 `/api/fetchSklandImageUrls`
配置 Cloudflare 限流规则。

## API 接口

所有接口均为 `/api` 路径下的 Cloudflare Pages Functions。

- `GET /api/parseXhsShort?content=<分享内容>`：将 `xhslink.com` 短链接解析为完整的 `xiaohongshu.com`
  URL。响应：`{ "fullLink": string }`

- `POST /api/fetchXhsImageUrls`：在服务端请求帖子页面，提取
  `window.__INITIAL_STATE__`，并返回原图 URL。请求体：`{ "postId": string, "xsecToken": string, "cookie"?: string }`
  响应：`{ "images": string[], "title": string }`

- `GET /api/getXhsSourceImage?url=<图片 URL>`：代理图片二进制数据以绕过 CDN 的 CORS 限制。客户端通过响应的
  `Content-Type` 判断图片是否为 HEIC/HEIF。

- `POST /api/fetchSklandImageUrls`：接收一个受支持的公开森空岛帖子 URL，并返回静态原图 URL。请求体：`{ "url": "https://www.skland.com/article?id=<id>" }`
  响应：`{ "articleId": string, "title"?: string, "images": string[] }`

## 小红书原图提取流程

1. 解析粘贴的分享内容：先通过 `/api/parseXhsShort` 还原 `xhslink.com` 短链接，再从完整 URL 中提取
   `postId` 和 `xsec_token`。
2. `POST /api/fetchXhsImageUrls` 在服务端请求帖子页面，使用 PC
   User-Agent，并在用户提供时携带 Cookie，然后从页面内嵌的 `__INITIAL_STATE__` 中提取原图 URL。
3. 每张图片通过 `/api/getXhsSourceImage` 加载，以绕过 CDN 的 CORS 限制。如果响应为 HEIC/HEIF，则通过
   `heic2any` 在浏览器中转换为 PNG。

## 森空岛原图提取流程

Pages Function 会严格解析帖子 ID，并且只请求固定的数美和森空岛上游域名。

它先生成一个短期匿名设备 ID，再刷新请求令牌、为帖子请求签名，最后从 `imageListSlice`
中读取静态图片。只有 `bbs.hycdn.cn`
图片 URL 的查询参数会被移除。不支持登录、私密内容、视频提取或批量抓取。上游协议并未公开，可能随时发生变化。

## 故障排查

### 构建错误

如果 TypeScript 编译失败：

1. 检查 `tsconfig.json` 配置
2. 确认所有依赖均已安装：`npm install`
3. 确认 webpack 配置包含 `.ts` 和 `.tsx` 扩展名
4. 检查类型错误：`npx tsc --noEmit`

### Cloudflare 部署问题

如果 Cloudflare Pages 部署失败：

1. 确认已安装 `wrangler`：`npm install -D wrangler`
2. 检查 `wrangler.json` 配置
3. 确认 Cloudflare 账号已连接：`wrangler login`

## 开发说明

- 所有组件均使用 TypeScript 编写
- 使用 TanStack Query 管理数据请求和请求状态
- 组件目录中的内部组件放在 `__internal__/` 子目录下
- Webpack 配置了路径别名：`@components`、`@utils`、`@hooks`、`@styles`、`@types`、`@`

## 浏览器支持

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## 许可证

KKSetu 的原创代码采用 [PolyForm Noncommercial License 1.0.0](./LICENSE)
许可。仅允许出于非商业目的使用、修改和分发，禁止商业用途。

第三方组件继续遵循各自的许可证。森空岛协议实现使用了采用 MIT 许可证的
[`mima-kit`](https://github.com/RSoraM/mima-kit) 0.1.3，详情参见
[`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)。
