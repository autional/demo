# demo

`demo.autional.com` / `demo.autional.cn` 的**演示单域入口**（Vercel 反向代理；项目 `demo` / `cn-demo`，同源双区：同一份代码、两个项目按环境变量分区域）。

本仓**不含任何业务代码**，只承载一个反向代理配置。

## 职责

```
浏览器 -> demo.autional.<区域域>/       （门户页，27 服务卡）
       -> demo.autional.<区域域>/<slug>/（各服务演示台，如 /session/、/storage/）
       -> Vercel rewrite（服务端转发，不改地址栏）
       -> 门户面：  ${DEMO_ORIGIN}/...                     （原样透传）
       -> 演示台：  https://<svc>-demo.${DEMO_SUBDOMAIN_BASE}/<page>
```

- 对外演示域名 = **`demo.autional.com`**（项目 `demo`）/ **`demo.autional.cn`**（项目 `cn-demo`）（Vercel，境外 -> 不触发 ICP）
- **单域路径化**：27 个演示台收敛为 `demo.autional.<区域域>/<slug>/`；内部目标仍是 `<svc>-demo.<域>` 子域，但只出现在**服务端转发目标**里，浏览器不可见，ingress / 服务侧路由零改造
- 门户面只代理所需路径（`/`、`/demos.html`、`/demo`、`/demo/*`、`/health`、`/ready`）；对外 API 面走区域 api 入口，本仓不重复暴露
- 原 27 个 `<svc>-demo.<域>` 子域**保留**为内部/调试入口（不再是对外卡片口径）

## 路由规则（`vercel.ts`）

### 每个 slug 三条规则（27 组）

| 规则 | 作用 |
|---|---|
| `redirect /<slug> -> /<slug>/`（301） | 裸前缀归一。若不归一，裸 `/<slug>` 会落进空捕获分支、上游收到 `/`，页面反向拿到**门户根**的 config/token（静默串服务） |
| `rewrite /<slug>/ -> https://<host>.<SUB>/<page>` | 精确命中 -> 演示台首页 |
| `rewrite /<slug>/:path+ -> https://<host>.<SUB>/:path+` | 子路径透传（`:path+` 要求 ≥1 段，结构上杜绝空捕获）；前缀在转发时被剥离，页面 base = `/<slug>/` |

### slug 映射表（`PAGES` 数组即唯一扩展点）

| slug | 内部主机 | 页面 |
|---|---|---|
| `identity` | `identity-demo` | `/identity-demo.html` |
| `profile` | `profile-demo` | `/profile-demo.html` |
| `tenant` | `tenant-demo` | `/tenant-demo.html` |
| `session` | `session-demo` | `/session-demo.html` |
| `mfa` | `mfa-demo` | `/mfa-demo.html` |
| `oauth` | `oauth-demo` | `/oauth-demo.html` |
| `config` | `config-demo` | `/config-demo.html` |
| `wallet` | `wallet-demo` | `/wallet-demo.html` |
| `point` | `point-demo` | `/point-demo.html` |
| `audit` | `audit-demo` | `/audit-demo.html` |
| `notification` | `notification-demo` | `/notification-demo.html` |
| `communication` | `communication-demo` | `/communication-demo.html` |
| `storage` | `storage-demo` | `/storage-demo.html` |
| `billing` | `billing-demo` | `/billing-demo.html` |
| `compliance` | `compliance-demo` | `/compliance-demo.html` |
| `status` | `status-demo` | `/status-demo.html` |
| `secret` | `secret-demo` | `/secret-demo.html` |
| `saml` | `saml-demo` | `/saml-demo.html` |
| `pay` | `pay-demo` | `/pay-demo.html` |
| `thirdparty` | `thirdparty-demo` | `/captcha-demo.html` |
| `verification` | `verification-demo` | `/verification-demo.html` |
| `rbac` | `rbac-demo` | `/rbac-demo.html` |
| `hash-standard` | `hash-standard-demo` | `/hash-demo.html` |
| `hash-sm` | `hash-sm-demo` | `/hash-demo.html` |
| `captcha3d` | `captcha3d-demo` | `/demo.html` |
| `stream` | `stream-demo` | `/stream-demo.html` |
| `gateway` | `gateway-demo` | `/gateway-demo.html` |

### gateway 根级映射组（页面零改动）

`gateway-demo.html` 的 `/docs`（Scalar 模板）、`/admin/`（React SPA）是**服务端渲染 + 根绝对引用**（`/scalar/*`、`/fonts/*`、`/assets/index-*.js`），页面相对化救不了；改为在入口域根加映射直通 `https://gateway-demo.<SUB>`。终版 7 条（打样实证后的裁剪结果）：

```
/docs  /docs/:path+  /search  /sdk/:path+  /csp-report  /developer/:path+  /bff/:path+
```

**裁剪记录**：`/admin/`、`/scalar/*`、`/fonts/*`、`/assets/*` 不映射 —— combined-bin 制品不含 gateway `web/` 静态树（旧子域同 404，存量非本次引入）。`/docs` 页 HTML 本身 200，但 Scalar 渲染依赖的 `/scalar/api-reference.js` 同样 404（存量缺口，已登记）。

> `/demos.html` 保持既有规则（回门户）；`/demo/*` 复用现有规则（源站提供同套 demokit 资源，全舰队一致，不新增规则）。

## 内容

| 文件 | 说明 |
|---|---|
| `vercel.ts` | 生成式规则：27×（redirect + 2 rewrite）+ gateway 根级组 7 条 + 门户面 6 条（`/`、`/demos.html`、`/demo`、`/demo/*`、`/health`、`/ready`） |
| `package.json` | 仅依赖 `@vercel/config`（`vercel.ts` 的运行时/类型） |
| `public/robots.txt` | 演示环境不索引（`Disallow: /`） |
| `LICENSE` | AGPL-3.0 |

## 配置

**源站地址与内部子域根均不入仓**，由环境变量提供（两个都 fail-closed）：

| 变量 | 作用域 | 示例值 | 缺失行为 |
|---|---|---|---|
| `DEMO_ORIGIN` | Production / Preview / Development | `https://<origin-host>`（内部源站，不带路径前缀） | 抛错，构建失败 |
| `DEMO_SUBDOMAIN_BASE` | Production / Preview | `autional.tianv.mobi`（demo 子域根，`<短名>-demo.<它>`） | 抛错，构建失败 |

未设置时 `vercel.ts` **故意抛错**（fail-closed），构建会失败 —— 这是刻意的，避免静默产出指向错误源站/错误子域的路由。

> ⚠️ 说明：`vercel.json` **不支持环境变量插值**，所以这里用的是 Vercel 官方的
> **`vercel.ts`（build-time 动态配置）**。二者**只能存在一个**。

## 约定

- 根路径 `/` 经 rewrite 呈现门户；`public/` 下**不要**放 `index.html`
  （Vercel 先查文件系统再走 rewrite，静态 index 会顶掉门户）。
- 源站/子域根变更只改环境变量、不改本仓；本仓变更 = 改代理路径面；**新增/删除服务 = 改 `PAGES` 数组**（唯一扩展点）。
- 通用坑（本仓两案实证）：Vercel `:path*` **空捕获会带斜杠**，叠加源站「尾斜杠 301 回无斜杠」= 重定向环；本仓以「redirect 前置 + 精确规则 + `:path+`」根治。改写规则前先读 `vercel.ts` 顶部注释。
- 演示台页面引用 `/demo/assets/*` 走既有规则；ui-demo（demokit）已相对化（`dk.request` 剥前导 `/`），一版兼容根挂载与前缀挂载两种形态。
- 改动本仓 = 改两区 `demo.autional.<区域域>` 的代理行为；改完 push 即自动部署（两个项目各自监听本仓 main）。
- 探针一律用 **GET**（源站静态页 HEAD 恒 404，`curl -I` 会假红）。

## 关联

- 同模式参照：`api` 仓（同为 env 化反代配置，两区同构）。
