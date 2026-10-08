import { routes, type VercelConfig } from '@vercel/config/v1';

/**
 * 演示门户入口 `demo.autional.com` / `demo.autional.cn` 的唯一源站（同源双区，同一份代码）。
 *
 * 值 **不写入本仓**，取自 Vercel 项目环境变量 `DEMO_ORIGIN`
 * （Project -> Settings -> Environment Variables）。
 * 未设置时 **故意抛错**（fail-closed），避免静默产出坏路由。
 *
 * 区域差异（源站 host / 内部子域根）全部由各项目环境变量承担。
 */
const rawOrigin = process.env.DEMO_ORIGIN;

if (!rawOrigin) {
  throw new Error(
    '[demo] 缺少环境变量 DEMO_ORIGIN（Vercel 项目设置里配置后重新部署）',
  );
}

const ORIGIN = rawOrigin.replace(/\/+$/, '');

/**
 * 演示台单域路径化的内部子域根（**不写死子域根**，同样 fail-closed）。
 *
 * `DEMO_SUBDOMAIN_BASE=autional.tianv.mobi`（示例） =>
 *   `/session/` 转发到 `https://session-demo.autional.tianv.mobi/session-demo.html`。
 * 内部子域根只出现在服务端转发目标里、浏览器不可见；对外域名 = demo.autional.com / demo.autional.cn。
 */
const rawSubBase = process.env.DEMO_SUBDOMAIN_BASE;

if (!rawSubBase) {
  throw new Error(
    '[demo] 缺少环境变量 DEMO_SUBDOMAIN_BASE（Vercel 项目设置里配置后重新部署）',
  );
}

const SUB = rawSubBase.replace(/^https?:\/\//, '').replace(/\/+$/, '');

/**
 * 27 组 slug 映射全集（此表即唯一扩展点）。
 *
 * 每条 slug 生成三条规则：
 *   redirect 裸 `/<slug>` -> `/<slug>/`（301）
 *     Vercel 匹配器**不会**自动归一尾斜杠（实测：source `/health` 不匹配请求 `/health/`）。
 *     若不 redirect：裸 `/<slug>` 会落进 `/<slug>/:path*` 的空捕获分支，上游收到 `/`，
 *     地址栏停 `/<slug>`、页面 base=`/`，页面反向拿到**门户根**的 config/token（静默串服务）。
 *   rewrite  `/<slug>/`       -> `https://<host>.<SUB>/<page>`（精确，直达演示台首页）
 *   rewrite  `/<slug>/:path+` -> `https://<host>.<SUB>/:path+`
 *     `:path+` 要求 ≥1 段，结构上杜绝空捕获（尾斜杠由上面的精确规则兜）。
 *     前缀在转发时被剥离 => 服务侧路由零改造；页面 base=`/<slug>/`。
 */
const PAGES = [
  { slug: 'identity', host: 'identity-demo', page: 'identity-demo.html' },
  { slug: 'profile', host: 'profile-demo', page: 'profile-demo.html' },
  { slug: 'tenant', host: 'tenant-demo', page: 'tenant-demo.html' },
  { slug: 'session', host: 'session-demo', page: 'session-demo.html' },
  { slug: 'mfa', host: 'mfa-demo', page: 'mfa-demo.html' },
  { slug: 'oauth', host: 'oauth-demo', page: 'oauth-demo.html' },
  { slug: 'config', host: 'config-demo', page: 'config-demo.html' },
  { slug: 'wallet', host: 'wallet-demo', page: 'wallet-demo.html' },
  { slug: 'point', host: 'point-demo', page: 'point-demo.html' },
  { slug: 'audit', host: 'audit-demo', page: 'audit-demo.html' },
  { slug: 'notification', host: 'notification-demo', page: 'notification-demo.html' },
  { slug: 'communication', host: 'communication-demo', page: 'communication-demo.html' },
  { slug: 'storage', host: 'storage-demo', page: 'storage-demo.html' },
  { slug: 'billing', host: 'billing-demo', page: 'billing-demo.html' },
  { slug: 'compliance', host: 'compliance-demo', page: 'compliance-demo.html' },
  { slug: 'status', host: 'status-demo', page: 'status-demo.html' },
  { slug: 'secret', host: 'secret-demo', page: 'secret-demo.html' },
  { slug: 'saml', host: 'saml-demo', page: 'saml-demo.html' },
  { slug: 'pay', host: 'pay-demo', page: 'pay-demo.html' },
  { slug: 'thirdparty', host: 'thirdparty-demo', page: 'captcha-demo.html' },
  { slug: 'verification', host: 'verification-demo', page: 'verification-demo.html' },
  { slug: 'rbac', host: 'rbac-demo', page: 'rbac-demo.html' },
  { slug: 'hash-standard', host: 'hash-standard-demo', page: 'hash-demo.html' },
  { slug: 'hash-sm', host: 'hash-sm-demo', page: 'hash-demo.html' },
  { slug: 'captcha3d', host: 'captcha3d-demo', page: 'demo.html' },
  { slug: 'stream', host: 'stream-demo', page: 'stream-demo.html' },
  { slug: 'gateway', host: 'gateway-demo', page: 'gateway-demo.html' },
];

const slugRedirects = PAGES.map(({ slug }) =>
  routes.redirect(`/${slug}`, `/${slug}/`, { statusCode: 301 }),
);

const slugRewrites = PAGES.flatMap(({ slug, host, page }) => [
  routes.rewrite(`/${slug}/`, `https://${host}.${SUB}/${page}`),
  routes.rewrite(`/${slug}/:path+`, `https://${host}.${SUB}/:path+`),
]);

/**
 * gateway 演示台的**根级映射组**（页面零改动）：入口域根下的下列路径直通
 * `https://gateway-demo.<SUB>`。这些路径本就已对外暴露（原 gateway-demo 子域同款面），
 * 等价搬入单域入口；其中 `/docs`（Scalar 模板）与 `/admin/`（React SPA）是服务端渲染 +
 * 根绝对引用（`/scalar/*`、`/fonts/*`、`/assets/index-*.js`），页面相对化救不了。
 *
 * 裁剪记录（打样实证，云端 origin 404）：`/fonts/*`、`/scalar/*`、`/admin/*`、`/assets/*`
 * —— combined-bin 制品不含 gateway web/ 静态树（旧子域同样 404，非本此改造引入），
 * 故不映射。`/docs` 页 HTML 本身 200（可直接打开），但 Scalar 渲染依赖的
 * `/scalar/api-reference.js` 一并 404（存量缺口，已登记）。
 */
const gatewayRootRewrites = [
  routes.rewrite('/docs', `https://gateway-demo.${SUB}/docs`),
  routes.rewrite('/docs/:path+', `https://gateway-demo.${SUB}/docs/:path+`),
  routes.rewrite('/search', `https://gateway-demo.${SUB}/search`),
  routes.rewrite('/sdk/:path+', `https://gateway-demo.${SUB}/sdk/:path+`),
  routes.rewrite('/csp-report', `https://gateway-demo.${SUB}/csp-report`),
  routes.rewrite('/developer/:path+', `https://gateway-demo.${SUB}/developer/:path+`),
  routes.rewrite('/bff/:path+', `https://gateway-demo.${SUB}/bff/:path+`),
];

/**
 * 门户面（既有）：只代理门户所需路径（**最小暴露面**，不做全量透传）：
 *   /            -> 门户页（27 服务卡）
 *   /demos.html  -> 门户页直链
 *   /demo/*      -> 门户静态资源与演示 API（assets / api/config / api/demo-tokens）
 *   /health      -> 门户状态带探活（SYSTEM ACTIVE / API ERROR）
 *   /ready       -> 门户同源存活探针
 *
 * 规则顺序：先门户面（具体路径），再 slug 组，最后 gateway 根级组（`/bff/*` 等泛前缀
 * 放最后，避免先于更具体的规则命中）。对外 API 面走区域 api 入口（`api` / `cn-api` 项目），
 * 本仓不重复暴露。
 */
export const config: VercelConfig = {
  redirects: [...slugRedirects],
  rewrites: [
    routes.rewrite('/', `${ORIGIN}/demos.html`),
    routes.rewrite('/demos.html', `${ORIGIN}/demos.html`),
    // 裸 /demo 须在通配前精确透传：否则 /demo/:path* 空捕获被展开成 ${ORIGIN}/demo/，
    // 上游对 /demo/ 回 301 Location:/demo（相对跳转），浏览器回到原点成死循环。
    routes.rewrite('/demo', `${ORIGIN}/demo`),
    routes.rewrite('/demo/:path*', `${ORIGIN}/demo/:path*`),
    routes.rewrite('/health', `${ORIGIN}/health`),
    routes.rewrite('/ready', `${ORIGIN}/ready`),
    ...slugRewrites,
    ...gatewayRootRewrites,
  ],
};
