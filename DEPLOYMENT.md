# Vercel + Supabase 免费上线指南

本文档用于把 `pet-care-next` 部署到 Vercel Hobby 免费版，并使用一个新的 Supabase Free 项目作为生产数据库。

## 1. 上线前检查

1. 确认 `.env.local` 没有提交到 Git。
2. 确认 `.env.example` 只包含占位符，不包含真实数据库密码、项目引用或员工密码。
3. 如果真实 Supabase 连接串曾经提交、截图或分享过，先在 Supabase 重置数据库密码，再继续上线。
4. 本地执行检查：

```bash
npm run lint
npm run build
```

如果 `npm run build` 在 macOS 上因为 Next SWC 二进制签名失败，可先重新安装依赖后复验。项目禁止批量删除目录；需要清理 `node_modules` 时请由项目维护者手动处理，或直接以 Vercel Linux 构建日志作为最终判断。

## 2. 创建 Supabase 生产项目

1. 在 Supabase 新建 Free 项目，区域优先选择离主要用户更近的亚太区域。
2. 在 Supabase Dashboard 获取 Session Pooler 连接串。
3. 在本地 `.env.local` 写入生产连接串：

```bash
SUPABASE_SESSION_POOLER_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres"
POSTGRES_SSL="true"
STAFF_SESSION_SECRET="<至少 32 字节的随机长字符串>"
```

4. 初始化数据库结构：

```bash
npm run appointments:schema
npm run staff:schema
```

5. 在 Supabase Table Editor 或 SQL Editor 确认以下表存在：`appointments`、`customers`、`pets`、`follow_ups`、`staff_users`、`staff_login_attempts`。
6. 确认这些表已启用 RLS，且没有给 `anon` 或 `authenticated` 开放直接表权限。

## 3. 创建首个员工账号

生成一个强密码，只在线下保存给管理员。不要把初始密码配置到 Vercel。

```bash
npm run staff:create -- --username staff --password "<强密码>" --name "泡泡爪管理员" --role admin
```

首次登录后，建议到 `/staff/password` 修改密码。

## 4. 部署到 Vercel

1. 将代码推送到 GitHub。
2. 在 Vercel 新建项目并导入该 GitHub 仓库。
3. Framework Preset 选择 `Next.js`。
4. Build Command 使用默认值 `npm run build`。
5. 在 Vercel Project Environment Variables 中配置：

```bash
SUPABASE_SESSION_POOLER_URL=<Supabase Session Pooler 连接串>
POSTGRES_SSL=true
STAFF_SESSION_SECRET=<至少 32 字节的随机长字符串>
```

不要在 Vercel 配置 `STAFF_SEED_USERNAME`、`STAFF_SEED_PASSWORD`、`STAFF_SEED_DISPLAY_NAME` 或 `STAFF_SEED_ROLE`。

## 5. 上线验收

前台验收：

1. 打开首页，确认图片、导航、服务、流程、套餐、环境轮播、评价和到店信息显示正常。
2. 提交快速预约，确认显示“预约已记录，我们会尽快联系您确认时间。”。
3. 提交完整预约，确认接口成功且表单重置。

后台验收：

1. 未登录访问 `/staff` 和 `/staff/appointments`，应跳转到 `/staff/login?from=...`。
2. 使用管理员账号登录，确认可以进入 `/staff`。
3. 打开 `/staff/appointments?view=today`，确认今日视图正常。
4. 后台手动新增预约，确认出现在今日或本周看板。
5. 修改预约状态、改约日期或时段、保存员工备注，刷新后确认数据仍保留。
6. 退出登录后确认后台页面重新要求登录。

生产日志验收：

1. 在 Vercel Deployments 中确认构建成功。
2. 在 Vercel Function Logs 中确认没有 `Missing SUPABASE_SESSION_POOLER_URL or DATABASE_URL`。
3. 确认没有数据库 SSL 或连接超时错误。

## 6. 免费额度注意事项

- Vercel Hobby 适合个人学习项目和低流量门店展示页。
- Supabase Free 数据库大小限制为 500 MB，早期预约管理通常足够。
- Supabase Free 项目可能因长期无访问被暂停；正式稳定营业后再考虑升级 Supabase Pro。
- 第一版可以先使用 Vercel 的 `*.vercel.app` 域名，自定义域名后续再接入。
