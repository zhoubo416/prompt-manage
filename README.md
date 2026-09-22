# Prompt 管理系统

把 Prompt 从业务代码里独立出来,当成一类配置资产管理:业务系统用稳定的 Key 和 API 取到 Prompt,Prompt 的修改靠版本管理完成,每次调用都能被记录和统计。

第一版只解决三件事:统一管理 Prompt、通过 API 使用 Prompt、统计 Prompt 的使用情况。

## 功能

管理后台:

- 分类管理:创建、改名、调序、删除;分类下还有 Prompt 时,必须先选择迁移到哪个分类
- Prompt 管理:新建、编辑、删除,按分类筛选,按名称或 Key 搜索
- 版本管理:Draft、Published、Archived 三种状态,保存生成草稿,发布才对外提供,历史版本不被覆盖
- 变量:从正文的 `{{占位符}}` 自动识别,可补充是否必填和说明,第一版只支持 Text 类型
- 模板预览:填入样例值检查变量替换结果,不调用大模型
- API Key:创建、禁用、删除;系统只保存前缀和哈希,完整 Key 只在创建时展示一次
- 统计:今日、本周、本月、总调用量,以及 Prompt 调用排行
- 登录与租户:一个账号可以属于多个租户,数据按租户隔离,角色分 Owner、Admin、Member

对外接口:

- `GET /api/v1/prompts/{key}` 取最新发布版本
- `GET /api/v1/prompts/{key}/versions/{version}` 取指定版本,包含已归档的历史版本

第一版不做:LLM 调用、Prompt 自动优化与评分、A/B Test、多模型对比、Token 成本统计、Trace、Agent、公共 Prompt、多级分类、Billing、Webhook。

## 技术栈

- Nuxt 4(Vue 3 + Nitro)全栈应用,页面和服务端接口在同一个工程里
- Tailwind CSS v4
- PostgreSQL,服务端用 `postgres` 驱动访问,连接串来自 `.env` 的 `DATABASE_URL`
- 登录自己实现:密码用 scrypt 加盐哈希,会话存在 `sessions` 表,通过 HttpOnly Cookie 传递
- 包管理用 pnpm 11,测试用 Vitest

## 快速开始

需要 Node 20 以上、pnpm 11,以及一个可用的 PostgreSQL 数据库。

```bash
# 1. 准备环境变量,填上自己的数据库连接串
cp .env.example .env

# 2. 安装依赖
pnpm install

# 3. 建表和灌演示数据
pnpm db:migrate
pnpm db:seed

# 4. 启动开发服务
pnpm dev
```

打开 http://localhost:3000 ,用演示账号登录:`demo@example.com` / `demo1234`。`db:seed` 会顺便创建一把演示 API Key,完整 Key 只在命令输出里出现一次。

## 调用对外接口

```bash
curl http://localhost:3000/api/v1/prompts/customer-analysis \
  -H "Authorization: Bearer pk_live_xxxxx"
```

```json
{
  "key": "customer-analysis",
  "name": "客户信息分析",
  "version": 3,
  "template": "你是一名专业的客户分析助手……",
  "variables": [
    { "name": "customer_info", "type": "text", "required": true }
  ]
}
```

API Key 决定这次请求能看到哪个租户的数据,返回的正文保留 `{{变量}}` 占位,由业务系统自己替换。认证失败返回 401,找不到可用版本返回 404,这两种情况都不计入调用次数。

## 页面

| 路由 | 页面 |
|---|---|
| `/login` | 登录与注册 |
| `/prompts` | Prompt 列表,首页默认跳到这里 |
| `/prompts/new` | 新建 Prompt |
| `/prompts/[id]` | 详情、版本历史、调用次数 |
| `/prompts/[id]/edit` | 编辑,保存草稿或发布 |
| `/categories` | 分类管理 |
| `/api-keys` | API Key 管理 |
| `/analytics` | Usage 统计 |

## 目录结构

```text
app/          页面、布局、组件、前端工具
server/api/   管理接口(/api/*)
server/api/v1/  对外 Prompt API
server/utils/ 数据库、会话、密码、API Key、参数校验
shared/       前后端共用的纯函数:变量识别与替换、输入规范化
db/migrations/  建表和索引的 SQL
scripts/      迁移、演示数据、端到端冒烟
tests/        单元测试
docs/         产品说明书、设计文档、Memory
```

## 常用命令

| 命令 | 作用 |
|---|---|
| `pnpm dev` | 启动开发服务 |
| `pnpm build` | 生产构建 |
| `pnpm preview` | 预览构建产物 |
| `pnpm typecheck` | 类型检查 |
| `pnpm test` | 单元测试 |
| `pnpm smoke` | 端到端冒烟,需要先启动服务 |
| `pnpm db:migrate` | 执行未执行过的迁移 |
| `pnpm db:seed` | 灌入演示数据,已存在则跳过 |

`pnpm smoke` 会登录演示账号,自己建分类、Prompt 和 API Key,跑完再删掉,不在库里留测试数据。

## 文档

- [AGENTS.md](./AGENTS.md) — 开发规则、Memory 和设计文档的入口,提交代码前先看
- [docs/Prompt 管理系统产品说明书.md](./docs/Prompt%20管理系统产品说明书.md) — 产品范围、页面原型和第一版边界
- [docs/design](./docs/design/README.md) — 系统结构、数据模型、对外 API、管理后台、服务端结构
- [docs/memory](./docs/memory/README.md) — 提交规范、依赖管理流程、本机运行与验证
