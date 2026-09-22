# 系统整体设计

本篇描述 Prompt 管理系统的整体结构、子系统划分、职责边界和第一版的关键取舍。数据表、对外接口和后台页面的细节分别见本目录另外三篇文档;产品范围与页面原型见 `docs/Prompt 管理系统产品说明书.md`。

## 系统定位

把 Prompt 从业务代码里独立出来,当成一类配置资产管理:业务系统用稳定的 Key 和 API 取到 Prompt,Prompt 的修改靠版本管理完成,每次调用都能被记录和统计。

第一版只解决三件事:统一管理 Prompt、通过 API 使用 Prompt、统计 Prompt 的使用情况。LLM 调用、效果评估、A/B Test、计费这些都不在第一版范围内。

## 技术栈与运行方式

- 应用是一个 Nuxt 4 全栈工程:页面在 `app/`,服务端接口在 `server/`,前后端共用的纯逻辑在 `shared/`,表结构在 `db/migrations`,运维脚本在 `scripts/`。
- 数据库是 PostgreSQL(当前开发环境用 Neon),连接串来自 `.env` 的 `DATABASE_URL`,服务端通过 `postgres` 驱动访问。
- 管理后台和 Prompt API 跑在同一个进程里,靠路径前缀区分:管理接口是 `/api/*`,对外接口是 `/api/v1/*`。
- 登录自己实现,不依赖外部认证服务:账号密码存在 `accounts`,密码用 scrypt 加盐哈希,会话存在 `sessions` 表并只通过 HttpOnly Cookie 传递。
- 目录职责、请求流程和隔离实现见 `04-server-architecture.md`。

## 子系统划分

```text
管理后台 (Web Console)
    │  用户登录、分类、Prompt、版本、API Key、统计
    ↓
应用服务
    ├── Prompt 管理:分类、Prompt、版本、发布
    ├── API Key 管理:创建、禁用、删除
    └── Usage 统计:调用记录与聚合
    ↓
数据层(所有业务数据按 tenant_id 隔离)
    ↑
Prompt API(业务系统按 API Key 调用)
```

四个部分的职责边界:

| 部分 | 职责 | 不负责 |
|---|---|---|
| 管理后台 | 面向人的界面,所有编辑、发布和查看操作都从这里发起 | 业务系统的自动读取,Prompt 内容渲染 |
| 应用服务 | 业务规则、权限判断、版本状态流转、调用记录 | 界面展示细节,数据存储实现 |
| Prompt API | 按 API Key 认证、解析 Tenant、返回 Prompt、记录调用 | 修改 Prompt,管理 API Key |
| 数据层 | 存储与按 Tenant 隔离查询 | 业务规则判断 |

## 核心概念与边界

- **Tenant**:数据隔离单位。一个用户可以属于多个 Tenant,租户内数据默认互不可见。
- **Category**:一级分类,只用于组织 Prompt,不承载权限含义。
- **Prompt**:管理对象本身,保存名称、唯一 Key、分类、描述、当前版本等元信息,不直接保存正文。
- **PromptVersion**:Prompt 正文的唯一存放处,一次保存产生一个版本,历史版本不被覆盖。
- **ApiKey**:访问 Prompt API 的凭证,归属某个 Tenant,决定该次请求能看到哪个 Tenant 的数据。
- **PromptUsage**:一次成功的 Prompt API 调用记录,是统计的唯一数据来源。

## 版本模型

Prompt 内容只存在于版本里,`prompts.current_version` 只作为列表和详情展示用的引用。版本有四种状态流转:

| 状态 | 含义 | 能否被 API 获取 |
|---|---|---|
| Draft | 编辑中的版本 | 否 |
| Published | 已发布版本 | 是 |
| Archived | 历史版本,不再是默认版本 | 否,除非按版本号显式指定 |

发布新版本时,原先的 Published 版本转为 Archived,保证一个 Prompt 在同一时刻只有一个默认版本。API 默认返回最新 Published 版本;需要固定版本的业务方用 `key:version` 或按版本号取指定版本,这个能力不会随发布而变化。

## 数据隔离

Tenant 是唯一的数据隔离边界。任何业务数据查询都必须带上 `tenant_id`,包括 Prompt、Category、ApiKey 和 Usage。管理后台的 Tenant 来自当前登录用户的归属,Prompt API 的 Tenant 来自 API Key,两者都不能由请求参数指定。

数据隔离要在数据访问层统一落实,不依赖每个业务函数自觉加条件。

## 角色与权限

第一版三个角色,权限判断只在管理后台生效:

| 功能 | Owner | Admin | Member |
|---|---:|---:|---:|
| 查看 Prompt | ✓ | ✓ | ✓ |
| 创建 Prompt | ✓ | ✓ | ✓ |
| 编辑 Prompt | ✓ | ✓ | ✓ |
| 删除 Prompt | ✓ | ✓ | × |
| API Key 管理 | ✓ | ✓ | × |
| 查看 Usage | ✓ | ✓ | ✓ |
| 成员管理 | ✓ | ✓ | × |
| Tenant 设置 | ✓ | × | × |

## 关键取舍

- **只做一级分类**。多级分类需要树形结构、排序和级联删除规则,第一版的数据量和场景还用不上。
- **版本不覆盖历史**。每次保存生成新版本,换来可回溯和按版本固定调用,代价是存储增长和需要处理"当前版本"的一致性。
- **API Key 只存哈希**。数据库保存 `key_prefix` 和 `key_hash`,完整 Key 只在创建成功后展示一次,泄露风险从"读取数据库"降到"用户自己保管"。
- **调用统计的口径是成功返回**。API 成功返回 Prompt 才记一次调用,失败的调用单独记录状态,不计入调用次数。
- **第一版不调用大模型**。Prompt 测试只做变量替换预览,用于确认模板和变量是否正确,避免把模型调用、计费和评测混进第一版。
- **自己实现登录**。说明书里提到如果用 Supabase 可以直接用它的 Auth;当前只拿到一个 PostgreSQL 连接,所以多加了 `accounts` 和 `sessions` 两张表自己管登录,把认证依赖收在服务端内部。

第一版明确不做的部分:LLM 调用、Prompt 自动优化、Prompt 评分、A/B Test、多模型对比、Token 成本统计、Trace、Agent、Prompt Marketplace、公共 Prompt、多级分类、团队复杂权限、Billing、Webhook。

## 修改历史

- 2026-09-22 落地第一版实现:确定 Nuxt 4 + PostgreSQL 技术栈,补充自己实现登录的取舍,说明管理接口与对外接口的路径划分。
- 2026-09-22 首次创建,记录第一版的整体设计。
