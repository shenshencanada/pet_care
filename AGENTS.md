# 项目说明

## 使用者背景

- 使用者叫 shen。
- 这个项目主要用来学习 Codex 编程。

## 项目定位

- 项目名：`pet-care-next`。
- 当前内容是一个中文宠物洗护门店单页网站，品牌名为“泡泡爪宠物洗护”。
- 页面面向猫狗洗护、美容修剪、护理套餐展示和到店预约。
- 网站文案、表单、导航和页面语言都以中文为主。

## 技术栈

- 使用 Next.js App Router。
- 使用 React 和 TypeScript，`tsconfig.json` 开启了 `strict`。
- 样式使用 Tailwind CSS，并在 `app/globals.css` 中通过 `@layer base` 和 `@layer components` 写组件样式。
- 图标使用 `lucide-react`。
- 图片组件使用 `next/image`。
- 远程图片主要来自 Unsplash，`next.config.ts` 已允许 `images.unsplash.com`。

## 常用命令

- `npm run dev`：启动本地开发服务器。
- `npm run build`：构建生产版本。
- `npm run start`：启动生产构建。
- `npm run lint`：运行 ESLint 检查。
- `npm run appointments:schema`：创建或更新 Supabase 中的预约管理相关表。
- `npm run staff:schema`：创建或更新 Supabase 中的员工登录相关表。
- `npm run staff:create`：创建或更新员工账号，密码会自动写入哈希。

## 目录与关键文件

- `app/page.tsx`：主页面实现，包含导航、首屏、快速预约、服务、流程、套餐、环境轮播、评价轮播、到店信息、预约表单和内嵌 SVG 地图。
- `app/layout.tsx`：页面根布局和元数据，语言为 `zh-CN`。
- `app/globals.css`：全局样式、Tailwind 组件样式和响应式布局。
- `tailwind.config.ts`：项目颜色、阴影、圆角和字体配置。
- `next.config.ts`：Next 配置，目前主要配置远程图片域名。
- `eslint.config.mjs`：使用 Next Core Web Vitals 和 TypeScript ESLint 配置。
- `middleware.ts`：保护 `/staff` 和 `/staff/*` 后台路由，未登录时跳转到员工登录页。
- `app/staff/login/page.tsx`：员工登录页，包含账号、密码和“记住我”选项。
- `app/staff/page.tsx`：员工后台首页，展示当前员工和后台功能入口占位。
- `app/staff/appointments/page.tsx`：员工预约管理页面，展示今日视图、本周日历看板、状态筛选和周切换。
- `app/staff/appointments/AppointmentCalendarBoard.tsx`：预约日历看板客户端组件，支持手动新增预约、查看详情、更新状态和员工备注。
- `app/api/appointments/route.ts`：前台预约提交接口，写入 `public.appointments` 表。
- `app/api/staff/appointments/route.ts`：员工预约列表和新增接口，按日期范围和状态查询预约，也支持后台手动录入预约。
- `app/api/staff/appointments/[id]/route.ts`：员工更新单条预约状态和员工备注的接口。
- `app/api/staff/login/route.ts`：员工登录接口，查询数据库员工账号、校验密码哈希、写入登录 Cookie，并处理失败锁定。
- `app/api/staff/logout/route.ts`：员工退出接口，清除员工登录 Cookie 并跳转回登录页。
- `app/staff/password/page.tsx`：员工修改密码页面，要求已登录员工访问。
- `app/staff/password/ChangePasswordForm.tsx`：员工修改密码表单，提交当前密码和新密码。
- `app/api/staff/password/route.ts`：员工修改密码接口，校验当前密码后写入新的密码哈希。
- `app/staff/admin/users/page.tsx`：管理员工账号页面，只有 `admin` 角色可用。
- `app/staff/admin/users/AdminUsersPanel.tsx`：员工账号管理表单和操作面板。
- `app/api/staff/users/route.ts`：管理员获取员工列表和创建员工账号的接口。
- `app/api/staff/users/[id]/route.ts`：管理员更新员工角色或启用状态的接口。
- `app/api/staff/users/[id]/reset-password/route.ts`：管理员重置其他员工密码的接口。
- `lib/staff-auth.ts`：从员工 Cookie 读取会话后重新查询数据库，确认账号启用状态和最新角色。
- `lib/staff-session.ts`：员工登录 Cookie 名称、会话时长、签名和校验逻辑。
- `lib/staff-password.ts`：员工密码哈希和校验逻辑，使用带盐 `pbkdf2_sha256`。
- `lib/appointments.ts`：预约状态、状态文案、预约时段和预约视图类型。
- `lib/db.ts`：Postgres 连接池复用工具，优先读取 `SUPABASE_SESSION_POOLER_URL`，其次读取 `DATABASE_URL`。
- `database/appointments.sql`：预约管理表、索引、状态约束、更新时间触发器、旧表字段迁移逻辑，以及 RLS 和 Data API 权限加固。
- `database/staff-users.sql`：员工账号表、登录失败记录表及相关索引、更新时间触发器，以及 RLS 和 Data API 权限加固。
- `scripts/apply-appointments-schema.mjs`：执行 `database/appointments.sql` 的建表或迁移脚本。
- `scripts/apply-staff-schema.mjs`：执行 `database/staff-users.sql` 的建表脚本。
- `scripts/create-staff-user.mjs`：创建或更新员工账号的脚本。
- `public/assets/`：页面实际引用的本地门店环境图片。
- `assets/`：保留了一份相同的门店图片资源。
- `index.html`：静态 HTML 版本，内容和视觉风格与 Next 页面接近，可视为原型或备份，不是当前 Next 应用的主入口。

## 页面功能

- 顶部固定导航，移动端有菜单展开状态。
- 首屏使用宠物洗护背景图，并提供预约按钮和电话按钮。
- 快速预约表单定位为首屏低门槛留资入口，只要求客户填写手机号、宠物、日期、时段和可选备注，提交到 `/api/appointments` 后重置，并显示“预约已记录，我们会尽快联系您确认时间。”提示。
- 完整预约表单会要求填写联系人和手机号，并把宠物、套餐、日期、时段和备注写入预约表。
- 服务区展示基础洁净洗护、猫咪低压护理、造型修剪。
- 流程区展示到店评估、分区清洁、彻底吹干、交付反馈。
- 套餐区展示轻盈洁净、全身精护、造型焕新三个价位。
- 环境区使用本地图片轮播，支持上一张、下一张和圆点切换。
- 评价区使用 CSS 动画做横向自动滚动，悬停时暂停。
- 到店区展示地址、营业时间、微信号、地图插画和完整预约表单。

## 预约管理功能

- 预约数据保存在 Supabase Postgres 的 `public.appointments` 表中。
- 前台快速预约和完整预约都会通过 `POST /api/appointments` 创建预约记录。
- 员工后台可以通过 `POST /api/staff/appointments` 手动新增预约，来源 `source` 记为 `staff`，中文展示为“后台录入”。
- 预约来源 `source` 固定支持 `quick`、`full`、`staff`，分别对应快速预约、完整预约、后台录入。
- 新预约默认状态为 `pending`，中文显示为“待确认”。
- 预约状态固定支持 `pending`、`confirmed`、`arrived`、`completed`、`canceled`，分别对应“待确认、已确认、已到店、已完成、已取消”。
- 预约时段当前固定为 `10:30`、`14:00`、`17:30`。
- 同一日期和时段允许保存多条预约，不做强制冲突拦截，由员工后台人工确认。
- 员工预约管理页地址为 `/staff/appointments`，`admin` 和 `staff` 角色员工都可以访问，默认展示今日视图。
- 员工可在预约管理页点击“新增预约”录入电话、微信或到店现场预约；手机号、宠物类型、预约日期和预约时段必填，默认状态为 `confirmed`。
- 未登录访问 `/staff/appointments` 会跳转到 `/staff/login?from=/staff/appointments`。
- 预约管理页支持 `view=today | week` 查询参数；未传或传 `view=today` 时展示今日视图，`view=week` 时展示本周看板。
- 预约管理页支持 `q` 查询参数搜索近期预约，默认覆盖过去 30 天到未来 90 天，可按联系人、手机号、宠物类型、套餐、客户备注和员工备注模糊匹配，最多显示 50 条。
- 今日视图按时段分组展示当天预约，固定显示 `10:30`、`14:00`、`17:30` 三个时段；每个时段显示预约总数和各状态小计，时段内按状态优先级和创建时间排序。
- 本周看板支持上一周、下一周、回到本周和按状态筛选。
- 桌面端按日期列和时段行展示预约卡片，移动端按日期纵向展示预约列表。
- 预约卡片会展示状态、时段、联系人或快速预约客户、手机号、宠物类型、套餐和客户备注摘要。
- 预约卡片支持快捷状态按钮：待确认可直接确认或取消，已确认可标记到店或取消，已到店可标记完成或取消。
- 点击预约卡片可以查看详情、修改状态、改约日期和时段、填写员工备注并保存。
- 员工回访快速预约客户后，可以在预约详情中补充或修正联系人称呼、手机号码和套餐选择；完整预约也复用这套编辑能力，方便纠错。
- 后台可选套餐固定为“轻盈洁净、全身精护、造型焕新”，对应共享常量 `APPOINTMENT_PACKAGES`。
- 员工备注只在后台展示，不返回给前台客户。
- 员工手动新增预约时可以同时填写客户备注和员工备注，员工备注仍只在后台展示。
- 员工更新预约会调用 `PATCH /api/staff/appointments/[id]`，支持保存联系人、手机、套餐、预约日期、预约时段、状态和员工备注，并记录最后处理员工。
- 员工后台首页 `/staff` 的“预约管理”卡片会跳转到 `/staff/appointments?view=today`，并展示今日待确认和已确认数量。

## 员工登录功能

- 员工登录页地址为 `/staff/login`，员工后台首页地址为 `/staff`。
- 员工账号来自 Supabase Postgres 的 `public.staff_users` 表，不再使用 `.env.local` 中的明文员工账号作为真实登录来源。
- 员工密码使用带盐 `pbkdf2_sha256` 哈希保存，登录时通过 `lib/staff-password.ts` 校验。
- 登录成功后写入 `HttpOnly Cookie`，Cookie 名为 `pet_care_staff_session`。
- 普通登录会话有效期为 8 小时，勾选“记住我”后有效期为 30 天。
- 未登录访问 `/staff` 或 `/staff/*` 时，会跳转到 `/staff/login?from=...`。
- 登录成功后只允许跳回 `/staff` 或 `/staff/...`，非法跳转地址会回到 `/staff`。
- 退出登录通过 `POST /api/staff/logout` 清除 Cookie，并跳转回 `/staff/login`。
- 已登录员工可以在 `/staff/password` 修改自己的登录密码。
- 修改密码时需要输入当前密码，新密码至少 8 位，并会写入新的 `pbkdf2_sha256` 哈希。
- 修改密码成功后会清除当前员工登录 Cookie，并跳转回 `/staff/login` 要求重新登录。
- `admin` 角色员工可以从员工后台进入 `/staff/admin/users` 管理员工账号。
- 管理员可以新增员工、停用或启用其他员工、调整其他员工角色、重置其他员工密码。
- 普通 `staff` 角色不能访问员工管理页面，也不能调用员工管理 API。
- 员工管理页面和 API 会通过 `lib/staff-auth.ts` 重新查询 `public.staff_users`，不只依赖 Cookie 中的旧角色。
- 管理员不能在员工管理页停用自己、把自己降级为普通员工，或重置自己的密码；自己的密码需要走 `/staff/password`。
- 员工账号被停用后，旧登录 Cookie 会在下一次访问后台页面或调用员工 API 时被清除，并要求重新登录；页面侧通过 `/api/staff/session/clear` 清理 Cookie。
- 员工登录失败记录保存在 `public.staff_login_attempts` 表中。
- 同一账号和 IP 组合连续 5 次登录失败后，会锁定 10 分钟；锁定期间即使用正确密码也不能登录。
- 当前员工角色字段支持 `admin` 和 `staff`，已写入会话中；预约管理对两种角色都开放，员工账号管理仅 `admin` 可用。

## 数据库与安全

- 当前业务表保留在 Supabase Postgres 的 `public` schema 中，但敏感表必须做 Data API 加固。
- `public.appointments`、`public.staff_users`、`public.staff_login_attempts` 已开启 Row Level Security（RLS）。
- 上述三张表已撤销 `anon` 和 `authenticated` 的表级权限，避免浏览器端通过 Supabase Data API 直接访问客户预约、员工账号、密码哈希或登录失败记录。
- 当前项目的数据库读写由 Next.js 服务端通过 `lib/db.ts` 的 `pg` 连接池完成，优先读取 `SUPABASE_SESSION_POOLER_URL`，其次读取 `DATABASE_URL`。
- 不要在浏览器端使用 Supabase client 直接查询或修改 `appointments`、`staff_users`、`staff_login_attempts`。
- 除非有明确前台 Data API 访问需求，不要为 `anon` 或 `authenticated` 创建这些敏感表的 RLS policy。
- 新增包含客户信息、员工信息、登录安全信息或后台管理数据的表时，需要在对应 SQL 脚本中同步开启 RLS，并撤销 `anon`、`authenticated` 的直接表权限。

## 设计风格

- 整体是温暖、干净、偏精品宠物店的视觉风格。
- 主色包括墨绿、青绿、珊瑚色、米白和金色。
- 卡片圆角统一使用 `8px`，对应 Tailwind 自定义的 `rounded-card`。
- 页面重视移动端适配，主要断点在 `920px` 和 `640px`。

## 开发注意事项

- 修改页面内容时，优先从 `app/page.tsx` 中的数组数据入手，例如 `navItems`、`stats`、`services`、`steps`、`prices`、`gallerySlides`、`reviews`。
- 调整视觉样式时，优先修改 `app/globals.css` 和 `tailwind.config.ts`，保持现有 Tailwind 组件层写法。
- 新增本地图片应放在 `public/assets/` 下，才能通过 `/assets/...` 在页面中访问。
- 使用远程图片时，需要确认域名是否已加入 `next.config.ts` 的 `images.remotePatterns`。
- 修改预约数据结构时，需要同步更新 `database/appointments.sql`、`lib/appointments.ts`、`app/api/appointments/route.ts` 和员工预约管理相关 API。
- 如果已有旧版 `public.appointments` 表，`npm run appointments:schema` 会补齐新版预约管理字段，并把旧 `note` 字段内容迁移到 `customer_note`。
- 新增预约状态、来源或时段时，需要同步更新 `lib/appointments.ts`、`database/appointments.sql`、前台表单选项和后台日历看板展示逻辑。
- 如果新增真实通知能力，例如短信、微信或邮件，需要在预约创建或状态变更后补充外部服务集成。
- 新增员工账号时，优先使用 `npm run staff:create`，不要手动写入明文密码。
- 修改员工登录数据库结构时，需要同步更新 `database/staff-users.sql` 和相关脚本。
- 修改登录安全策略时，需要同步检查 `app/api/staff/login/route.ts`、`lib/staff-session.ts` 和 `database/staff-users.sql`。
- 修改 Supabase 表结构时，需要确认敏感表仍然开启 RLS，且没有误给 `anon` 或 `authenticated` 开放 Data API 权限。
- 当前 Next 16 会提示 `middleware.ts` 文件约定已弃用，后续可以迁移到 `proxy.ts`。
